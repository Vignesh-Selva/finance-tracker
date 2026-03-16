# Personal Finance Tracker

A full-stack personal finance tracking system built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

- **Multi-asset tracking** — savings, fixed deposits, mutual funds, stocks, crypto, liabilities
- **Transaction & budget management** — income/expense tracking with category budgets
- **Dashboard** — net worth overview, asset allocation, investment P/L, goal progress
- **Multiple portfolios** — organize investments across separate portfolios
- **Historical snapshots** — daily net worth snapshots for timeline analysis
- **Financial intelligence** — CAGR, XIRR, FI projection, growth rate calculations
- **Live price refresh** — crypto (CoinGecko), stocks (Yahoo Finance), mutual funds (mfapi.in)
- **Import/Export** — JSON backup and restore
- **Dark/Light theme** — with responsive mobile layout
- **Production-grade backend** — REST API, validation (Zod), rate limiting, structured logging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, SQLite (better-sqlite3), Knex.js |
| **Validation** | Zod |
| **Logging** | Pino |
| **Security** | Helmet, CORS, express-rate-limit |
| **Frontend** | Vanilla JS (ES modules), Vite |
| **Charts** | Chart.js |
| **Testing** | Vitest, Supertest |

## Project Structure

```
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/         # Environment configuration
│   │   ├── db/             # Knex migrations, seeds, connection
│   │   ├── lib/            # Logger and shared utilities
│   │   ├── middleware/      # Validation, error handling
│   │   ├── repositories/   # Data access layer (CRUD)
│   │   ├── routes/         # Express route handlers
│   │   ├── services/       # Business logic (calculator, snapshots)
│   │   ├── validators/     # Zod schemas
│   │   ├── app.js          # Express app setup
│   │   └── index.js        # Entry point
│   ├── data/               # SQLite database (gitignored)
│   └── package.json
├── client/                 # Frontend SPA
│   ├── src/
│   │   ├── core/           # App shell
│   │   ├── services/       # API client
│   │   ├── ui/             # Feature renderers & forms
│   │   ├── utils/          # Formatting, sanitization
│   │   └── main.js         # Entry point
│   ├── styles/             # CSS
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json            # Root (npm workspaces)
└── .gitignore
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Installation

```bash
npm install
```

### Development

Start both server and client in parallel:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:server   # Express API on http://localhost:3001
npm run dev:client   # Vite dev server on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the Express backend.

### Database

Migrations run automatically on server start. To run manually:

```bash
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed default portfolio
```

### Testing

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

### Build for Production

```bash
npm run build   # Builds client to client/dist/
npm start       # Starts production server
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/portfolios` | List / create portfolios |
| GET/PUT/DELETE | `/api/portfolios/:id` | Portfolio CRUD |
| GET | `/api/dashboard/:portfolioId` | Full dashboard data |
| GET | `/api/dashboard/:portfolioId/timeline` | Net worth history |
| POST | `/api/dashboard/:portfolioId/snapshot` | Take snapshot |
| GET | `/api/dashboard/:portfolioId/fi-projection` | FI projection |
| CRUD | `/api/savings` | Savings accounts |
| CRUD | `/api/fixed-deposits` | Fixed deposits |
| CRUD | `/api/mutual-funds` | Mutual funds |
| CRUD | `/api/stocks` | Stocks & ETFs |
| CRUD | `/api/crypto` | Crypto holdings |
| CRUD | `/api/liabilities` | Liabilities |
| CRUD | `/api/transactions` | Income/expenses |
| CRUD | `/api/budgets` | Category budgets |
| CRUD | `/api/settings` | Portfolio settings |

All list endpoints require `?portfolio_id=<uuid>` query parameter.

## Environment Variables

Copy `server/.env.example` to `server/.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment |
| `DATABASE_PATH` | ./data/finance.db | SQLite path |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed origin |
| `LOG_LEVEL` | info | Pino log level |

## Legacy Frontend

The original client-side-only app (IndexedDB + Firebase) is preserved in the root `src/` directory for reference. The new full-stack version lives in `client/` and `server/`.
