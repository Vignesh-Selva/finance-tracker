import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export class PortfolioRepository {
  get db() {
    return getDb();
  }

  findAll() {
    return this.db.all('SELECT * FROM portfolios ORDER BY created_at DESC');
  }

  findById(id) {
    return this.db.get('SELECT * FROM portfolios WHERE id = ?', [id]);
  }

  create(data) {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...data,
      created_at: now,
      updated_at: now,
    };
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => record[col]);
    this.db.run(
      `INSERT INTO portfolios (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    // Auto-create default settings for the new portfolio
    const settingsId = uuidv4();
    this.db.run(
      `INSERT INTO settings (id, portfolio_id, currency, goal, epf, ppf, theme, last_sync, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [settingsId, record.id, data.currency || 'INR', 15000000, 0, 0, 'light', now, now, now]
    );

    return record;
  }

  update(id, data) {
    const now = new Date().toISOString();
    const updated = { ...data, updated_at: now };
    const setClauses = Object.keys(updated).map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updated), id];
    const { changes } = this.db.run(
      `UPDATE portfolios SET ${setClauses} WHERE id = ?`,
      values
    );
    if (changes === 0) return null;
    return this.findById(id);
  }

  delete(id) {
    const { changes } = this.db.run('DELETE FROM portfolios WHERE id = ?', [id]);
    return changes > 0;
  }
}

export default PortfolioRepository;
