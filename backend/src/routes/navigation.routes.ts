import { Router } from 'express';
import { getNavigation } from '../controllers/navigation.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Route to get dynamic navigation sidebar structure
router.get('/', authenticateJWT, getNavigation);

export default router;
