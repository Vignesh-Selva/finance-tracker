# Personal Finance Tracker

A personal finance tracking app built with vanilla JavaScript and Supabase, deployed on GitHub Pages.

**Live:** [vignesh-selva.github.io/finance-tracker](https://vignesh-selva.github.io/finance-tracker/)

## Features

- **Multi-asset tracking** — savings, fixed deposits, mutual funds, stocks, crypto, liabilities
- **Transaction & budget management** — income/expense tracking with category budgets
- **Dashboard** — net worth overview, asset allocation, investment P/L, goal progress
- **Net worth history** — daily snapshots with Chart.js timeline
- **Live price refresh** — MF NAV (mfapi.in), crypto (CoinGecko), stocks (Yahoo Finance)
- **Import/Export** — JSON backup and restore
- **Dark/Light theme** — responsive mobile layout
- **CI/CD** — lint, test, and deploy via GitHub Actions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Supabase (PostgreSQL, RLS, REST API) |
| **Frontend** | Vanilla JS (ES modules), Vite |
| **Charts** | Chart.js |
| **Testing** | Vitest |
| **Linting** | ESLint 9 (flat config) |
| **Deploy** | GitHub Pages via GitHub Actions |

## Project Structure

```
├── client/                 # Frontend SPA
│   ├── src/
│   │   ├── core/           # App shell (appShell.js)
│   │   ├── services/       # Supabase API client, price fetcher
│   │   ├── ui/             # Feature renderers & forms
│   │   ├── utils/          # Formatting, sanitization, finance utils
│   │   └── main.js         # Entry point
│   ├── public/             # Static assets (icons, manifest)
│   ├── styles/             # CSS (dark/light themes, responsive)
│   ├── tests/              # Vitest unit tests
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── supabase/
│   ├── schema.sql          # Database schema (run in Supabase SQL Editor)
│   └── import-backup.sql   # Legacy data import script
├── .github/workflows/
│   └── deploy.yml          # CI: lint → test → build → deploy
└── package.json            # Root (npm workspace)
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- A **Supabase** project (free tier works)

### Setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor
2. Copy `client/.env.example` to `client/.env` and fill in your Supabase URL and anon key
3. Install and run:

```bash
npm install
npm run dev       # Vite dev server on http://localhost:5173
```

### Testing & Linting

```bash
npm test          # Run Vitest (45 tests)
npm run lint      # ESLint
```

### Build

```bash
npm run build     # Output to client/dist/
```

### Deploy to GitHub Pages

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets
2. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
3. Push to `main` — the workflow runs lint → test → build → deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
