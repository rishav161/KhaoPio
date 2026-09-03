import prisma from '../prisma';
import { OrderStatus, Prisma } from '@prisma/client';

export class DashboardService {
  /**
   * Generates mock orders spanning the last 7 days if the store has no orders.
   */
  async seedMockOrdersIfEmpty(restaurantId: string) {
    // Seeding feature disabled: new signups will start with empty dashboards and reports.
    return;
  }

  /**
   * Compiles dashboard statistics for a specific restaurant.
   */
  async getDashboardStats(params: {
    restaurantId: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { restaurantId, startDate, endDate, page = 1, limit = 5 } = params;
    // Ensure mock orders exist for initial display
    await this.seedMockOrdersIfEmpty(restaurantId);

    // Build common filters
    const filterClause: any = {
      restaurantId,
    };

    if (startDate || endDate) {
      filterClause.createdAt = {};
      if (startDate) {
        filterClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filterClause.createdAt.lte = end;
      }
    }

    // Paid order totals, summed by PostgreSQL rather than by streaming every
    // matching row into Node and reducing it here.
    const paidAggregate = await prisma.order.aggregate({
      where: {
        ...filterClause,
        status: OrderStatus.PAID,
      },
      _sum: { grandTotal: true },
      _count: { _all: true },
    });

    const totalSales = paidAggregate._sum.grandTotal ?? 0;
    const ordersCount = paidAggregate._count._all;
    const aov = ordersCount > 0 ? parseFloat((totalSales / ordersCount).toFixed(2)) : 0;

    // Active orders count matching filters
    const activeOrdersCount = await prisma.order.count({
      where: {
        ...filterClause,
        status: {
          in: [
            OrderStatus.KITCHEN_PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.BILL_REQUESTED,
          ],
        },
      },
    });

    // Recent orders (paginated) matching filters
    const skip = (page - 1) * limit;
    const recentOrdersCount = await prisma.order.count({
      where: filterClause,
    });

    const recentOrdersRaw = await prisma.order.findMany({
      where: filterClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        waiter: { select: { name: true } },
        payments: { select: { paymentMethod: true } },
      },
    });

    const recentOrders = recentOrdersRaw.map(o => {
      const methods = o.payments?.map(p => p.paymentMethod) || [];
      const paymentMethodStr = methods.length > 0 ? methods.join(', ') : 'PENDING';
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        grandTotal: o.grandTotal,
        status: o.status,
        paymentMethod: paymentMethodStr,
        waiterName: o.waiter.name,
        createdAt: o.createdAt,
      };
    });

    // Dynamic Sales Trend based on date range (defaults to last 7 days)
    let daysDiff = 7;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 30) daysDiff = 30; // Cap at 30 days
    }

    const salesTrend: { date: string; amount: number; count: number }[] = [];
    for (let i = daysDiff - 1; i >= 0; i--) {
      const d = end ? new Date(end) : new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesTrend.push({ date: dateStr, amount: 0, count: 0 });
    }

    // Only rows inside the rendered window can land in a bucket, so scope the
    // read to that window instead of reading every paid order ever recorded.
    const trendFrom = new Date(`${salesTrend[0].date}T00:00:00.000Z`);
    const trendTo = new Date(`${salesTrend[salesTrend.length - 1].date}T23:59:59.999Z`);

    const trendOrders = await prisma.order.findMany({
      where: {
        ...filterClause,
        status: OrderStatus.PAID,
        createdAt: { gte: trendFrom, lte: trendTo },
      },
      select: { grandTotal: true, createdAt: true },
    });

    const trendByDate = new Map(salesTrend.map(entry => [entry.date, entry]));
    trendOrders.forEach(o => {
      const entry = trendByDate.get(o.createdAt.toISOString().split('T')[0]);
      if (entry) {
        entry.amount = parseFloat((entry.amount + o.grandTotal).toFixed(2));
        entry.count += 1;
      }
    });

    // Top Selling Items matching filters
    const itemsGroup = await prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      where: {
        order: {
          ...filterClause,
          status: OrderStatus.PAID,
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const topItems = itemsGroup.map(g => ({
      name: g.name,
      quantity: g._sum.quantity || 0,
    }));

    // Payment method breakdown (paid orders only)
    const paymentsRaw = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        order: {
          ...filterClause,
          status: OrderStatus.PAID,
        },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const paymentBreakdown = paymentsRaw.map(p => ({
      method: p.paymentMethod,
      amount: parseFloat((p._sum.amount || 0).toFixed(2)),
      count: p._count.id,
    }));

    // Hourly order distribution (paid orders, bucketed 0–23).
    //
    // Grouped by PostgreSQL so the whole result is 24 rows, rather than the
    // second full read of every paid order this used to perform. Buckets are
    // UTC, which matches the UTC dates used by salesTrend above; the previous
    // implementation used the API server's local timezone here, so this chart
    // silently disagreed with the trend chart on any non-UTC host.
    const hourlyRaw = await prisma.$queryRaw<{ hour: number; count: number }[]>(Prisma.sql`
      SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC')::int AS hour,
             COUNT(*)::int AS count
      FROM "Order"
      WHERE "restaurantId" = ${restaurantId}
        AND "status" = ${OrderStatus.PAID}::"OrderStatus"
        ${startDate ? Prisma.sql`AND "createdAt" >= ${filterClause.createdAt.gte}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND "createdAt" <= ${filterClause.createdAt.lte}` : Prisma.empty}
      GROUP BY 1
    `);

    const hourlyCounts = new Map(hourlyRaw.map(r => [Number(r.hour), Number(r.count)]));
    const hourlyOrders = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyCounts.get(hour) ?? 0,
    }));

    return {
      metrics: {
        totalSales: parseFloat(totalSales.toFixed(2)),
        ordersCount,
        aov,
        activeOrdersCount,
      },
      salesTrend,
      topItems,
      paymentBreakdown,
      hourlyOrders,
      recentOrders,
      pagination: {
        total: recentOrdersCount,
        page,
        limit,
        totalPages: Math.ceil(recentOrdersCount / limit) || 1,
      },
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
