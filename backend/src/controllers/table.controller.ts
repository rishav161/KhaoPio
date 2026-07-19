import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import tableService from '../services/table.service';

export const getTables = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const tables = await tableService.getTables(restaurantId);
    res.status(200).json(tables);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const createTable = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const { name, capacity } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Table name is required.' });
      return;
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      res.status(400).json({ error: 'Capacity must be a positive number.' });
      return;
    }

    const newTable = await tableService.createTable(restaurantId, name.trim(), capNum);
    res.status(201).json(newTable);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bad Request' });
  }
};

export const deleteTable = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Table ID is required.' });
      return;
    }

    const deletedTable = await tableService.deleteTable(restaurantId, id);
    res.status(200).json({ message: 'Table deleted successfully.', deletedTable });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bad Request' });
  }
};
