import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createPortfolioSchema, updatePortfolioSchema } from '../validators/schemas.js';
import { portfolioRepo } from '../repositories/index.js';
import logger from '../lib/logger.js';

const router = Router();

// GET /api/portfolios
router.get('/', async (_req, res, next) => {
  try {
    const portfolios = await portfolioRepo.findAll();
    res.json({ data: portfolios, count: portfolios.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/portfolios/:id
router.get('/:id', async (req, res, next) => {
  try {
    const portfolio = await portfolioRepo.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    res.json({ data: portfolio });
  } catch (err) {
    next(err);
  }
});

// POST /api/portfolios
router.post('/', validate(createPortfolioSchema), async (req, res, next) => {
  try {
    const portfolio = await portfolioRepo.create(req.validatedBody);
    logger.info({ id: portfolio.id }, 'Portfolio created');
    res.status(201).json({ data: portfolio });
  } catch (err) {
    next(err);
  }
});

// PUT /api/portfolios/:id
router.put('/:id', validate(updatePortfolioSchema), async (req, res, next) => {
  try {
    const portfolio = await portfolioRepo.update(req.params.id, req.validatedBody);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    logger.info({ id: portfolio.id }, 'Portfolio updated');
    res.json({ data: portfolio });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/portfolios/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await portfolioRepo.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    logger.info({ id: req.params.id }, 'Portfolio deleted');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
