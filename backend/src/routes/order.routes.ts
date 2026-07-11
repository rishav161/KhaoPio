import { Router } from 'express';
import {
  sendToKitchen,
  getActiveOrders,
  updateStatus,
  requestBill,
  payOrder,
} from '../controllers/order.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Routes mapped and guarded by authentication and granular permissions
router.post('/kitchen', authenticateJWT, requirePermission('create:kot'), sendToKitchen);
router.get('/active', authenticateJWT, requirePermission('view:orders'), getActiveOrders);
router.patch('/:id/status', authenticateJWT, requirePermission('update:order-status'), updateStatus);
router.post('/:id/request-bill', authenticateJWT, requirePermission('request:bill'), requestBill);
router.post('/:id/pay', authenticateJWT, requirePermission('pay:order'), payOrder);

export default router;
