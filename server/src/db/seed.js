import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDb } from './connection.js';

try {
  await initDatabase();
  const db = getDb();

  const existing = db.get('SELECT id FROM portfolios LIMIT 1');
  if (existing) {
    console.log('Seed skipped — portfolios already exist.');
    process.exit(0);
  }

  const now = new Date().toISOString();
  const portfolioId = uuidv4();

  db.run(
    `INSERT INTO portfolios (id, name, description, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [portfolioId, 'Default Portfolio', 'Primary investment portfolio', 'INR', now, now]
  );

  db.run(
    `INSERT INTO settings (id, portfolio_id, currency, goal, epf, ppf, theme, last_sync, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), portfolioId, 'INR', 15000000, 0, 0, 'light', now, now, now]
  );

  console.log('Seed complete — default portfolio created.');
  process.exit(0);
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
