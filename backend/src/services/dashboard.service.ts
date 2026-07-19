import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';

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

    // Paid orders stats matching filters
    const paidOrders = await prisma.order.findMany({
      where: {
        ...filterClause,
        status: OrderStatus.PAID,
      },
      select: {
        grandTotal: true,
        createdAt: true,
      },
    });

    const totalSales = paidOrders.reduce((sum, order) => sum + order.grandTotal, 0);
    const ordersCount = paidOrders.length;
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

    paidOrders.forEach(o => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      const entry = salesTrend.find(s => s.date === dateStr);
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

    return {
      metrics: {
        totalSales: parseFloat(totalSales.toFixed(2)),
        ordersCount,
        aov,
        activeOrdersCount,
      },
      salesTrend,
      topItems,
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
