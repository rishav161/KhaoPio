import { Router } from 'express';
import { searchGlobal } from '../controllers/search.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/search?q=query
router.get('/', authenticateJWT, searchGlobal);

export default router;
