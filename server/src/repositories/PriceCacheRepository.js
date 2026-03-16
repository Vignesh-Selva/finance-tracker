import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

export class PriceCacheRepository {
  get db() {
    return getDb();
  }

  /**
   * Get cached price for an asset.
   * @param {string} assetType - 'mutual_fund', 'stock', or 'crypto'
   * @param {string} identifier - scheme_code, ticker, or coin_id
   * @param {string} [currency='INR']
   */
  findPrice(assetType, identifier, currency = 'INR') {
    return this.db.get(
      `SELECT * FROM price_cache WHERE asset_type = ? AND identifier = ? AND currency = ?`,
      [assetType, identifier, currency]
    );
  }

  /**
   * Get all cached prices for an asset type.
   */
  findAllByType(assetType) {
    return this.db.all(
      'SELECT * FROM price_cache WHERE asset_type = ? ORDER BY fetched_at DESC',
      [assetType]
    );
  }

  /**
   * Get all cached prices.
   */
  findAll() {
    return this.db.all('SELECT * FROM price_cache ORDER BY fetched_at DESC');
  }

  /**
   * Upsert a price — insert or update if exists.
   */
  upsert(assetType, identifier, price, currency = 'INR') {
    const now = new Date().toISOString();
    const existing = this.findPrice(assetType, identifier, currency);

    if (existing) {
      this.db.run(
        'UPDATE price_cache SET price = ?, fetched_at = ? WHERE id = ?',
        [price, now, existing.id]
      );
      return { ...existing, price, fetched_at: now };
    }

    const record = {
      id: uuidv4(),
      asset_type: assetType,
      identifier,
      price,
      currency,
      fetched_at: now,
    };
    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => record[col]);
    this.db.run(
      `INSERT INTO price_cache (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return record;
  }

  /**
   * Check if a price is stale (older than maxAgeMs).
   * @param {string} assetType
   * @param {string} identifier
   * @param {number} maxAgeMs - Max age in milliseconds (default 30 min)
   */
  isStale(assetType, identifier, maxAgeMs = 30 * 60 * 1000) {
    const cached = this.findPrice(assetType, identifier);
    if (!cached) return true;
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    return age > maxAgeMs;
  }

  /**
   * Delete all cached prices.
   */
  clearAll() {
    this.db.run('DELETE FROM price_cache');
  }

  /**
   * Delete stale prices older than maxAgeMs.
   */
  clearStale(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const { changes } = this.db.run(
      'DELETE FROM price_cache WHERE fetched_at < ?',
      [cutoff]
    );
    return changes;
  }
}

export default PriceCacheRepository;
