import { Router } from 'express';
import { getActiveKots, updateStatus } from '../controllers/kot.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/active', authenticateJWT, requirePermission('view:orders'), getActiveKots);
router.patch('/:id/status', authenticateJWT, requirePermission('update:order-status'), updateStatus);

export default router;
