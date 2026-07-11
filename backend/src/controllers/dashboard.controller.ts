import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import dashboardService from '../services/dashboard.service';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }

    const { startDate, endDate, page, limit } = req.query;

    const stats = await dashboardService.getDashboardStats({
      restaurantId,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 5,
    });
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error compiling dashboard statistics.' });
  }
};
