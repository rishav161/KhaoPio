import { Request, Response } from 'express';
import kotService from '../services/kot.service';

export const getActiveKots = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    const activeKots = await kotService.getActiveKots(restaurantId);
    res.status(200).json(activeKots);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({ error: 'Field "status" is required in request body.' });
      return;
    }

    const updatedKot = await kotService.updateKotStatus(id, status);
    res.status(200).json(updatedKot);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
