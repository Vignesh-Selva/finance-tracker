import { Router } from 'express';
import { ValuationService } from '../services/ValuationService.js';
import { priceCacheRepo } from '../repositories/index.js';
import logger from '../lib/logger.js';

const router = Router();

// POST /api/prices/refresh/:portfolioId — Fetch live prices and update holdings
router.post('/refresh/:portfolioId', async (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    logger.info({ portfolioId }, 'Price refresh requested');

    const results = await ValuationService.refreshPrices(portfolioId);

    res.json({
      data: results,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices/cached/:portfolioId — Get cached prices (no external calls)
router.get('/cached/:portfolioId', (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    const prices = ValuationService.getCachedPrices(portfolioId);
    res.json({ data: prices });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices/valuation/:portfolioId — Get full portfolio valuation with P&L
router.get('/valuation/:portfolioId', (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    const valuation = ValuationService.getValuation(portfolioId);
    res.json({ data: valuation });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices/cache — Get all cached prices (admin/debug)
router.get('/cache', (_req, res, next) => {
  try {
    const all = priceCacheRepo.findAll();
    res.json({ data: all, count: all.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/prices/cache — Clear price cache
router.delete('/cache', (_req, res, next) => {
  try {
    priceCacheRepo.clearAll();
    res.json({ message: 'Price cache cleared' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/prices/cache/stale — Clear stale prices (older than 24h)
router.delete('/cache/stale', (_req, res, next) => {
  try {
    const cleared = priceCacheRepo.clearStale();
    res.json({ message: `Cleared ${cleared} stale price entries` });
  } catch (err) {
    next(err);
  }
});

export default router;
