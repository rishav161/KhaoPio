import { Router } from 'express';
import { getTables, createTable, deleteTable } from '../controllers/table.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, requirePermission('view:tables'), getTables);
router.post('/', authenticateJWT, requirePermission('manage:tables'), createTable);
router.delete('/:id', authenticateJWT, requirePermission('manage:tables'), deleteTable);

export default router;
