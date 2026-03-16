import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import logger from '../lib/logger.js';

/**
 * Factory that creates a standard CRUD router for any asset type.
 * Reduces boilerplate across all resource endpoints.
 *
 * @param {object} options
 * @param {BaseRepository} options.repository - The repository instance
 * @param {ZodSchema} options.createSchema - Zod schema for creation
 * @param {ZodSchema} options.updateSchema - Zod schema for updates
 * @param {string} options.resourceName - Human-readable name for logs
 */
export function createCrudRouter({ repository, createSchema, updateSchema, resourceName }) {
  const router = Router();

  // GET /api/:resource?portfolio_id=xxx
  router.get('/', async (req, res, next) => {
    try {
      const { portfolio_id } = req.query;
      if (!portfolio_id) {
        return res.status(400).json({ error: 'portfolio_id query parameter is required' });
      }
      const items = await repository.findAll(portfolio_id);
      res.json({ data: items, count: items.length });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/:resource/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/:resource
  router.post('/', validate(createSchema), async (req, res, next) => {
    try {
      const item = await repository.create(req.validatedBody);
      logger.info({ id: item.id, resource: resourceName }, `${resourceName} created`);
      res.status(201).json({ data: item });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/:resource/:id
  router.put('/:id', validate(updateSchema), async (req, res, next) => {
    try {
      const item = await repository.update(req.params.id, req.validatedBody);
      if (!item) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }
      logger.info({ id: item.id, resource: resourceName }, `${resourceName} updated`);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/:resource/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await repository.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }
      logger.info({ id: req.params.id, resource: resourceName }, `${resourceName} deleted`);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createCrudRouter;
