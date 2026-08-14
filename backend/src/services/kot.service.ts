import prisma from '../prisma';
import { Kot, KotStatus } from '../types';

export class KotService {
  async getActiveKots(restaurantId?: string): Promise<Kot[]> {
    const whereClause: any = {
      status: {
        in: ['PENDING', 'PREPARING']
      }
    };

    if (restaurantId) {
      whereClause.order = {
        restaurantId
      };
    }

    const kots = await prisma.kot.findMany({
      where: whereClause,
      include: {
        items: true,
        order: {
          include: {
            table: true,
            waiter: {
              include: {
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return kots as unknown as Kot[];
  }

  async updateKotStatus(kotId: string, status: KotStatus): Promise<Kot> {
    const updatedKot = await prisma.kot.update({
      where: { id: kotId },
      data: { status },
      include: {
        items: true,
        order: {
          include: {
            kots: true
          }
        }
      }
    });

    const order = updatedKot.order;
    if (order) {
      let newOrderStatus = order.status;

      if (status === 'PREPARING') {
        if (order.status === 'KITCHEN_PENDING') {
          newOrderStatus = 'PREPARING';
        }
      } else if (status === 'READY') {
        // Check if all non-cancelled KOTs for this order are READY
        const otherKots = order.kots.filter(k => k.id !== kotId && k.status !== 'CANCELLED');
        const allReady = otherKots.every(k => k.status === 'READY');
        if (allReady) {
          newOrderStatus = 'READY';
        } else {
          newOrderStatus = 'PREPARING';
        }
      }

      if (newOrderStatus !== order.status) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: newOrderStatus }
        });
      }
    }

    return updatedKot as unknown as Kot;
  }
}

export const kotService = new KotService();
export default kotService;
