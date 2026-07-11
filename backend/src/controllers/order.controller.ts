import { Request, Response } from 'express';
import orderService from '../services/order.service';

export const sendToKitchen = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    // Extract waiterId from authenticated user token (req.user) or fallback to request body for flexibility/testing
    const waiterId = (req as any).user?.id || payload.waiterId;

    if (!waiterId) {
      res.status(400).json({ error: 'waiterId is required. Authenticate or pass waiterId in body.' });
      return;
    }

    if (!payload || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      res.status(400).json({ error: 'Invalid payload. "items" array is required and cannot be empty.' });
      return;
    }

    const newOrder = await orderService.createKitchenOrder(waiterId, payload);
    res.status(201).json(newOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const getActiveOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeOrders = await orderService.getActiveOrders();
    res.status(200).json(activeOrders);
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

    const updatedOrder = await orderService.updateOrderStatus(id, status);
    res.status(200).json(updatedOrder);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};

export const requestBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedOrder = await orderService.updateOrderStatus(id, 'BILL_REQUESTED');
    res.status(200).json(updatedOrder);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};

export const payOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    // Extract cashierId from authenticated user token (req.user) or fallback to request body for flexibility/testing
    const cashierId = (req as any).user?.id || req.body.cashierId;

    if (!cashierId) {
      res.status(400).json({ error: 'cashierId is required. Authenticate or pass cashierId in body.' });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ error: 'Field "paymentMethod" is required in request body.' });
      return;
    }

    const paidOrder = await orderService.processPayment(id, paymentMethod, cashierId);
    res.status(200).json(paidOrder);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};
