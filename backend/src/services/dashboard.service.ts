import prisma from '../prisma';
import { OrderStatus, Prisma } from '@prisma/client';

export class DashboardService {
  async getDashboardStats(params: {
    restaurantId: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { restaurantId, startDate, endDate, page = 1, limit = 5 } = params;

    const filterClause: any = { restaurantId };

    if (startDate || endDate) {
      filterClause.createdAt = {};
      if (startDate) filterClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filterClause.createdAt.lte = end;
      }
    }

    // Build sales trend date range before firing queries
    let daysDiff = 7;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysDiff = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 30);
    }

    const salesTrend: { date: string; amount: number; count: number }[] = [];
    for (let i = daysDiff - 1; i >= 0; i--) {
      const d = end ? new Date(end) : new Date();
      d.setDate(d.getDate() - i);
      salesTrend.push({ date: d.toISOString().split('T')[0], amount: 0, count: 0 });
    }

    const trendFrom = new Date(`${salesTrend[0].date}T00:00:00.000Z`);
    const trendTo = new Date(`${salesTrend[salesTrend.length - 1].date}T23:59:59.999Z`);
    const skip = (page - 1) * limit;

    // All 8 queries are independent — run them in parallel
    const [
      paidAggregate,
      activeOrdersCount,
      recentOrdersCount,
      recentOrdersRaw,
      trendOrders,
      itemsGroup,
      paymentsRaw,
      hourlyRaw,
    ] = await Promise.all([
      // 1. Paid order totals
      prisma.order.aggregate({
        where: { ...filterClause, status: OrderStatus.PAID },
        _sum: { grandTotal: true },
        _count: { _all: true },
      }),

      // 2. Active orders count
      prisma.order.count({
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
      }),

      // 3. Total orders count for pagination
      prisma.order.count({ where: filterClause }),

      // 4. Recent orders (paginated)
      prisma.order.findMany({
        where: filterClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          waiter: { select: { name: true } },
          payments: { select: { paymentMethod: true } },
        },
      }),

      // 5. Sales trend orders (only fields needed for bucketing)
      prisma.order.findMany({
        where: {
          ...filterClause,
          status: OrderStatus.PAID,
          createdAt: { gte: trendFrom, lte: trendTo },
        },
        select: { grandTotal: true, createdAt: true },
      }),

      // 6. Top selling items
      prisma.orderItem.groupBy({
        by: ['menuItemId', 'name'],
        where: { order: { ...filterClause, status: OrderStatus.PAID } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // 7. Payment method breakdown
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: { order: { ...filterClause, status: OrderStatus.PAID } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 8. Hourly order distribution (24 rows via SQL GROUP BY)
      prisma.$queryRaw<{ hour: number; count: number }[]>(Prisma.sql`
        SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC')::int AS hour,
               COUNT(*)::int AS count
        FROM "Order"
        WHERE "restaurantId" = ${restaurantId}
          AND "status" = ${OrderStatus.PAID}::"OrderStatus"
          ${startDate ? Prisma.sql`AND "createdAt" >= ${filterClause.createdAt.gte}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND "createdAt" <= ${filterClause.createdAt.lte}` : Prisma.empty}
        GROUP BY 1
      `),
    ]);

    // Derive metrics from aggregate
    const totalSales = paidAggregate._sum.grandTotal ?? 0;
    const ordersCount = paidAggregate._count._all;
    const aov = ordersCount > 0 ? parseFloat((totalSales / ordersCount).toFixed(2)) : 0;

    // Shape recent orders
    const recentOrders = recentOrdersRaw.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      grandTotal: o.grandTotal,
      status: o.status,
      paymentMethod: o.payments?.length > 0 ? o.payments.map(p => p.paymentMethod).join(', ') : 'PENDING',
      waiterName: o.waiter.name,
      createdAt: o.createdAt,
    }));

    // Bucket trend orders by date
    const trendByDate = new Map(salesTrend.map(entry => [entry.date, entry]));
    trendOrders.forEach(o => {
      const entry = trendByDate.get(o.createdAt.toISOString().split('T')[0]);
      if (entry) {
        entry.amount = parseFloat((entry.amount + o.grandTotal).toFixed(2));
        entry.count += 1;
      }
    });

    const topItems = itemsGroup.map(g => ({ name: g.name, quantity: g._sum.quantity || 0 }));

    const paymentBreakdown = paymentsRaw.map(p => ({
      method: p.paymentMethod,
      amount: parseFloat((p._sum.amount || 0).toFixed(2)),
      count: p._count.id,
    }));

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
