import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import menuService from '../services/menu.service';

export const getMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    const menu = await menuService.getMenu(restaurantId);
    res.status(200).json(menu);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching menu.' });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { name } = req.body;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const newCategory = await menuService.createCategory(restaurantId, name);
    res.status(201).json(newCategory);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error creating category.' });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { name } = req.body;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const updated = await menuService.updateCategory(restaurantId, id, name);
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error updating category.' });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    await menuService.deleteCategory(restaurantId, id);
    res.status(200).json({ message: 'Category and all its items deleted successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error deleting category.' });
  }
};

export const createMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { name, description, price, image, code, categoryId } = req.body;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    if (!name || price === undefined || !code || !categoryId) {
      res.status(400).json({ error: 'Fields "name", "price", "code", and "categoryId" are required.' });
      return;
    }
    const newItem = await menuService.createMenuItem(restaurantId, {
      name,
      description,
      price: parseFloat(price),
      image,
      code,
      categoryId,
    });
    res.status(201).json(newItem);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error creating menu item.' });
  }
};

export const updateMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    const { name, description, price, image, code, categoryId, isAvailable } = req.body;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    const updated = await menuService.updateMenuItem(restaurantId, id, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      image,
      code,
      categoryId,
      isAvailable,
    });
    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error updating menu item.' });
  }
};

export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { id } = req.params;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }
    await menuService.deleteMenuItem(restaurantId, id);
    res.status(200).json({ message: 'Menu item deleted successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error deleting menu item.' });
  }
};
