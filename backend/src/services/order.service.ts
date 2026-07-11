import prisma from '../prisma';
import { Order, OrderStatus, CreateOrderPayload } from '../types';

export class OrderService {
  /**
   * Generates a new order, calculates subtotal, taxTotal (10%), and grandTotal,
   * inserts the order and its items into the database associated with the waiterId,
   * and returns the order.
   */
  async createKitchenOrder(waiterId: string, payload: CreateOrderPayload): Promise<Order> {
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxTotal = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax rate, rounded to 2 decimal places
    const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

    // Fetch waiter's restaurantId to link the order context
    const waiter = await prisma.user.findUnique({
      where: { id: waiterId },
      select: { restaurantId: true }
    });

    const newOrder = await prisma.order.create({
      data: {
        status: 'KITCHEN_PENDING',
        subtotal,
        taxTotal,
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
        items: true
      }
    });

    return newOrder as unknown as Order;
  }

  /**
   * Returns active orders, optionally including today's completed/paid orders, scoped to the restaurant context.
   */
  async getActiveOrders(restaurantId?: string, includePaid = false): Promise<Order[]> {
    const whereClause: any = {};
    
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    if (includePaid) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      whereClause.OR = [
        {
          status: {
            notIn: ['PAID', 'CANCELLED']
          }
        },
        {
          status: 'PAID',
          createdAt: {
            gte: todayStart
          }
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
        items: true
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
          items: true
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
   * Updates the order status to 'PAID', sets the payment method, cashierId, and returns receipt data.
   */
  async processPayment(orderId: string, paymentMethod: string, cashierId: string): Promise<Order> {
    try {
      const paidOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentMethod: paymentMethod,
          cashierId: cashierId
        },
        include: {
          items: true
        }
      });
      return paidOrder as unknown as Order;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      throw error;
    }
  }
}

export const orderService = new OrderService();
export default orderService;
