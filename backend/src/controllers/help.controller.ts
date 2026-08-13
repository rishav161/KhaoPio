import { Request, Response } from 'express';
import prisma from '../prisma';

/**
 * GET /help/categories
 * Returns all help categories with an article count for each.
 */
export const getHelpCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.helpCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { articles: true } },
      },
    });

    const result = categories.map((cat) => ({
      id: cat.id,
      title: cat.title,
      slug: cat.slug,
      icon: cat.icon,
      order: cat.order,
      articleCount: cat._count.articles,
      createdAt: cat.createdAt,
    }));

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching help categories.' });
  }
};

/**
 * GET /help/articles
 * Returns all articles. Supports:
 *   ?category=slug  — filter by category slug
 *   ?q=search       — full-text search across title and excerpt
 *   ?role=WAITER    — filter to articles visible to that role (empty roles array = visible to all)
 */
export const getHelpArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, q, role } = req.query as Record<string, string | undefined>;

    const where: Record<string, any> = {};

    if (category) {
      where.category = { slug: category };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const articles = await prisma.helpArticle.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
      include: { category: { select: { id: true, title: true, slug: true, icon: true } } },
    });

    // Filter by role in application layer:
    // roles = [] means visible to everyone; otherwise only roles listed may see it.
    const filtered = role
      ? articles.filter((a) => a.roles.length === 0 || a.roles.includes(role))
      : articles;

    res.status(200).json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching help articles.' });
  }
};

/**
 * GET /help/articles/:slug
 * Returns a single article by slug.
 */
export const getHelpArticleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const article = await prisma.helpArticle.findUnique({
      where: { slug },
      include: { category: { select: { id: true, title: true, slug: true, icon: true } } },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }

    res.status(200).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching help article.' });
  }
};

/**
 * POST /help/articles/:slug/helpful
 * Increments the helpful or notHelpful counter.
 * Body: { helpful: true | false }
 */
export const rateHelpArticle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { helpful } = req.body as { helpful: boolean };

    if (typeof helpful !== 'boolean') {
      res.status(400).json({ error: 'Body must include "helpful" as a boolean.' });
      return;
    }

    const existing = await prisma.helpArticle.findUnique({ where: { slug } });
    if (!existing) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }

    const updated = await prisma.helpArticle.update({
      where: { slug },
      data: helpful
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } },
      select: { slug: true, helpful: true, notHelpful: true },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error rating help article.' });
  }
};
