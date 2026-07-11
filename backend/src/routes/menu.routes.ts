import { Router } from 'express';
import {
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Read Menu (accessible to all authenticated staff: Waiters, Cashiers, Chefs, Admins)
router.get('/', authenticateJWT, getMenu as any);

// Category Management (restricted to administrative roles)
router.post('/categories', authenticateJWT, requirePermission('view:staff'), createCategory as any);
router.patch('/categories/:id', authenticateJWT, requirePermission('view:staff'), updateCategory as any);
router.delete('/categories/:id', authenticateJWT, requirePermission('view:staff'), deleteCategory as any);

// Menu Item Management (restricted to administrative roles)
router.post('/items', authenticateJWT, requirePermission('view:staff'), createMenuItem as any);
router.patch('/items/:id', authenticateJWT, requirePermission('view:staff'), updateMenuItem as any);
router.delete('/items/:id', authenticateJWT, requirePermission('view:staff'), deleteMenuItem as any);

export default router;
