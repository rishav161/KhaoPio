import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import reportsService from '../services/reports.service';

export const getSalesReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(401).json({ error: 'Unauthorized. Restaurant context missing.' });
      return;
    }

    const { startDate, endDate, paymentMethod, page, limit } = req.query;

    const data = await reportsService.getSalesReport({
      restaurantId,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 10,
    });

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error compiling sales report.' });
  }
};
