import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchFXRates, convertCurrency, COMMON_CURRENCIES } from '../../src/services/fxRates.js';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
  _store: {},
};

global.localStorage = localStorageMock;

describe('fxRates', () => {
  beforeEach(() => {
    localStorageMock._store = {};
    localStorageMock.getItem.mockImplementation((key) => localStorageMock._store[key] || null);
    localStorageMock.setItem.mockImplementation((key, value) => { localStorageMock._store[key] = value; });
    localStorageMock.clear.mockImplementation(() => { localStorageMock._store = {}; });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFXRates', () => {
    it('fetches FX rates from API', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'success', rates: { INR: 83.5, USD: 1, EUR: 0.92 } })
      });

      const rates = await fetchFXRates('USD');
      expect(rates).toEqual({ INR: 83.5, USD: 1, EUR: 0.92 });
      expect(global.fetch).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
    });

    it('returns cached rates if within TTL', async () => {
      const cachedRates = { INR: 83.5, USD: 1, EUR: 0.92 };
      localStorage.setItem('fx_rates_cache_v1', JSON.stringify({ base: 'INR', rates: cachedRates, ts: Date.now() }));

      const rates = await fetchFXRates('INR');
      expect(rates).toEqual(cachedRates);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('ignores expired cache and fetches fresh rates', async () => {
      const oldTimestamp = Date.now() - (5 * 60 * 60 * 1000); // 5 hours ago
      localStorage.setItem('fx_rates_cache_v1', JSON.stringify({ base: 'INR', rates: { INR: 1 }, ts: oldTimestamp }));

      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'success', rates: { INR: 1, USD: 0.012 } })
      });

      const rates = await fetchFXRates('INR');
      expect(rates).toEqual({ INR: 1, USD: 0.012 });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('returns empty object on API failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const rates = await fetchFXRates('INR');
      expect(rates).toEqual({});
    });

    it('returns empty object on invalid API response', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'error' })
      });

      const rates = await fetchFXRates('INR');
      expect(rates).toEqual({});
    });

    it('saves fresh rates to cache', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'success', rates: { INR: 83.5, USD: 1 } })
      });

      await fetchFXRates('USD');
      const cached = JSON.parse(localStorage.getItem('fx_rates_cache_v1'));
      expect(cached).toEqual({ base: 'USD', rates: { INR: 83.5, USD: 1 }, ts: expect.any(Number) });
    });

    it('handles cache parse errors gracefully', async () => {
      localStorage.setItem('fx_rates_cache_v1', 'invalid-json');

      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'success', rates: { INR: 1 } })
      });

      const rates = await fetchFXRates('INR');
      expect(rates).toEqual({ INR: 1 });
    });

    it('defaults to INR base if not specified', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ result: 'success', rates: { INR: 1, USD: 0.012 } })
      });

      await fetchFXRates();
      expect(global.fetch).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/INR');
    });
  });

  describe('convertCurrency', () => {
    it('returns amount unchanged when currencies match', () => {
      expect(convertCurrency(1000, 'INR', 'INR', { INR: 1 })).toBe(1000);
    });

    it('converts from INR to USD', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(83500, 'INR', 'USD', rates)).toBeCloseTo(1000, 2);
    });

    it('converts from USD to INR', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(1000, 'USD', 'INR', rates)).toBeCloseTo(83500, 0);
    });

    it('converts between non-base currencies', () => {
      const rates = { INR: 83.5, USD: 1, EUR: 0.92 };
      expect(convertCurrency(1000, 'USD', 'EUR', rates)).toBeCloseTo(920, 0);
    });

    it('handles empty rates object', () => {
      expect(convertCurrency(1000, 'INR', 'USD', {})).toBe(1000);
    });

    it('handles null rates', () => {
      expect(convertCurrency(1000, 'INR', 'USD', null)).toBe(1000);
    });

    it('handles missing target currency rate', () => {
      const rates = { INR: 83.5 };
      expect(convertCurrency(1000, 'INR', 'USD', rates)).toBe(1000);
    });

    it('handles missing source currency rate', () => {
      const rates = { USD: 1 };
      expect(convertCurrency(1000, 'INR', 'USD', rates)).toBe(1000);
    });

    it('handles case-insensitive currency codes', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(1000, 'inr', 'usd', rates)).toBeCloseTo(11.98, 2);
      expect(convertCurrency(1000, 'InR', 'UsD', rates)).toBeCloseTo(11.98, 2);
    });

    it('handles negative amounts', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(-83500, 'INR', 'USD', rates)).toBeCloseTo(-1000, 2);
    });

    it('handles zero amount', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(0, 'INR', 'USD', rates)).toBe(0);
    });

    it('handles decimal amounts', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(8350.50, 'INR', 'USD', rates)).toBeCloseTo(100.006, 2);
    });

    it('handles very small amounts', () => {
      const rates = { INR: 83.5, USD: 1 };
      expect(convertCurrency(0.01, 'INR', 'USD', rates)).toBeCloseTo(0.00011976, 6);
    });

    it('handles very large amounts', () => {
      const rates = { INR: 83.5, USD: 1 };
      const result = convertCurrency(1e12, 'INR', 'USD', rates);
      expect(result).toBeGreaterThan(1e10);
      expect(result).toBeLessThan(1.2e10);
    });
  });

  describe('COMMON_CURRENCIES', () => {
    it('contains expected currency codes', () => {
      expect(COMMON_CURRENCIES).toContain('INR');
      expect(COMMON_CURRENCIES).toContain('USD');
      expect(COMMON_CURRENCIES).toContain('EUR');
      expect(COMMON_CURRENCIES).toContain('GBP');
      expect(COMMON_CURRENCIES).toContain('JPY');
    });

    it('is an array', () => {
      expect(Array.isArray(COMMON_CURRENCIES)).toBe(true);
    });

    it('has all uppercase codes', () => {
      COMMON_CURRENCIES.forEach(code => {
        expect(code).toBe(code.toUpperCase());
      });
    });
  });
});
