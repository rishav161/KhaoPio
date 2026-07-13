import prisma from '../prisma';
import { Order, OrderStatus, CreateOrderPayload } from '../types';

export class OrderService {
  /**
   * Generates a new order, calculates subtotal, taxTotal, and grandTotal,
   * inserts the order and its items into the database associated with the waiterId,
   * and returns the order.
   */
  async createKitchenOrder(waiterId: string, payload: CreateOrderPayload): Promise<Order> {
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Fetch waiter's restaurantId and its default rates
    const waiter = await prisma.user.findUnique({
      where: { id: waiterId },
      select: {
        restaurantId: true,
        restaurant: {
          select: {
            defaultTaxRate: true,
            defaultServiceCharge: true,
          }
        }
      }
    });

    const taxRate = waiter?.restaurant?.defaultTaxRate ?? 5.0;
    const serviceChargeRate = waiter?.restaurant?.defaultServiceCharge ?? 5.0;

    const taxTotal = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const serviceChargeTotal = Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + taxTotal + serviceChargeTotal) * 100) / 100;

    const newOrder = await prisma.order.create({
      data: {
        status: 'KITCHEN_PENDING',
        subtotal,
        taxRate,
        taxTotal,
        serviceChargeRate,
        serviceChargeTotal,
        discountTotal: 0.0,
        grandTotal,
        waiterId,
        restaurantId: waiter?.restaurantId,
        items: {
          create: payload.items.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        items: true,
        payments: true
      }
    });

    return newOrder as unknown as Order;
  }

  /**
   * Returns active orders, optionally including completed/paid orders within a date window, scoped to the restaurant context.
   */
  async getActiveOrders(restaurantId?: string, includePaid = false, paidDays = 'today'): Promise<Order[]> {
    const whereClause: any = {};
    
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    if (includePaid) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let dateFilter: Date | null = todayStart;

      if (paidDays === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        dateFilter = yesterday;
      } else if (paidDays === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        dateFilter = sevenDaysAgo;
      } else if (paidDays === 'all') {
        dateFilter = null; // No date filter
      }

      whereClause.OR = [
        {
          status: {
            notIn: ['PAID', 'CANCELLED']
          }
        },
        {
          status: 'PAID',
          ...(dateFilter ? {
            updatedAt: {
              gte: dateFilter
            }
          } : {})
        }
      ];
    } else {
      whereClause.status = {
        notIn: ['PAID', 'CANCELLED']
      };
    }

    const activeOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        payments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return activeOrders as unknown as Order[];
  }

  /**
   * Finds the order by ID and updates its status. Throws an error if not found.
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: true,
          payments: true
        }
      });
      return updatedOrder as unknown as Order;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      throw error;
    }
  }

  /**
   * Recalculates order totals with optional discounts/coupons and records split payments.
   */
  async processPayment(
    orderId: string,
    cashierId: string,
    payload: {
      couponCode?: string;
      manualDiscount?: number;
      payments?: { paymentMethod: 'CASH' | 'CARD' | 'UPI'; amount: number; transactionReference?: string }[];
    }
  ): Promise<Order> {
    try {
      // 1. Fetch existing order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true
        }
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      let discountTotal = payload.manualDiscount || 0;
      let couponId: string | null = null;
      let couponCodeSnapshot: string | null = null;

      // 2. Validate and apply coupon if provided
      if (payload.couponCode) {
        const coupon = await prisma.coupon.findFirst({
          where: {
            code: { equals: payload.couponCode.trim(), mode: 'insensitive' },
            restaurantId: order.restaurantId || undefined,
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        });

        if (!coupon) {
          throw new Error(`Coupon "${payload.couponCode}" is invalid or expired.`);
        }

        if (order.subtotal < coupon.minSubtotal) {
          throw new Error(`Order subtotal (${order.subtotal}) does not meet the minimum subtotal (${coupon.minSubtotal}) for coupon.`);
        }

        let couponDiscount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = order.subtotal * (coupon.discountValue / 100);
          if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        } else {
          couponDiscount = coupon.discountValue;
        }

        discountTotal += couponDiscount;
        couponId = coupon.id;
        couponCodeSnapshot = coupon.code;
      }

      // Cap discountTotal to subtotal
      if (discountTotal > order.subtotal) {
        discountTotal = order.subtotal;
      }

      // 3. Recalculate totals
      const taxableAmount = order.subtotal - discountTotal;
      const serviceChargeTotal = Math.round(taxableAmount * (order.serviceChargeRate / 100) * 100) / 100;
      const taxTotal = Math.round(taxableAmount * (order.taxRate / 100) * 100) / 100;
      const grandTotal = Math.round((taxableAmount + serviceChargeTotal + taxTotal) * 100) / 100;

      // 4. Record new payments and determine new status
      const totalPaidBefore = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const newPaymentsAmount = payload.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalPaidAfter = totalPaidBefore + newPaymentsAmount;

      let newStatus: OrderStatus = order.status;
      if (totalPaidAfter >= grandTotal) {
        newStatus = 'PAID';
      } else if (totalPaidAfter > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      // 5. Update database in a transactional way
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          discountTotal,
          couponId,
          couponCode: couponCodeSnapshot,
          serviceChargeTotal,
          taxTotal,
          grandTotal,
          status: newStatus,
          payments: payload.payments && payload.payments.length > 0 ? {
            create: payload.payments.map(p => ({
              amount: p.amount,
              paymentMethod: p.paymentMethod,
              transactionReference: p.transactionReference,
              cashierId
            }))
          } : undefined
        },
        include: {
          items: true,
          payments: true
        }
      });

      return updatedOrder as unknown as Order;
    } catch (error: any) {
      throw error;
    }
  }
}

export const orderService = new OrderService();
export default orderService;
