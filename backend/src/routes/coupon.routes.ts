import { Router } from 'express';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Secure all coupon routes
router.use(authenticateJWT);

router.get('/', getCoupons);
router.post('/', createCoupon);
router.patch('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
