import prisma from '../prisma';
import { OrderStatus, OrderItemStatus } from '@prisma/client';

/** How many slots the quick-add rail holds in total (pinned + auto-ranked). */
const RAIL_SIZE = 12;

/** How far back order history is considered when ranking. */
const RANKING_WINDOW_DAYS = 30;

export interface FavouriteItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  code: string;
  categoryName: string;
  /** True when a manager pinned it, false when it was ranked from order history. */
  pinned: boolean;
}

export class FavouritesService {
  /**
   * The quick-add rail: pinned items first (in their configured order), then
   * the most-ordered items filling whatever slots remain.
   *
   * Only pins are stored. The ranked half is computed here, so it cannot go
   * stale and no background job has to maintain it.
   */
  async getFavourites(restaurantId: string): Promise<FavouriteItem[]> {
    // Availability is resolved up front and used to constrain the ranking
    // query itself. Filtering afterwards would let out-of-stock items consume
    // slots and hand back a short list.
    const availableItems = await prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        code: true,
        category: { select: { name: true } },
      },
    });

    if (availableItems.length === 0) return [];

    const byId = new Map(availableItems.map((item) => [item.id, item]));
    const availableIds = availableItems.map((item) => item.id);

    const toFavourite = (id: string, pinned: boolean): FavouriteItem | null => {
      const item = byId.get(id);
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        code: item.code,
        categoryName: item.category.name,
        pinned,
      };
    };

    // 1. Pins, in the order a manager arranged them.
    const pinRows = await prisma.favouriteMenuItem.findMany({
      where: { restaurantId, menuItemId: { in: availableIds } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { menuItemId: true },
    });

    const pinned = pinRows
      .map((row) => toFavourite(row.menuItemId, true))
      .filter((item): item is FavouriteItem => item !== null);

    const remaining = RAIL_SIZE - pinned.length;
    if (remaining <= 0) return pinned.slice(0, RAIL_SIZE);

    // 2. Fill the rest from what actually gets ordered.
    const since = new Date(Date.now() - RANKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const pinnedIds = pinned.map((item) => item.id);

    const ranked = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        // Soft-cancelled lines must not count, or one mis-punched order keeps
        // a dish on the rail for the whole window.
        status: OrderItemStatus.ACTIVE,
        menuItemId: { in: availableIds, notIn: pinnedIds },
        order: {
          restaurantId,
          // Deliberately not restricted to PAID the way the dashboard is:
          // food still in the kitchen was ordered just the same.
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: since },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: remaining,
    });

    const frequent = ranked
      .map((row) => toFavourite(row.menuItemId, false))
      .filter((item): item is FavouriteItem => item !== null);

    return [...pinned, ...frequent];
  }

  /** Pins an item, placing it after any existing pins. */
  async addFavourite(restaurantId: string, menuItemId: string): Promise<void> {
    // Guards against pinning another tenant's item into this restaurant's rail.
    const item = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
      select: { id: true },
    });
    if (!item) throw new Error('Menu item not found for this restaurant.');

    const last = await prisma.favouriteMenuItem.findFirst({
      where: { restaurantId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    await prisma.favouriteMenuItem.upsert({
      where: { restaurantId_menuItemId: { restaurantId, menuItemId } },
      update: {},
      create: { restaurantId, menuItemId, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }

  /** Unpins an item. The item may still appear on the rail if it ranks highly. */
  async removeFavourite(restaurantId: string, menuItemId: string): Promise<void> {
    await prisma.favouriteMenuItem.deleteMany({ where: { restaurantId, menuItemId } });
  }

  /** The pinned ids only — used by the menu screen to render its star toggles. */
  async getPinnedIds(restaurantId: string): Promise<string[]> {
    const rows = await prisma.favouriteMenuItem.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { menuItemId: true },
    });
    return rows.map((row) => row.menuItemId);
  }
}

export const favouritesService = new FavouritesService();
export default favouritesService;
