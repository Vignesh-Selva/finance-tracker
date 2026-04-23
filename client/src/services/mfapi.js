/**
 * mfapi.js — Mutual Fund data service using mfapi.in
 *
 * Provides: fund search, NAV history fetch, return computation (1Y/3Y/5Y CAGR).
 * All numerical data is computed from actual NAV history — never estimated.
 */

const BASE_URL = 'https://api.mfapi.in/mf';

// In-memory cache for NAV history (keyed by schemeCode)
const navCache = new Map();
const NAV_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Search funds by name.
 * @param {string} query - Fund name search string
 * @returns {Promise<Array<{schemeCode: string, schemeName: string}>>}
 */
export async function searchFunds(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error(`mfapi search error: ${res.status}`);
  const data = await res.json();
  // API returns array of { schemeCode, schemeName }
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch full NAV history for a scheme. Results are cached in memory.
 * @param {string} schemeCode - AMFI scheme code
 * @returns {Promise<{meta: Object, data: Array<{date: string, nav: string}>}>}
 */
export async function fetchNavHistory(schemeCode) {
  const cached = navCache.get(schemeCode);
  if (cached && Date.now() - cached.ts < NAV_CACHE_TTL) {
    return cached.value;
  }

  const res = await fetch(`${BASE_URL}/${schemeCode}`);
  if (!res.ok) throw new Error(`mfapi error: ${res.status} for scheme ${schemeCode}`);
  const json = await res.json();

  if (!json.data || json.data.length === 0) {
    throw new Error(`No NAV data for scheme ${schemeCode}`);
  }

  navCache.set(schemeCode, { value: json, ts: Date.now() });
  return json;
}

/**
 * Get latest NAV for a scheme.
 * @param {string} schemeCode
 * @returns {Promise<{nav: number, date: string, schemeName: string, schemeCategory: string}>}
 */
export async function getLatestNav(schemeCode) {
  const json = await fetchNavHistory(schemeCode);
  const latest = json.data[0];
  return {
    nav: parseFloat(latest.nav),
    date: latest.date,
    schemeName: json.meta?.scheme_name || '',
    schemeCategory: json.meta?.scheme_category || '',
    schemeType: json.meta?.scheme_type || '',
    fundHouse: json.meta?.fund_house || '',
  };
}

/**
 * Parse mfapi date format "DD-MM-YYYY" → Date object (UTC midnight).
 */
function parseMfDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('-');
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
}

/**
 * Find NAV closest to a target date from the history array.
 * mfapi data is sorted newest-first.
 * @param {Array} navData - Array of {date, nav} from mfapi
 * @param {Date} targetDate - The target date
 * @param {number} toleranceDays - Max days tolerance (default 10)
 * @returns {{nav: number, date: string} | null}
 */
function findNavNearDate(navData, targetDate, toleranceDays = 10) {
  const targetTime = targetDate.getTime();
  let closest = null;
  let closestDiff = Infinity;

  for (const entry of navData) {
    const entryDate = parseMfDate(entry.date);
    const diff = Math.abs(entryDate.getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = entry;
    }
    // Since data is sorted newest-first, once we pass the target going backwards
    // and start getting further away, we can stop
    if (entryDate.getTime() < targetTime - toleranceDays * 86400000) break;
  }

  if (closest && closestDiff <= toleranceDays * 86400000) {
    return { nav: parseFloat(closest.nav), date: closest.date };
  }
  return null;
}

/**
 * Compute trailing returns from NAV history.
 * - 1Y: simple return
 * - 3Y, 5Y: CAGR
 *
 * @param {string} schemeCode
 * @returns {Promise<{return1Y: number|null, return3Y: number|null, return5Y: number|null, latestNav: number, navDate: string}>}
 */
export async function computeReturns(schemeCode) {
  const json = await fetchNavHistory(schemeCode);
  const navData = json.data;

  const latestEntry = navData[0];
  const latestNav = parseFloat(latestEntry.nav);
  const latestDate = parseMfDate(latestEntry.date);

  // Helper: compute CAGR
  const cagr = (navNow, navThen, years) => {
    if (!navThen || navThen <= 0 || years <= 0) return null;
    return (Math.pow(navNow / navThen, 1 / years) - 1) * 100;
  };

  // 1Y return (simple %)
  const date1Y = new Date(latestDate);
  date1Y.setFullYear(date1Y.getFullYear() - 1);
  const nav1Y = findNavNearDate(navData, date1Y);
  const return1Y = nav1Y ? ((latestNav - nav1Y.nav) / nav1Y.nav) * 100 : null;

  // 3Y CAGR
  const date3Y = new Date(latestDate);
  date3Y.setFullYear(date3Y.getFullYear() - 3);
  const nav3Y = findNavNearDate(navData, date3Y);
  const return3Y = nav3Y ? cagr(latestNav, nav3Y.nav, 3) : null;

  // 5Y CAGR
  const date5Y = new Date(latestDate);
  date5Y.setFullYear(date5Y.getFullYear() - 5);
  const nav5Y = findNavNearDate(navData, date5Y);
  const return5Y = nav5Y ? cagr(latestNav, nav5Y.nav, 5) : null;

  return {
    return1Y: return1Y !== null ? parseFloat(return1Y.toFixed(2)) : null,
    return3Y: return3Y !== null ? parseFloat(return3Y.toFixed(2)) : null,
    return5Y: return5Y !== null ? parseFloat(return5Y.toFixed(2)) : null,
    latestNav,
    navDate: latestEntry.date,
  };
}

/**
 * Get NAV history for chart rendering (date + nav pairs, chronological order).
 * @param {string} schemeCode
 * @param {number} years - How many years of history (default 3)
 * @returns {Promise<Array<{date: Date, nav: number}>>}
 */
export async function getNavTimeSeries(schemeCode, years = 3) {
  const json = await fetchNavHistory(schemeCode);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);

  return json.data
    .map(entry => ({ date: parseMfDate(entry.date), nav: parseFloat(entry.nav) }))
    .filter(entry => entry.date >= cutoff)
    .reverse(); // chronological order
}

/**
 * Full fund data fetch — combines latest NAV + computed returns.
 * @param {string} schemeCode
 * @returns {Promise<Object>}
 */
export async function getFundData(schemeCode) {
  const [navInfo, returns] = await Promise.all([
    getLatestNav(schemeCode),
    computeReturns(schemeCode),
  ]);

  return {
    schemeCode,
    name: navInfo.schemeName,
    category: navInfo.schemeCategory,
    type: navInfo.schemeType,
    fundHouse: navInfo.fundHouse,
    nav: returns.latestNav,
    navDate: returns.navDate,
    return1Y: returns.return1Y,
    return3Y: returns.return3Y,
    return5Y: returns.return5Y,
  };
}

/** Clear the in-memory NAV cache. */
export function clearCache() {
  navCache.clear();
}
