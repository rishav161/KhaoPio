import { Router } from 'express';
import {
  registerAdmin,
  loginEmail,
  inviteStaff,
  verifyInvitation,
  acceptInvitation,
  getStaff,
  loginPin,
  getAllUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
  initRegister,
  verifyOtp,
  updateProfile,
  updateRestaurantDetails,
  getRestaurantDetails,
} from '../controllers/auth.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Public onboarding / auth routes
router.post('/register-init', initRegister);
router.post('/register-verify-otp', verifyOtp);
router.post('/register-admin', registerAdmin);
router.post('/login', loginEmail);
router.get('/invitation/:token', verifyInvitation);
router.post('/accept-invite', acceptInvitation);
router.get('/staff', getStaff); // Public list for PIN-login screen
router.post('/pin-login', loginPin);

// Secured administrative invitation route
router.post('/invite', authenticateJWT, requirePermission('invite:staff'), inviteStaff);

// Secured administrative staff management routes
router.get('/admin/users', authenticateJWT, requirePermission('view:staff'), getAllUsers);
router.patch('/admin/users/:id', authenticateJWT, requirePermission('update:staff'), updateUserByAdmin);
router.delete('/admin/users/:id', authenticateJWT, requirePermission('delete:staff'), deleteUserByAdmin);

// Profile and Restaurant settings routes
router.patch('/profile', authenticateJWT, updateProfile);
router.get('/restaurant', authenticateJWT, getRestaurantDetails);
router.patch('/restaurant', authenticateJWT, updateRestaurantDetails);

export default router;
