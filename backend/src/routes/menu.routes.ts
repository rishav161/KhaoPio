import { Router } from 'express';
import {
  getMenu,
  getPublicMenu,
  regenerateQrCode,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menu.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Public Menu routes (Unauthenticated for QR code customers)
router.get('/public', getPublicMenu as any);
router.get('/public/:restaurantId', getPublicMenu as any);

// Regenerate QR Code Token (restricted to Store Managers / Super Admins)
router.post('/regenerate-qr', authenticateJWT, requirePermission('view:staff'), regenerateQrCode as any);

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
