import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../prisma';

/**
 * Get all coupons for the user's restaurant.
 */
export const getCoupons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is required.' });
      return;
    }

    const coupons = await prisma.coupon.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(coupons);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching coupons.' });
  }
};

/**
 * Create a new coupon for the user's restaurant.
 */
export const createCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is required.' });
      return;
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minSubtotal,
      maxDiscount,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (!code || !discountType || discountValue === undefined || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing required coupon fields (code, discountType, discountValue, startDate, endDate).' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      res.status(400).json({ error: 'Start date cannot be in the past.' });
      return;
    }

    if (end < start) {
      res.status(400).json({ error: 'End date must be at or after the start date.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // Check for duplicate code
    const existing = await prisma.coupon.findUnique({
      where: {
        code_restaurantId: {
          code: cleanCode,
          restaurantId,
        },
      },
    });

    if (existing) {
      res.status(400).json({ error: `A coupon with code "${cleanCode}" already exists for this restaurant.` });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue),
        minSubtotal: parseFloat(minSubtotal || '0'),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        restaurantId,
      },
    });

    res.status(201).json(coupon);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error creating coupon.' });
  }
};

/**
 * Update an existing coupon.
 */
export const updateCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is required.' });
      return;
    }

    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      minSubtotal,
      maxDiscount,
      startDate,
      endDate,
      isActive,
    } = req.body;

    // Verify ownership
    const existing = await prisma.coupon.findFirst({
      where: { id, restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== existing.code) {
        // Verify code is not duplicate
        const duplicate = await prisma.coupon.findUnique({
          where: {
            code_restaurantId: {
              code: cleanCode,
              restaurantId,
            },
          },
        });
        if (duplicate) {
          res.status(400).json({ error: `A coupon with code "${cleanCode}" already exists.` });
          return;
        }
      }
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(existing.startDate);
      const end = endDate ? new Date(endDate) : new Date(existing.endDate);

      if (startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start < today) {
          res.status(400).json({ error: 'Start date cannot be in the past.' });
          return;
        }
      }

      if (end < start) {
        res.status(400).json({ error: 'End date must be at or after the start date.' });
        return;
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
        ...(minSubtotal !== undefined && { minSubtotal: parseFloat(minSubtotal) }),
        ...(maxDiscount !== undefined && { maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error updating coupon.' });
  }
};

/**
 * Delete a coupon.
 */
export const deleteCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is required.' });
      return;
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.coupon.findFirst({
      where: { id, restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }

    await prisma.coupon.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Coupon deleted successfully.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error deleting coupon.' });
  }
};
