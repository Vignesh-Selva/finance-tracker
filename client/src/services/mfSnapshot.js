/**
 * mfSnapshot.js — Snapshot & change detection engine for mutual funds.
 *
 * Stores fund data snapshots in localStorage. On each refresh, diffs
 * the new data against the stored snapshot and surfaces changes as alerts.
 */

const STORAGE_KEY_PREFIX = 'mf_snapshot_';
const DISMISSED_KEY = 'mf_dismissed_alerts';

// ─── Snapshot persistence ─────────────────────────────────

/**
 * Save a fund snapshot to localStorage.
 * @param {string} schemeCode
 * @param {Object} data - { expenseRatio, aum, return1Y, return3Y, return5Y, fundManager, nav, alpha, fetchedAt }
 */
export function saveSnapshot(schemeCode, data) {
  const snapshot = {
    ...data,
    fetchedAt: data.fetchedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + schemeCode, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Failed to save MF snapshot:', e);
  }
}

/**
 * Load a fund snapshot from localStorage.
 * @param {string} schemeCode
 * @returns {Object|null}
 */
export function loadSnapshot(schemeCode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + schemeCode);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Delete a fund snapshot.
 * @param {string} schemeCode
 */
export function deleteSnapshot(schemeCode) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + schemeCode);
  } catch (e) {
    console.warn('Failed to delete MF snapshot:', e);
  }
}

// ─── Diff engine ──────────────────────────────────────────

/**
 * @typedef {Object} Change
 * @property {*} from - Previous value
 * @property {*} to - New value
 * @property {number} delta - Numerical difference (if applicable)
 * @property {string} severity - 'red' | 'yellow' | 'orange' | 'green' | 'info'
 * @property {string} label - Human-readable description
 */

/**
 * Diff current fund data against stored snapshot.
 * @param {Object|null} prev - Previous snapshot (null if first time)
 * @param {Object} curr - Current fund data
 * @returns {Object<string, Change>} - Map of field → change descriptor
 */
export function diffSnapshot(prev, curr) {
  if (!prev) return {}; // No previous data → no changes to detect

  const changes = {};

  // Expense ratio change
  if (prev.expenseRatio != null && curr.expenseRatio != null) {
    const delta = curr.expenseRatio - prev.expenseRatio;
    if (Math.abs(delta) >= 0.01) {
      changes.expenseRatio = {
        from: prev.expenseRatio,
        to: curr.expenseRatio,
        delta: parseFloat(delta.toFixed(2)),
        severity: delta > 0 ? 'red' : 'green',
        label: delta > 0
          ? `Expense ratio increased by ${delta.toFixed(2)}%`
          : `Expense ratio decreased by ${Math.abs(delta).toFixed(2)}%`,
      };
    }
  }

  // AUM change
  if (prev.aum != null && curr.aum != null && prev.aum > 0) {
    const aumDelta = ((curr.aum - prev.aum) / prev.aum) * 100;
    if (Math.abs(aumDelta) >= 5) {
      changes.aum = {
        from: prev.aum,
        to: curr.aum,
        delta: parseFloat(aumDelta.toFixed(1)),
        severity: aumDelta < -10 ? 'yellow' : (aumDelta > 10 ? 'green' : 'info'),
        label: aumDelta < 0
          ? `AUM dropped ${Math.abs(aumDelta).toFixed(1)}%`
          : `AUM grew ${aumDelta.toFixed(1)}%`,
      };
    }
  }

  // 1Y Return change (significant shift)
  if (prev.return1Y != null && curr.return1Y != null) {
    const retDelta = curr.return1Y - prev.return1Y;
    if (Math.abs(retDelta) >= 2) {
      changes.return1Y = {
        from: prev.return1Y,
        to: curr.return1Y,
        delta: parseFloat(retDelta.toFixed(2)),
        severity: retDelta > 0 ? 'green' : 'yellow',
        label: retDelta > 0
          ? `1Y return improved by ${retDelta.toFixed(1)}pp`
          : `1Y return declined by ${Math.abs(retDelta).toFixed(1)}pp`,
      };
    }
  }

  // Fund manager change
  if (prev.fundManager && curr.fundManager &&
      prev.fundManager.toLowerCase() !== curr.fundManager.toLowerCase()) {
    changes.fundManager = {
      from: prev.fundManager,
      to: curr.fundManager,
      delta: null,
      severity: 'orange',
      label: `Fund manager changed: ${prev.fundManager} → ${curr.fundManager}`,
    };
  }

  // Alpha change (significant)
  if (prev.alpha != null && curr.alpha != null) {
    const alphaDelta = curr.alpha - prev.alpha;
    if (Math.abs(alphaDelta) >= 2) {
      changes.alpha = {
        from: prev.alpha,
        to: curr.alpha,
        delta: parseFloat(alphaDelta.toFixed(2)),
        severity: curr.alpha > 3 ? 'green' : (curr.alpha < -3 ? 'red' : 'info'),
        label: curr.alpha > 0
          ? `Strong alpha: +${curr.alpha.toFixed(1)}% vs benchmark`
          : `Negative alpha: ${curr.alpha.toFixed(1)}% vs benchmark`,
      };
    }
  }

  return changes;
}

// ─── Alert dismissal ──────────────────────────────────────

/**
 * Get set of dismissed alert keys for a fund.
 * @param {string} schemeCode
 * @returns {Set<string>}
 */
export function getDismissedAlerts(schemeCode) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return new Set(all[schemeCode] || []);
  } catch {
    return new Set();
  }
}

/**
 * Dismiss a specific alert for a fund.
 * @param {string} schemeCode
 * @param {string} alertKey - e.g. 'expenseRatio', 'aum'
 */
export function dismissAlert(schemeCode, alertKey) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[schemeCode]) all[schemeCode] = [];
    if (!all[schemeCode].includes(alertKey)) {
      all[schemeCode].push(alertKey);
    }
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to dismiss alert:', e);
  }
}

/**
 * Clear all dismissed alerts for a fund (called on new refresh).
 * @param {string} schemeCode
 */
export function clearDismissedAlerts(schemeCode) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const all = raw ? JSON.parse(raw) : {};
    delete all[schemeCode];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to clear dismissed alerts:', e);
  }
}

// ─── Full snapshot workflow ───────────────────────────────

/**
 * Process a fund refresh: diff against previous snapshot, save new snapshot, return changes.
 * @param {string} schemeCode
 * @param {Object} currentData - Fresh fund data
 * @returns {{changes: Object, isFirstSnapshot: boolean}}
 */
export function processRefresh(schemeCode, currentData) {
  const prev = loadSnapshot(schemeCode);
  const changes = diffSnapshot(prev, currentData);

  // Clear dismissed alerts only for fields that actually changed
  const changedKeys = Object.keys(changes);
  if (changedKeys.length > 0) {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      const all = raw ? JSON.parse(raw) : {};
      if (all[schemeCode]) {
        all[schemeCode] = all[schemeCode].filter(k => !changedKeys.includes(k));
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.warn('Failed to selectively clear dismissed alerts:', e);
    }
  }

  saveSnapshot(schemeCode, currentData);

  return {
    changes,
    isFirstSnapshot: !prev,
  };
}
