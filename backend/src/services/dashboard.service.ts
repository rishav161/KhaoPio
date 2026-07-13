import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';

export class DashboardService {
  /**
   * Generates mock orders spanning the last 7 days if the store has no orders.
   */
  async seedMockOrdersIfEmpty(restaurantId: string) {
    const count = await prisma.order.count({ where: { restaurantId } });
    if (count > 0) return;

    // Find any user associated with this restaurant
    const waiter = await prisma.user.findFirst({ where: { restaurantId } });
    if (!waiter) return;

    // Find menu items
    const menuItems = await prisma.menuItem.findMany({ where: { restaurantId } });
    if (menuItems.length === 0) return;

    const paymentMethods = ['CASH', 'CARD', 'UPI'];
    const statuses = [OrderStatus.PAID, OrderStatus.PAID, OrderStatus.PAID, OrderStatus.READY, OrderStatus.CANCELLED];

    // Create 30 random historical orders
    for (let i = 0; i < 30; i++) {
      const daysAgo = Math.floor(Math.random() * 8); // 0 to 7 days ago
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      // stagger hours
      createdAt.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60));

      const numItems = Math.floor(Math.random() * 3) + 1;
      const orderItems: { menuItemId: string; name: string; quantity: number; price: number }[] = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const item = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        
        // Ensure no duplicate items within the same order
        if (orderItems.some(oi => oi.menuItemId === item.id)) continue;

        orderItems.push({
          menuItemId: item.id,
          name: item.name,
          quantity: qty,
          price: item.price,
        });
        subtotal += item.price * qty;
      }

      if (orderItems.length === 0) continue;

      const taxTotal = parseFloat((subtotal * 0.05).toFixed(2));
      const grandTotal = parseFloat((subtotal + taxTotal).toFixed(2));
      const payMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      await prisma.order.create({
        data: {
          subtotal,
          taxTotal,
          grandTotal,
          status,
          restaurantId,
          waiterId: waiter.id,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: orderItems,
          },
          payments: status === OrderStatus.PAID ? {
            create: {
              amount: grandTotal,
              paymentMethod: payMethod as any,
              cashierId: waiter.id,
              createdAt,
            }
          } : undefined,
        },
      });
    }
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
