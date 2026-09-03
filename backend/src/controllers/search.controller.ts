import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../prisma';

export const searchGlobal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized user context' });
      return;
    }

    if (!query) {
      res.json({
        menuItems: [],
        orders: [],
        tables: [],
        staff: []
      });
      return;
    }

    const restaurantId = user.restaurantId;
    if (!restaurantId) {
      res.json({
        menuItems: [],
        orders: [],
        tables: [],
        staff: []
      });
      return;
    }

    const parsedOrderNum = parseInt(query.replace('#', ''), 10);
    const hasOrderNum = !isNaN(parsedOrderNum);

    const canViewStaff = user.permissions?.includes('manage:staff') ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'STORE_MANAGER';

    // Parallel execution for search queries across domains
    const [menuItems, orders, tables, staff] = await Promise.all([
      // 1. Menu Items search
      prisma.menuItem.findMany({
        where: {
          restaurantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { name: { contains: query, mode: 'insensitive' } } }
          ]
        },
        include: {
          category: {
            select: { id: true, name: true }
          }
        },
        take: 6
      }),

      // 2. Orders search
      prisma.order.findMany({
        where: {
          restaurantId,
          OR: [
            ...(hasOrderNum ? [{ orderNumber: parsedOrderNum }] : []),
            { waiter: { name: { contains: query, mode: 'insensitive' } } },
            { table: { name: { contains: query, mode: 'insensitive' } } },
            { couponCode: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          waiter: { select: { id: true, name: true } },
          table: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),

      // 3. Tables search
      prisma.diningTable.findMany({
        where: {
          restaurantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 6
      }),

      // 4. Staff members (RBAC restricted)
      canViewStaff
        ? prisma.user.findMany({
            where: {
              restaurantId,
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
              ]
            },
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              role: { select: { name: true } }
            },
            take: 6
          })
        : Promise.resolve([])
    ]);

    res.json({
      menuItems,
      orders,
      tables,
      staff
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Internal server error while searching.' });
  }
};
