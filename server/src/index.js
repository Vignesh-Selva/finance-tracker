import app from './app.js';
import config from './config/index.js';
import { initDatabase } from './db/connection.js';
import logger from './lib/logger.js';

async function start() {
  try {
    // Run migrations on startup
    await initDatabase();
    logger.info('Database initialized');

    app.listen(config.port, () => {
      logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();
