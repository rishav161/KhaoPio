import { Request, Response } from 'express';
import orderService from '../services/order.service';
import prisma from '../prisma';

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
    const restaurantId = (req as any).user?.restaurantId;
    const includePaid = req.query.includePaid === 'true';
    const paidDays = (req.query.paidDays as string) || 'today';
    const activeOrders = await orderService.getActiveOrders(restaurantId, includePaid, paidDays);
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
    const { paymentMethod, couponCode, manualDiscount, payments } = req.body;
    // Extract cashierId from authenticated user token (req.user) or fallback to request body for flexibility/testing
    const cashierId = (req as any).user?.id || req.body.cashierId;

    if (!cashierId) {
      res.status(400).json({ error: 'cashierId is required. Authenticate or pass cashierId in body.' });
      return;
    }

    let paymentsPayload = payments;

    // Fallback: If no payments array is provided but a single paymentMethod is passed
    if (!paymentsPayload && paymentMethod) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { payments: true }
      });
      if (!order) {
        res.status(404).json({ error: `Order with ID ${id} not found` });
        return;
      }
      
      // Calculate remaining amount to pay
      const paidSoFar = order.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, order.grandTotal - paidSoFar);

      paymentsPayload = [{
        paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'UPI',
        amount: remaining
      }];
    }

    const paidOrder = await orderService.processPayment(id, cashierId, {
      couponCode,
      manualDiscount: manualDiscount ? parseFloat(manualDiscount) : undefined,
      payments: paymentsPayload
    });
    
    res.status(200).json(paidOrder);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    const restaurantId = (req as any).user?.restaurantId;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Field "code" is required as a query parameter.' });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ error: 'restaurantId context is required. Please authenticate.' });
      return;
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: { equals: code.trim(), mode: 'insensitive' },
        restaurantId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!coupon) {
      res.status(404).json({ error: `Coupon code "${code}" is invalid or expired.` });
      return;
    }

    res.status(200).json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minSubtotal: coupon.minSubtotal,
        maxDiscount: coupon.maxDiscount
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
