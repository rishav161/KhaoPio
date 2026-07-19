import { Router } from 'express';
import { getBookings, createBooking, checkInBooking, cancelBooking } from '../controllers/booking.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, requirePermission('view:tables'), getBookings);
router.post('/', authenticateJWT, requirePermission('manage:tables'), createBooking);
router.post('/:id/checkin', authenticateJWT, requirePermission('manage:tables'), checkInBooking);
router.patch('/:id/cancel', authenticateJWT, requirePermission('manage:tables'), cancelBooking);

export default router;
