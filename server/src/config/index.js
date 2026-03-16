import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProd: process.env.NODE_ENV === 'production',

  db: {
    path: process.env.DATABASE_PATH || './data/finance.db',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  apis: {
    coingecko: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
    mfapi: process.env.MFAPI_URL || 'https://api.mfapi.in/mf',
    yahoo: process.env.YAHOO_FINANCE_URL || 'https://query1.finance.yahoo.com/v7/finance/quote',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
