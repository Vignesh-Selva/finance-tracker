/**
 * amfi.js — Parse AMFI India master data for supplementary fund information.
 *
 * Source: https://www.amfiindia.com/spages/NAVAll.txt
 * Provides: scheme name, AMC, scheme code, latest NAV, date.
 *
 * Note: AMFI data updates once daily (end-of-day NAV).
 * Expense ratio and AUM are NOT directly available in NAVAll.txt;
 * they are available in AMFI monthly factsheets. This module parses
 * what's available and provides stubs for manual/scraped data.
 */

const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';

// In-memory cache
let amfiCache = null;
let amfiCacheTs = 0;
const AMFI_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Parsed AMFI record shape:
 * {
 *   schemeCode: string,
 *   schemeName: string,
 *   nav: number,
 *   date: string,
 *   isinGrowth: string,
 *   isinDividend: string,
 *   amc: string,
 *   category: string,
 *   subCategory: string,
 * }
 */

/**
 * Fetch and parse AMFI NAVAll.txt into structured records.
 * Uses CORS proxy since amfiindia.com doesn't allow direct browser fetches.
 * @returns {Promise<Map<string, Object>>} Map keyed by schemeCode
 */
export async function fetchAmfiData() {
  if (amfiCache && Date.now() - amfiCacheTs < AMFI_CACHE_TTL) {
    return amfiCache;
  }

  // Try direct fetch first; fall back to allorigins proxy if CORS blocks
  let text;
  try {
    const res = await fetch(AMFI_NAV_URL);
    if (!res.ok) throw new Error(`AMFI HTTP ${res.status}`);
    text = await res.text();
  } catch {
    // CORS fallback via allorigins
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(AMFI_NAV_URL)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`AMFI proxy error: ${res.status}`);
    text = await res.text();
  }

  const records = parseAmfiText(text);
  amfiCache = records;
  amfiCacheTs = Date.now();
  return records;
}

/**
 * Parse the AMFI NAVAll.txt flat file.
 * Format:
 *   Line with ";" → header row for a new AMC/category section
 *   Blank lines → separators
 *   Data lines: SchemeCode;ISINGrowth;ISINDiv;SchemeName;NAV;Date;...
 *
 * Section headers look like:
 *   "Open Ended Schemes(Debt Scheme - Banking and PSU Fund)"
 *   or AMC name lines (no semicolons, not blank)
 */
function parseAmfiText(text) {
  const map = new Map();
  const lines = text.split('\n');

  let currentAmc = '';
  let currentCategory = '';
  let currentSubCategory = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Section header: "Open Ended Schemes(...)" or "Close Ended Schemes(...)"
    if (line.startsWith('Open Ended Schemes') || line.startsWith('Close Ended Schemes')) {
      const match = line.match(/\((.+)\)/);
      if (match) {
        const parts = match[1].split(' - ');
        currentCategory = parts[0]?.trim() || '';
        currentSubCategory = parts.slice(1).join(' - ').trim();
      }
      continue;
    }

    // Skip the column header line
    if (line.startsWith('Scheme Code;')) continue;

    // Data line: contains semicolons
    if (line.includes(';')) {
      const parts = line.split(';');
      if (parts.length >= 5) {
        const schemeCode = parts[0].trim();
        const isinGrowth = parts[1]?.trim() || '';
        const isinDividend = parts[2]?.trim() || '';
        const schemeName = parts[3]?.trim() || '';
        const navStr = parts[4]?.trim() || '';
        const dateStr = parts[5]?.trim() || '';

        const nav = parseFloat(navStr);
        if (schemeCode && !isNaN(nav)) {
          map.set(schemeCode, {
            schemeCode,
            schemeName,
            nav,
            date: dateStr,
            isinGrowth,
            isinDividend,
            amc: currentAmc,
            category: currentCategory,
            subCategory: currentSubCategory,
          });
        }
      }
    } else {
      // Non-data, non-header line → likely AMC name
      currentAmc = line;
    }
  }

  return map;
}

/**
 * Look up a single fund from the AMFI master data.
 * @param {string} schemeCode
 * @returns {Promise<Object|null>}
 */
export async function getAmfiFundInfo(schemeCode) {
  const data = await fetchAmfiData();
  return data.get(schemeCode) || null;
}

/**
 * Search AMFI data by fund name (case-insensitive partial match).
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function searchAmfiFunds(query, limit = 20) {
  const data = await fetchAmfiData();
  const q = query.toLowerCase();
  const results = [];

  for (const [, record] of data) {
    if (record.schemeName.toLowerCase().includes(q)) {
      results.push(record);
      if (results.length >= limit) break;
    }
  }

  return results;
}

// ─── Benchmark approximate trailing returns ───────────────
// These are hardcoded approximate values updated periodically.
// In production, these would be fetched from NSE India or Yahoo Finance.

const BENCHMARK_RETURNS = {
  'Nifty 50 TRI': { return1Y: 7.5, return3Y: 13.0, return5Y: 16.5 },
  'Nifty Midcap 150 TRI': { return1Y: 12.0, return3Y: 22.0, return5Y: 26.0 },
  'Nifty Smallcap 250 TRI': { return1Y: 8.0, return3Y: 20.0, return5Y: 28.0 },
  'Nifty 500 TRI': { return1Y: 8.5, return3Y: 15.0, return5Y: 18.0 },
  'Nasdaq 100': { return1Y: 10.0, return3Y: 9.0, return5Y: 18.0 },
  'S&P 500': { return1Y: 8.0, return3Y: 8.5, return5Y: 14.0 },
};

// Category → Benchmark mapping
const CATEGORY_BENCHMARK_MAP = {
  'Large Cap': 'Nifty 50 TRI',
  'Large Cap Fund': 'Nifty 50 TRI',
  'Mid Cap': 'Nifty Midcap 150 TRI',
  'Mid Cap Fund': 'Nifty Midcap 150 TRI',
  'Small Cap': 'Nifty Smallcap 250 TRI',
  'Small Cap Fund': 'Nifty Smallcap 250 TRI',
  'Flexi Cap': 'Nifty 500 TRI',
  'Flexi Cap Fund': 'Nifty 500 TRI',
  'Multi Cap': 'Nifty 500 TRI',
  'Multi Cap Fund': 'Nifty 500 TRI',
  'ELSS': 'Nifty 500 TRI',
  'Value Fund': 'Nifty 500 TRI',
  'Focused Fund': 'Nifty 500 TRI',
  'Contra Fund': 'Nifty 500 TRI',
  'Dividend Yield Fund': 'Nifty 500 TRI',
  'International': 'Nasdaq 100',
};

/**
 * Get benchmark name for a fund category.
 * @param {string} category - Fund category string
 * @returns {string}
 */
export function getBenchmarkForCategory(category) {
  if (!category) return 'Nifty 500 TRI';

  // Try direct match first
  for (const [key, benchmark] of Object.entries(CATEGORY_BENCHMARK_MAP)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return benchmark;
    }
  }

  return 'Nifty 500 TRI'; // default
}

/**
 * Get benchmark returns.
 * @param {string} benchmarkName
 * @returns {{return1Y: number, return3Y: number, return5Y: number}}
 */
export function getBenchmarkReturns(benchmarkName) {
  return BENCHMARK_RETURNS[benchmarkName] || BENCHMARK_RETURNS['Nifty 500 TRI'];
}

/**
 * Compute alpha (fund return - benchmark return) for 1Y.
 * @param {number} fundReturn1Y
 * @param {string} category
 * @returns {{alpha: number, benchmarkName: string, benchmarkReturn: number}}
 */
export function computeAlpha(fundReturn1Y, category) {
  const benchmarkName = getBenchmarkForCategory(category);
  const benchmarkReturns = getBenchmarkReturns(benchmarkName);
  const alpha = fundReturn1Y !== null
    ? parseFloat((fundReturn1Y - benchmarkReturns.return1Y).toFixed(2))
    : null;

  return {
    alpha,
    benchmarkName,
    benchmarkReturn1Y: benchmarkReturns.return1Y,
    benchmarkReturn3Y: benchmarkReturns.return3Y,
    benchmarkReturn5Y: benchmarkReturns.return5Y,
  };
}

/**
 * Update benchmark returns manually (for when you fetch fresh data).
 * @param {string} benchmarkName
 * @param {{return1Y?: number, return3Y?: number, return5Y?: number}} returns
 */
export function updateBenchmarkReturns(benchmarkName, returns) {
  if (BENCHMARK_RETURNS[benchmarkName]) {
    Object.assign(BENCHMARK_RETURNS[benchmarkName], returns);
  }
}

/** Clear the AMFI cache. */
export function clearAmfiCache() {
  amfiCache = null;
  amfiCacheTs = 0;
}
