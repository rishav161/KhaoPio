import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', authenticateJWT, requirePermission('view:dashboard'), getDashboardStats as any);

export default router;
