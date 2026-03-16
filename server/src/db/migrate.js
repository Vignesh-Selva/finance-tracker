import { initDatabase } from './connection.js';

try {
  await initDatabase();
  console.log('Migrations complete.');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
