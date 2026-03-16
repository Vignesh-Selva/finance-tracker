import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  get db() {
    return getDb();
  }

  findAll(portfolioId) {
    return this.db.all(
      `SELECT * FROM ${this.tableName} WHERE portfolio_id = ? ORDER BY created_at DESC`,
      [portfolioId]
    );
  }

  findById(id) {
    return this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  create(data) {
    const now = new Date().toISOString();
    const record = { id: uuidv4(), ...data, created_at: now, updated_at: now };
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => record[col]);
    this.db.run(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return record;
  }

  update(id, data) {
    const now = new Date().toISOString();
    const updated = { ...data, updated_at: now };
    const setClauses = Object.keys(updated).map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(updated), id];
    const { changes } = this.db.run(
      `UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`,
      values
    );
    if (changes === 0) return null;
    return this.findById(id);
  }

  delete(id) {
    const { changes } = this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return changes > 0;
  }

  deleteAllByPortfolio(portfolioId) {
    const { changes } = this.db.run(
      `DELETE FROM ${this.tableName} WHERE portfolio_id = ?`,
      [portfolioId]
    );
    return changes;
  }

  count(portfolioId) {
    const result = this.db.get(
      `SELECT COUNT(id) as count FROM ${this.tableName} WHERE portfolio_id = ?`,
      [portfolioId]
    );
    return result?.count || 0;
  }
}

export default BaseRepository;
