import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import bookingService from '../services/booking.service';

export const getBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const bookings = await bookingService.getBookings(restaurantId);
    res.status(200).json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const { customerName, customerPhone, bookingTime, guestsCount, tableId } = req.body;

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      res.status(400).json({ error: 'Customer name is required.' });
      return;
    }

    if (!bookingTime) {
      res.status(400).json({ error: 'Booking date and time are required.' });
      return;
    }

    if (!tableId) {
      res.status(400).json({ error: 'Table selection is required.' });
      return;
    }

    const count = parseInt(guestsCount, 10);
    if (isNaN(count) || count <= 0) {
      res.status(400).json({ error: 'Guests count must be a positive number.' });
      return;
    }

    const newBooking = await bookingService.createBooking(restaurantId, {
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      bookingTime,
      guestsCount: count,
      tableId,
    });

    res.status(201).json(newBooking);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bad Request' });
  }
};

export const checkInBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Booking ID is required.' });
      return;
    }

    const booking = await bookingService.checkInBooking(restaurantId, id);
    res.status(200).json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bad Request' });
  }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context is missing.' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Booking ID is required.' });
      return;
    }

    const booking = await bookingService.cancelBooking(restaurantId, id);
    res.status(200).json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bad Request' });
  }
};
