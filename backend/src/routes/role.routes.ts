import { Router } from 'express';
import {
  getPermissionsCatalog,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  switchUserRole,
} from '../controllers/role.controller';
import { authenticateJWT, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Catalog of available permissions & role presets
router.get('/catalog', authenticateJWT, getPermissionsCatalog);

// List all roles available to this restaurant (system + custom)
router.get('/', authenticateJWT, getRoles);

// Create custom role under restaurant (Super Admin only)
router.post('/', authenticateJWT, requireSuperAdmin, createRole);

// Update custom role or its permissions (Super Admin only)
router.patch('/:id', authenticateJWT, requireSuperAdmin, updateRole);

// Delete custom role (Super Admin only)
router.delete('/:id', authenticateJWT, requireSuperAdmin, deleteRole);

// Switch a staff member's role (Super Admin only)
router.patch('/users/:userId/switch', authenticateJWT, requireSuperAdmin, switchUserRole);

export default router;
