import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import logger from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = config.isTest
  ? null // in-memory for tests
  : path.resolve(__dirname, '../../', config.db.path);

let _db = null;

/**
 * Lightweight query builder wrapping sql.js for a Knex-like API.
 * Supports: all(), get(), run(), prepare/bind, and auto-save to disk.
 */
class Database {
  constructor(sqlDb, filePath) {
    this._db = sqlDb;
    this._filePath = filePath;
  }

  /** Run a statement that modifies data (INSERT, UPDATE, DELETE). Returns { changes }. */
  run(sql, params = []) {
    this._db.run(sql, params);
    const changes = this._db.getRowsModified();
    this._save();
    return { changes };
  }

  /** Get a single row. Returns object or undefined. */
  get(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    let row;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row || undefined;
  }

  /** Get all rows matching the query. Returns array of objects. */
  all(sql, params = []) {
    const results = [];
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  /** Execute raw SQL (e.g. CREATE TABLE). No return value. */
  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  /** Save database to disk (no-op for in-memory). */
  _save() {
    if (this._filePath) {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this._filePath, buffer);
    }
  }

  close() {
    this._save();
    this._db.close();
  }
}

/**
 * Initialize the database — load from disk or create new.
 */
export async function initDatabase() {
  if (_db) return _db;

  try {
    const SQL = await initSqlJs();

    let sqlDb;
    if (DB_PATH && fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      sqlDb = new SQL.Database(fileBuffer);
      logger.info({ path: DB_PATH }, 'Database loaded from disk');
    } else {
      // Ensure data directory exists
      if (DB_PATH) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      }
      sqlDb = new SQL.Database();
      logger.info('New database created');
    }

    _db = new Database(sqlDb, DB_PATH);

    // Enable WAL mode and foreign keys
    _db.run('PRAGMA journal_mode = WAL');
    _db.run('PRAGMA foreign_keys = ON');

    // Run migrations
    await runMigrations(_db);

    logger.info('Database initialized');
    return _db;
  } catch (error) {
    logger.error({ err: error }, 'Database initialization failed');
    throw error;
  }
}

/**
 * Get the database instance (must call initDatabase first).
 */
export function getDb() {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}

/**
 * Run schema migrations.
 */
async function runMigrations(db) {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: 001_initial_schema
  const applied = db.get("SELECT name FROM _migrations WHERE name = '001_initial_schema'");
  if (!applied) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        currency TEXT DEFAULT 'INR',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS savings (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        bank_name TEXT NOT NULL,
        account_type TEXT DEFAULT 'Savings',
        balance REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS fixed_deposits (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        bank_name TEXT NOT NULL,
        invested REAL DEFAULT 0,
        maturity REAL DEFAULT 0,
        interest_rate REAL DEFAULT 0,
        start_date TEXT,
        maturity_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS mutual_funds (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        fund_name TEXT NOT NULL,
        scheme_code TEXT DEFAULT '',
        units REAL DEFAULT 0,
        invested REAL DEFAULT 0,
        current REAL DEFAULT 0,
        fund_type TEXT DEFAULT 'Equity',
        sip REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS stocks (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        stock_name TEXT NOT NULL,
        ticker TEXT DEFAULT '',
        quantity REAL DEFAULT 0,
        invested REAL DEFAULT 0,
        current REAL DEFAULT 0,
        sector TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS crypto (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        coin_name TEXT NOT NULL,
        platform TEXT DEFAULT '',
        quantity REAL DEFAULT 0,
        invested REAL DEFAULT 0,
        current REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS liabilities (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        lender TEXT DEFAULT '',
        loan_amount REAL DEFAULT 0,
        outstanding REAL DEFAULT 0,
        interest_rate REAL DEFAULT 0,
        emi REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT DEFAULT 'Other',
        amount REAL NOT NULL,
        units REAL,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        monthly_limit REAL NOT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        currency TEXT DEFAULT 'INR',
        goal REAL DEFAULT 15000000,
        epf REAL DEFAULT 0,
        ppf REAL DEFAULT 0,
        theme TEXT DEFAULT 'light',
        last_sync TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS net_worth_snapshots (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        snapshot_date TEXT NOT NULL,
        total_assets REAL DEFAULT 0,
        total_liabilities REAL DEFAULT 0,
        net_worth REAL DEFAULT 0,
        savings REAL DEFAULT 0,
        fixed_deposits REAL DEFAULT 0,
        mutual_funds REAL DEFAULT 0,
        stocks REAL DEFAULT 0,
        crypto REAL DEFAULT 0,
        epf REAL DEFAULT 0,
        ppf REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(portfolio_id, snapshot_date)
      );

      CREATE TABLE IF NOT EXISTS price_cache (
        id TEXT PRIMARY KEY,
        asset_type TEXT NOT NULL,
        identifier TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        fetched_at TEXT DEFAULT (datetime('now')),
        UNIQUE(asset_type, identifier, currency)
      );
    `);

    db.run("INSERT INTO _migrations (name) VALUES ('001_initial_schema')");
    logger.info('Migration 001_initial_schema applied');
  }
}

export default { initDatabase, getDb };
