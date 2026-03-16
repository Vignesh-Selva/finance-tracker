import pino from 'pino';
import config from '../config/index.js';

const logger = pino({
  level: config.log.level,
  transport: config.isDev
    ? {
        target: 'pino/file',
        options: { destination: 1 },
      }
    : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
