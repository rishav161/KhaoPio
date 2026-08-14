import { Router } from 'express';
import {
  getHelpCategories,
  getHelpArticles,
  getHelpArticleBySlug,
  rateHelpArticle,
} from '../controllers/help.controller';

const router = Router();

// No authenticateJWT — accessible to any logged-in user without extra permission checks.
router.get('/categories', getHelpCategories);
router.get('/articles', getHelpArticles);
router.get('/articles/:slug', getHelpArticleBySlug);
router.post('/articles/:slug/helpful', rateHelpArticle);

export default router;
