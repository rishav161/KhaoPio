import prisma from '../prisma';
import { OrderStatus } from '@prisma/client';
import dashboardService from './dashboard.service';

interface SalesReportQuery {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export class ReportsService {
  /**
   * Retrieves transaction lists and summaries scoped to date/payment filters.
   */
  async getSalesReport(query: SalesReportQuery) {
    const { restaurantId, startDate, endDate, paymentMethod, page = 1, limit = 10 } = query;

    // Make sure mock orders are present if database is empty
    await dashboardService.seedMockOrdersIfEmpty(restaurantId);

    // Build query filters
    const whereClause: any = {
      restaurantId,
    };

    // Filter by date range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Extend endDate to the very end of the day (23:59:59)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'ALL') {
      whereClause.paymentMethod = paymentMethod;
      whereClause.status = OrderStatus.PAID;
    }

    // Calculate overall summaries for filtered records
    const allMatchingOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        grandTotal: true,
        taxTotal: true,
        status: true,
      },
    });

    const totalRevenue = allMatchingOrders
      .filter(o => o.status === OrderStatus.PAID)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const totalTax = allMatchingOrders
      .filter(o => o.status === OrderStatus.PAID)
      .reduce((sum, o) => sum + o.taxTotal, 0);

    const totalOrders = allMatchingOrders.length;

    // Paginated fetch
    const skip = (page - 1) * limit;
    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        waiter: { select: { name: true } },
        cashier: { select: { name: true } },
        items: true,
      },
    });

    const totalCount = await prisma.order.count({ where: whereClause });

    return {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalOrders,
      },
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        grandTotal: o.grandTotal,
        taxTotal: o.taxTotal,
        subtotal: o.subtotal,
        status: o.status,
        paymentMethod: o.paymentMethod || 'N/A',
        waiterName: o.waiter.name,
        cashierName: o.cashier?.name || 'N/A',
        createdAt: o.createdAt,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        itemsSummary: o.items.map(item => `${item.name} (${item.quantity}x)`).join(', '),
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;
