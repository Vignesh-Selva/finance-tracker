import logger from '../lib/logger.js';

/**
 * Global error handler middleware.
 */
export function errorHandler(err, req, res, _next) {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
}

export default errorHandler;
