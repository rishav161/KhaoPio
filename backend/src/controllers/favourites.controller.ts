import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import favouritesService from '../services/favourites.service';

export const getFavourites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    const [items, pinnedIds] = await Promise.all([
      favouritesService.getFavourites(restaurantId),
      favouritesService.getPinnedIds(restaurantId),
    ]);
    res.status(200).json({ items, pinnedIds });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching favourites.' });
  }
};

export const addFavourite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    const { menuItemId } = req.body ?? {};
    if (!menuItemId || typeof menuItemId !== 'string') {
      res.status(400).json({ error: 'menuItemId is required.' });
      return;
    }
    await favouritesService.addFavourite(restaurantId, menuItemId);
    res.status(201).json({ message: 'Item pinned to favourites.' });
  } catch (error: any) {
    const notFound = /not found/i.test(error?.message || '');
    res.status(notFound ? 404 : 500).json({ error: error.message || 'Error pinning item.' });
  }
};

export const removeFavourite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    await favouritesService.removeFavourite(restaurantId, req.params.menuItemId);
    res.status(200).json({ message: 'Item unpinned from favourites.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error unpinning item.' });
  }
};
