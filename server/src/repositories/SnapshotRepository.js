import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export class SnapshotRepository {
  get db() {
    return getDb();
  }

  async findByPortfolio(portfolioId, { limit = 365, offset = 0 } = {}) {
    return this.db.all(
      `SELECT * FROM net_worth_snapshots WHERE portfolio_id = ?
       ORDER BY snapshot_date DESC LIMIT ? OFFSET ?`,
      [portfolioId, limit, offset]
    );
  }

  async findByDateRange(portfolioId, startDate, endDate) {
    return this.db.all(
      `SELECT * FROM net_worth_snapshots WHERE portfolio_id = ?
       AND snapshot_date BETWEEN ? AND ? ORDER BY snapshot_date ASC`,
      [portfolioId, startDate, endDate]
    );
  }

  async findLatest(portfolioId) {
    return this.db.get(
      `SELECT * FROM net_worth_snapshots WHERE portfolio_id = ?
       ORDER BY snapshot_date DESC LIMIT 1`,
      [portfolioId]
    );
  }

  async upsert(portfolioId, snapshotDate, data) {
    const existing = await this.db.get(
      'SELECT * FROM net_worth_snapshots WHERE portfolio_id = ? AND snapshot_date = ?',
      [portfolioId, snapshotDate]
    );

    if (existing) {
      const setClauses = Object.keys(data).map((col) => `${col} = ?`).join(', ');
      const values = [...Object.values(data), existing.id];
      await this.db.run(
        `UPDATE net_worth_snapshots SET ${setClauses} WHERE id = ?`,
        values
      );
      return { ...existing, ...data };
    }

    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      portfolio_id: portfolioId,
      snapshot_date: snapshotDate,
      ...data,
      created_at: now,
    };
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => record[col]);
    await this.db.run(
      `INSERT INTO net_worth_snapshots (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return record;
  }
}

export default SnapshotRepository;
