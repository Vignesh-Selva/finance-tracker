/**
 * fundStore.js — Client-side state management for tracked mutual funds.
 *
 * Persists tracked fund list in localStorage. Orchestrates data fetching
 * from mfapi.in + AMFI, runs snapshot diffs, and computes portfolio metrics.
 */

import { getFundData } from '../../../services/mfapi.js';
import { getAmfiFundInfo, computeAlpha } from '../../../services/amfi.js';
import { processRefresh, getDismissedAlerts, deleteSnapshot } from '../../../services/mfSnapshot.js';

const TRACKED_FUNDS_KEY = 'mf_tracked_funds';
const PORTFOLIO_TER_KEY  = 'mf_portfolio_ter';

// ─── Tracked fund list persistence ────────────────────────

/**
 * Get the list of tracked scheme codes.
 * @returns {string[]}
 */
export function getTrackedFunds() {
  try {
    const raw = localStorage.getItem(TRACKED_FUNDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add a fund to the tracked list.
 * @param {string} schemeCode
 */
export function trackFund(schemeCode) {
  const tracked = getTrackedFunds();
  if (!tracked.includes(schemeCode)) {
    tracked.push(schemeCode);
    localStorage.setItem(TRACKED_FUNDS_KEY, JSON.stringify(tracked));
  }
}

/**
 * Remove a fund from the tracked list.
 * @param {string} schemeCode
 */
export function untrackFund(schemeCode) {
  const tracked = getTrackedFunds().filter(c => c !== schemeCode);
  localStorage.setItem(TRACKED_FUNDS_KEY, JSON.stringify(tracked));
  deleteSnapshot(schemeCode);
}

// ─── Manual data store (fund manager, notes, etc.) ────────

const MANUAL_DATA_KEY = 'mf_manual_data';

export function getManualData(schemeCode) {
  try {
    const raw = localStorage.getItem(MANUAL_DATA_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[schemeCode] || {};
  } catch {
    return {};
  }
}

export function setManualData(schemeCode, data) {
  try {
    const raw = localStorage.getItem(MANUAL_DATA_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[schemeCode] = { ...(all[schemeCode] || {}), ...data };
    localStorage.setItem(MANUAL_DATA_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save manual MF data:', e);
  }
}

// ─── Portfolio context ────────────────────────────────────

let _portfolioContext = [];

/**
 * Set portfolio context (units held, buy details).
 * @param {Array<{schemeCode: string, units: number, buyDate: string, buyNav: number}>} ctx
 */
export function setPortfolioContext(ctx) {
  _portfolioContext = Array.isArray(ctx) ? ctx : [];
}

export function getPortfolioContext() {
  return _portfolioContext;
}

/**
 * Compute holdings for a fund given portfolio context.
 */
function computeHoldings(schemeCode, currentNav) {
  const entry = _portfolioContext.find(p => String(p.schemeCode) === String(schemeCode));
  if (!entry || !entry.units) return null;

  const units = parseFloat(entry.units) || 0;
  const buyNav = parseFloat(entry.buyNav) || 0;
  const currentValue = parseFloat((units * currentNav).toFixed(2));
  const investedValue = parseFloat((units * buyNav).toFixed(2));
  const gainLoss = parseFloat((currentValue - investedValue).toFixed(2));
  const gainLossPct = investedValue > 0 ? parseFloat(((gainLoss / investedValue) * 100).toFixed(2)) : 0;

  return { units, buyNav, buyDate: entry.buyDate, currentValue, investedValue, gainLoss, gainLossPct };
}

// ─── Full fund data fetch (orchestrator) ──────────────────

/**
 * Fetch complete data for a single fund.
 * Combines mfapi.in + AMFI + manual data + snapshot diff + portfolio context.
 *
 * @param {string} schemeCode
 * @returns {Promise<Object>}
 */
export async function fetchFullFundData(schemeCode) {
  // Fetch from mfapi.in (NAV + returns)
  const fundData = await getFundData(schemeCode);

  // Try AMFI supplementary data
  let amfiInfo = null;
  try {
    amfiInfo = await getAmfiFundInfo(schemeCode);
  } catch (e) {
    console.warn(`AMFI fetch failed for ${schemeCode}:`, e);
  }

  // Manual data (fund manager, expense ratio overrides, etc.)
  const manual = getManualData(schemeCode);

  // Compute alpha vs benchmark
  const category = fundData.category || amfiInfo?.subCategory || manual.category || '';
  const { alpha, benchmarkName, benchmarkReturn1Y, benchmarkReturn3Y, benchmarkReturn5Y } =
    computeAlpha(fundData.return1Y, category);

  // Build unified fund object
  const fullData = {
    ...fundData,
    category: category || 'Equity',
    expenseRatio: manual.expenseRatio ?? null,
    aum: manual.aum ?? null,
    fundManager: manual.fundManager || null,
    alpha,
    benchmarkName,
    benchmarkReturn1Y,
    benchmarkReturn3Y,
    benchmarkReturn5Y,
    amfiInfo,
  };

  // Snapshot diff
  const snapshotData = {
    expenseRatio: fullData.expenseRatio,
    aum: fullData.aum,
    return1Y: fullData.return1Y,
    return3Y: fullData.return3Y,
    return5Y: fullData.return5Y,
    fundManager: fullData.fundManager,
    nav: fullData.nav,
    alpha: fullData.alpha,
  };
  const { changes, isFirstSnapshot } = processRefresh(schemeCode, snapshotData);

  // Portfolio holdings
  const holdings = computeHoldings(schemeCode, fullData.nav);

  // Dismissed alerts
  const dismissed = getDismissedAlerts(schemeCode);

  return {
    ...fullData,
    changes,
    isFirstSnapshot,
    holdings,
    dismissed,
  };
}

/**
 * Fetch data for all tracked funds in parallel.
 * @param {Function} onFundLoaded - Called as each fund loads: (schemeCode, data) => void
 * @returns {Promise<Object[]>}
 */
export async function fetchAllTrackedFunds(onFundLoaded) {
  const codes = getTrackedFunds();
  const results = [];

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 4;
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (code) => {
        try {
          const data = await fetchFullFundData(code);
          if (onFundLoaded) onFundLoaded(code, data);
          return data;
        } catch (err) {
          console.error(`Failed to fetch fund ${code}:`, err);
          if (onFundLoaded) onFundLoaded(code, { schemeCode: code, error: err.message });
          return { schemeCode: code, error: err.message };
        }
      })
    );
    results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
  }

  return results;
}

// ─── Portfolio TER snapshot ──────────────────────────────

export function loadPortfolioTerSnapshot() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_TER_KEY);
    return raw ? parseFloat(raw) : null;
  } catch {
    return null;
  }
}

export function savePortfolioTerSnapshot(ter) {
  try {
    if (ter != null) localStorage.setItem(PORTFOLIO_TER_KEY, String(ter));
  } catch (e) {
    console.warn('Failed to save portfolio TER snapshot:', e);
  }
}

// ─── Portfolio summary computation ────────────────────────

/**
 * Compute portfolio summary from an array of fund data.
 * @param {Object[]} funds
 * @returns {Object}
 */
export function computePortfolioSummary(funds) {
  const validFunds = funds.filter(f => !f.error);
  const fundCount = validFunds.length;

  // Weighted expense ratio by current value; falls back to simple average
  const fundsWithER = validFunds.filter(f => f.expenseRatio != null);
  let avgExpenseRatio = null;
  if (fundsWithER.length > 0) {
    const weighted = fundsWithER.filter(f => f.holdings?.currentValue > 0);
    if (weighted.length > 0) {
      const totalVal = weighted.reduce((s, f) => s + f.holdings.currentValue, 0);
      const wtdSum   = weighted.reduce((s, f) => s + (f.expenseRatio * f.holdings.currentValue), 0);
      avgExpenseRatio = totalVal > 0 ? parseFloat((wtdSum / totalVal).toFixed(3)) : null;
    } else {
      avgExpenseRatio = parseFloat((fundsWithER.reduce((s, f) => s + f.expenseRatio, 0) / fundsWithER.length).toFixed(3));
    }
  }

  // Average 1Y return
  const fundsWithReturn = validFunds.filter(f => f.return1Y != null);
  const avgReturn1Y = fundsWithReturn.length > 0
    ? fundsWithReturn.reduce((s, f) => s + f.return1Y, 0) / fundsWithReturn.length
    : null;

  // Total exposure and gain/loss from holdings
  let totalExposure = null;
  let totalGainLoss = null;
  const fundsWithHoldings = validFunds.filter(f => f.holdings);
  if (fundsWithHoldings.length > 0) {
    totalExposure = fundsWithHoldings.reduce((s, f) => s + f.holdings.currentValue, 0);
    totalGainLoss = fundsWithHoldings.reduce((s, f) => s + f.holdings.gainLoss, 0);
  }

  return {
    fundCount,
    avgExpenseRatio,
    avgReturn1Y,
    totalExposure,
    totalGainLoss,
  };
}

// ─── Data export (for parent app integration) ─────────────

/**
 * Export fund data in the integration API shape.
 * @param {Object[]} funds
 * @returns {Object[]}
 */
export function exportFundData(funds) {
  return funds.filter(f => !f.error).map(f => ({
    schemeCode: f.schemeCode,
    name: f.name,
    nav: f.nav,
    return1Y: f.return1Y,
    return3Y: f.return3Y,
    return5Y: f.return5Y,
    expenseRatio: f.expenseRatio,
    aum: f.aum,
    alpha: f.alpha,
    changes: f.changes,
    currentValue: f.holdings?.currentValue ?? null,
    gainLoss: f.holdings?.gainLoss ?? null,
    gainLossPct: f.holdings?.gainLossPct ?? null,
  }));
}
