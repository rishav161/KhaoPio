import { Router } from 'express';
import { getSalesReport } from '../controllers/reports.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/sales', authenticateJWT, requirePermission('view:sales-reports'), getSalesReport as any);

export default router;
