import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchFunds,
  fetchNavHistory,
  getLatestNav,
  computeReturns,
  getFundData,
} from '../../src/services/mfapi.js';

const NAV_DATA = [
  { date: '01-04-2025', nav: '110.00' },
  { date: '01-04-2024', nav: '100.00' },
  { date: '01-04-2022', nav: '90.00' },
  { date: '01-04-2020', nav: '80.00' },
];

const META = {
  scheme_name: 'Test Growth Fund',
  scheme_category: 'Equity Scheme - Large Cap Fund',
  scheme_type: 'Open Ended Schemes',
  fund_house: 'Test AMC',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('searchFunds', () => {
  it('returns empty array for short queries', async () => {
    expect(await searchFunds('')).toEqual([]);
    expect(await searchFunds('a')).toEqual([]);
  });

  it('fetches and returns fund list', async () => {
    const mockData = [{ schemeCode: '119551', schemeName: 'Test Fund' }];
    fetch.mockResolvedValue({ ok: true, json: async () => mockData });

    const result = await searchFunds('test fund');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('test%20fund'));
  });

  it('returns empty array when API response is not an array', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ error: true }) });
    expect(await searchFunds('test')).toEqual([]);
  });

  it('throws on non-OK response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(searchFunds('test')).rejects.toThrow('mfapi search error: 500');
  });
});

describe('fetchNavHistory', () => {
  it('fetches NAV history from API', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ meta: META, data: NAV_DATA }),
    });

    const result = await fetchNavHistory('119551');
    expect(result.data).toEqual(NAV_DATA);
    expect(result.meta.scheme_name).toBe('Test Growth Fund');
  });

  it('throws when no NAV data returned', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ meta: META, data: [] }) });
    await expect(fetchNavHistory('empty-scheme')).rejects.toThrow('No NAV data');
  });

  it('throws on non-OK response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchNavHistory('000')).rejects.toThrow('mfapi error: 404');
  });
});

describe('getLatestNav', () => {
  it('returns parsed NAV and metadata', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ meta: META, data: NAV_DATA }),
    });

    const result = await getLatestNav('119551');
    expect(result.nav).toBe(110.0);
    expect(result.date).toBe('01-04-2025');
    expect(result.schemeName).toBe('Test Growth Fund');
    expect(result.fundHouse).toBe('Test AMC');
  });
});

describe('computeReturns', () => {
  it('computes 1Y return', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ meta: META, data: NAV_DATA }),
    });

    const result = await computeReturns('119551');
    expect(result.return1Y).not.toBeNull();
    expect(typeof result.return1Y).toBe('number');
    expect(result.latestNav).toBe(110.0);
    expect(result.navDate).toBe('01-04-2025');
  });

  it('returns null returns when not enough history', async () => {
    const thinData = [{ date: '01-04-2025', nav: '110.00' }];
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ meta: META, data: thinData }),
    });

    const result = await computeReturns('thin-scheme');
    expect(result.return1Y).toBeNull();
    expect(result.return3Y).toBeNull();
    expect(result.return5Y).toBeNull();
  });
});

describe('getFundData', () => {
  it('merges NAV info and returns into unified object', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ meta: META, data: NAV_DATA }),
    });

    const result = await getFundData('119551');
    expect(result.schemeCode).toBe('119551');
    expect(result.name).toBe('Test Growth Fund');
    expect(result.nav).toBe(110.0);
    expect(result).toHaveProperty('return1Y');
    expect(result).toHaveProperty('return3Y');
    expect(result).toHaveProperty('return5Y');
  });
});
