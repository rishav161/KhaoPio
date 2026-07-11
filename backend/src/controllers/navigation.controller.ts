import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../prisma';

/**
 * Controller to fetch dynamic navigation menu filtered by user permissions.
 */
export const getNavigation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized. User context missing.' });
      return;
    }

    // Fetch root sidebar items (parentId is null) and include nested subItems
    const rootItems = await prisma.sidebarItem.findMany({
      where: { parentId: null },
      include: {
        permission: true,
        subItems: {
          include: {
            permission: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    const userPermissions = user.permissions;

    // Filter items according to permissions
    const filteredMenu = rootItems
      .filter((item) => {
        // If sidebar item requires permission, check if user has it
        if (item.permission && !userPermissions.includes(item.permission.name)) {
          return false;
        }
        return true;
      })
      .map((item) => {
        // Filter sub-items
        const allowedSubItems = item.subItems.filter((sub) => {
          if (sub.permission && !userPermissions.includes(sub.permission.name)) {
            return false;
          }
          return true;
        });

        return {
          id: item.id,
          label: item.label,
          icon: item.icon,
          path: item.path,
          order: item.order,
          subItems: allowedSubItems.map((sub) => ({
            id: sub.id,
            label: sub.label,
            icon: sub.icon,
            path: sub.path,
            order: sub.order,
          })),
        };
      });

    res.status(200).json(filteredMenu);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
