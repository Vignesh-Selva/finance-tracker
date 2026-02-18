# Personal Finance Tracker

A lightweight, client-side personal finance tracker that runs entirely in the browser. Data is stored locally (IndexedDB + localStorage), so no backend is required.

## Features
- Track expenses, savings, FDs, mutual funds, stocks, crypto, liabilities, and budgets
- Dashboard overview with quick insights
- Theme toggle and responsive layout
- Import/Export data
- PWA-ready (service worker + manifest)

## Tech Stack
- HTML, CSS
- Vanilla JavaScript (ES modules)
- IndexedDB for data persistence

## Project Structure
- `public/` – static assets (HTML, CSS, icons, manifest, service worker)
- `src/` – application modules (core shell, data, services, UI, utils)

## Local Development
1. Use any static server from the repo root (examples):
   - VS Code Live Server
   - `python -m http.server 8000` (Python 3)
2. Open `http://localhost:8000/` (adjust port as needed).
3. The app bootstraps from `public/index.html` and `src/index.js`.

## Deploying to GitHub Pages
1. Push this repository to GitHub.
2. In the repository settings, enable **Pages** with Source = `Deploy from a branch`, Branch = `main`, Folder = `/ (root)`.
3. Ensure the published site uses the default `https://<user>.github.io/<repo>/` URL. The service worker and assets are configured with relative paths to work on subpaths.
4. After publishing, force-refresh once to update the PWA cache.

## Notes
- No build step is required; assets are served directly.
- If you change filenames or add new assets, update `public/sw.js` to cache them.
- Data is stored locally in the browser; exporting is recommended for backups.
