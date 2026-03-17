import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMutualFundNAV, fetchCryptoPrices, fetchStockPrice } from '../../src/services/priceFetcher.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock supabase (priceFetcher imports it)
vi.mock('../../src/services/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ data: [], error: null }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null }),
    }),
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchMutualFundNAV', () => {
  it('parses NAV from mfapi.in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        meta: { scheme_name: 'Test Fund' },
        data: [{ nav: '125.4567', date: '17-03-2026' }],
      }),
    });

    const result = await fetchMutualFundNAV('122639');
    expect(result.nav).toBeCloseTo(125.4567);
    expect(result.date).toBe('17-03-2026');
    expect(result.schemeName).toBe('Test Fund');
    expect(mockFetch).toHaveBeenCalledWith('https://api.mfapi.in/mf/122639/latest');
  });

  it('throws on empty data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await expect(fetchMutualFundNAV('000000')).rejects.toThrow('No NAV data');
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(fetchMutualFundNAV('122639')).rejects.toThrow('mfapi error: 500');
  });
});

describe('fetchCryptoPrices', () => {
  it('fetches INR prices for multiple coins', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bitcoin: { inr: 5500000 },
        ethereum: { inr: 220000 },
      }),
    });

    const prices = await fetchCryptoPrices(['BTC', 'ETH']);
    expect(prices.BTC).toBe(5500000);
    expect(prices.ETH).toBe(220000);
  });

  it('returns empty object for empty input', async () => {
    const prices = await fetchCryptoPrices([]);
    expect(prices).toEqual({});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles missing coins gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bitcoin: { inr: 5500000 } }),
    });

    const prices = await fetchCryptoPrices(['BTC', 'UNKNOWN']);
    expect(prices.BTC).toBe(5500000);
    expect(prices.UNKNOWN).toBeUndefined();
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(fetchCryptoPrices(['BTC'])).rejects.toThrow('CoinGecko error: 429');
  });
});

describe('fetchStockPrice', () => {
  it('fetches stock price via proxy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contents: JSON.stringify({
          chart: {
            result: [{
              meta: { regularMarketPrice: 65.5, currency: 'INR', symbol: 'GOLDBEES.NS' },
            }],
          },
        }),
      }),
    });

    const result = await fetchStockPrice('GOLDBEES');
    expect(result.price).toBe(65.5);
    expect(result.currency).toBe('INR');
    expect(result.symbol).toBe('GOLDBEES.NS');
  });

  it('appends .NS for Indian stocks without suffix', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contents: JSON.stringify({
          chart: { result: [{ meta: { regularMarketPrice: 100, currency: 'INR', symbol: 'TCS.NS' } }] },
        }),
      }),
    });

    await fetchStockPrice('TCS');
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('TCS.NS');
  });

  it('throws on proxy error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(fetchStockPrice('INVALID')).rejects.toThrow('Proxy error: 503');
  });
});
