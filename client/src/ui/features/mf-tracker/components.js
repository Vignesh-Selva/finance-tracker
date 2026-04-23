/**
 * MF Tracker — UI Component renderers (vanilla JS)
 *
 * Renders FundCard, MetricChip, ChangeAlert, PortfolioSummary as HTML strings.
 */

import { FormatUtils } from '../../../utils/formatUtils.js';

// ─── Metric Chip ──────────────────────────────────────────

/**
 * Render a metric chip.
 * @param {string} label
 * @param {string|number} value
 * @param {'positive'|'negative'|'neutral'|'accent'} tone
 * @returns {string} HTML
 */
export function renderMetricChip(label, value, tone = 'neutral') {
  return `
    <div class="mft-chip">
      <span class="mft-chip-label">${label}</span>
      <span class="mft-chip-value ${tone}">${value}</span>
    </div>`;
}

// ─── Change Alert Badge ───────────────────────────────────

/**
 * Render change alert badges.
 * @param {Object} changes - { field: { severity, label } }
 * @param {string} schemeCode - For dismiss actions
 * @param {Set<string>} dismissed - Set of dismissed alert keys
 * @returns {string} HTML
 */
export function renderChangeAlerts(changes, schemeCode, dismissed) {
  const entries = Object.entries(changes).filter(([key]) => !dismissed.has(key));
  if (entries.length === 0) return '';

  const severityDots = { red: '🔴', yellow: '🟡', orange: '🟠', green: '🟢', info: '🔵' };

  const badges = entries.map(([key, change]) => `
    <span class="mft-alert mft-alert-${change.severity}">
      ${severityDots[change.severity] || ''} ${change.label}
      <span class="mft-alert-dismiss" data-dismiss-alert="${schemeCode}:${key}" title="Dismiss">✕</span>
    </span>`).join('');

  return `<div class="mft-alerts">${badges}</div>`;
}

// ─── Fund Card ────────────────────────────────────────────

/**
 * Determine status color based on fund health.
 * @param {Object} fund
 * @returns {'green'|'yellow'|'red'|'orange'}
 */
function getStatusColor(fund) {
  if (fund.return1Y === null) return 'yellow';
  if (fund.alpha !== null && fund.alpha > 2) return 'green';
  if (fund.return1Y < 0) return 'red';
  if (fund.alpha !== null && fund.alpha < -3) return 'orange';
  return 'green';
}

/**
 * Render a metric chip value with sign and color.
 */
function formatReturn(val) {
  if (val === null || val === undefined) return { text: 'N/A', tone: 'neutral' };
  const sign = val >= 0 ? '+' : '';
  return { text: `${sign}${val.toFixed(2)}%`, tone: val >= 0 ? 'positive' : 'negative' };
}

/**
 * Render a single fund card.
 * @param {Object} fund - Full fund data object
 * @param {Object} options - { holdings, changes, dismissed }
 * @returns {string} HTML
 */
export function renderFundCard(fund, options = {}) {
  const { holdings, changes = {}, dismissed = new Set() } = options;
  const status = getStatusColor(fund);
  const r1y = formatReturn(fund.return1Y);
  const r3y = formatReturn(fund.return3Y);
  const r5y = formatReturn(fund.return5Y);
  const alphaFmt = formatReturn(fund.alpha);

  const categoryBadge = fund.category
    ? `<span class="mft-badge mft-badge-category">${escapeHtml(fund.category)}</span>`
    : '';

  const amcLabel = fund.fundHouse
    ? `<span class="mft-badge-amc">${escapeHtml(fund.fundHouse)}</span>`
    : '';

  // Metric chips
  const chips = [
    renderMetricChip('NAV', `₹${fund.nav?.toFixed(2) || 'N/A'}`, 'accent'),
    renderMetricChip('1Y Return', r1y.text, r1y.tone),
    renderMetricChip('3Y CAGR', r3y.text, r3y.tone),
    renderMetricChip('5Y CAGR', r5y.text, r5y.tone),
  ];

  if (fund.alpha !== null && fund.alpha !== undefined) {
    chips.push(renderMetricChip('Alpha', alphaFmt.text, alphaFmt.tone));
  }

  if (fund.expenseRatio != null) {
    chips.push(renderMetricChip('Expense Ratio', `${fund.expenseRatio.toFixed(2)}%`, 'neutral'));
  }

  if (fund.aum != null) {
    chips.push(renderMetricChip('AUM', `₹${FormatUtils.formatLargeNumber(fund.aum)}`, 'neutral'));
  }

  // Change alerts
  const alertsHtml = renderChangeAlerts(changes, fund.schemeCode, dismissed);

  // Expanded details
  const detailItems = [];
  if (fund.navDate) detailItems.push({ label: 'NAV Date', value: fund.navDate });
  if (fund.fundManager) detailItems.push({ label: 'Fund Manager', value: escapeHtml(fund.fundManager) });
  if (fund.benchmarkName) detailItems.push({ label: 'Benchmark', value: escapeHtml(fund.benchmarkName) });
  if (fund.benchmarkReturn1Y != null) detailItems.push({ label: 'Benchmark 1Y', value: `${fund.benchmarkReturn1Y >= 0 ? '+' : ''}${fund.benchmarkReturn1Y.toFixed(2)}%` });
  if (fund.type) detailItems.push({ label: 'Scheme Type', value: escapeHtml(fund.type) });
  if (fund.schemeCode) detailItems.push({ label: 'Scheme Code', value: fund.schemeCode });

  const detailsGrid = detailItems.length > 0 ? `
    <div class="mft-detail-grid">
      ${detailItems.map(d => `
        <div class="mft-detail-item">
          <span class="mft-detail-label">${d.label}</span>
          <span class="mft-detail-value">${d.value}</span>
        </div>`).join('')}
    </div>` : '';

  // ─── TODO: Top Holdings (future) ─────────────────────────
  // Will fetch monthly portfolio disclosures from AMFI:
  //   https://www.amfiindia.com/modules/AccountingMasterReport
  // Parse Excel/PDF to extract stock name, sector, % allocation,
  // and diff last 2 months to detect new entries & exits.
  // ─────────────────────────────────────────────────────────

  // Holdings section (if portfolioContext provided)
  let holdingsHtml = '';
  if (holdings) {
    const gainClass = holdings.gainLoss >= 0 ? 'positive' : 'negative';
    const gainSign = holdings.gainLoss >= 0 ? '+' : '';
    holdingsHtml = `
      <div class="mft-holdings">
        <div class="mft-holdings-item">
          <span class="mft-holdings-label">Current Value</span>
          <span class="mft-holdings-value">${FormatUtils.formatCurrency(holdings.currentValue)}</span>
        </div>
        <div class="mft-holdings-item">
          <span class="mft-holdings-label">Gain / Loss</span>
          <span class="mft-holdings-value ${gainClass}">${gainSign}${FormatUtils.formatCurrency(holdings.gainLoss)}</span>
        </div>
        <div class="mft-holdings-item">
          <span class="mft-holdings-label">Return</span>
          <span class="mft-holdings-value ${gainClass}">${gainSign}${holdings.gainLossPct.toFixed(2)}%</span>
        </div>
      </div>`;
  }

  return `
    <div class="mft-card" data-scheme-code="${fund.schemeCode}" id="mft-card-${fund.schemeCode}">
      <div class="mft-card-header" data-toggle-card="${fund.schemeCode}">
        <span class="mft-status-dot ${status}"></span>
        <div class="mft-card-title">
          <div class="mft-card-name">${escapeHtml(fund.name)}</div>
          <div class="mft-card-sub">
            ${categoryBadge}
            ${amcLabel}
          </div>
        </div>
        <div class="mft-card-actions">
          <button class="mft-btn-icon" data-refresh-fund="${fund.schemeCode}" title="Refresh">🔄</button>
          <button class="mft-btn-icon" data-remove-fund="${fund.schemeCode}" title="Remove">✕</button>
          <span class="mft-expand-arrow">▼</span>
        </div>
      </div>

      <div class="mft-metrics">
        ${chips.join('')}
      </div>

      ${alertsHtml}

      <div class="mft-card-body">
        ${detailsGrid}
        ${holdingsHtml}
      </div>
    </div>`;
}

// ─── Portfolio Summary Bar ────────────────────────────────

/**
 * Render portfolio summary bar.
 * @param {Object} summary
 * @returns {string} HTML
 */
export function renderPortfolioSummary(summary) {
  // Build TER display with optional change indicator
  let terValue = '—';
  let terTone  = 'neutral';
  if (summary.avgExpenseRatio != null) {
    terValue = summary.avgExpenseRatio.toFixed(2) + '%';
    if (summary.terDelta != null && Math.abs(summary.terDelta) >= 0.001) {
      const arrow = summary.terDelta > 0 ? '▲' : '▼';
      const sign  = summary.terDelta > 0 ? '+' : '';
      terTone     = summary.terDelta > 0 ? 'negative' : 'positive'; // higher TER is bad
      terValue   += ` <span class="mft-ter-delta ${terTone}">${arrow}${sign}${summary.terDelta.toFixed(2)}%</span>`;
    }
  }

  const items = [
    { label: 'Funds Tracked', value: summary.fundCount || 0, tone: 'accent' },
    { label: 'Total Exposure', value: summary.totalExposure ? FormatUtils.formatCurrency(summary.totalExposure) : '—', tone: 'neutral' },
    { label: 'Wtd. Expense Ratio', value: terValue, tone: terTone, raw: true },
    { label: 'Avg 1Y Return', value: summary.avgReturn1Y != null ? `${summary.avgReturn1Y >= 0 ? '+' : ''}${summary.avgReturn1Y.toFixed(2)}%` : '—', tone: summary.avgReturn1Y != null ? (summary.avgReturn1Y >= 0 ? 'positive' : 'negative') : 'neutral' },
  ];

  if (summary.totalGainLoss != null) {
    const sign = summary.totalGainLoss >= 0 ? '+' : '';
    items.push({
      label: 'Total Gain/Loss',
      value: `${sign}${FormatUtils.formatCurrency(summary.totalGainLoss)}`,
      tone: summary.totalGainLoss >= 0 ? 'positive' : 'negative',
    });
  }

  return `
    <div class="mft-summary">
      ${items.map(item => `
        <div class="mft-summary-card">
          <div class="mft-summary-label">${item.label}</div>
          <div class="mft-summary-value mft-chip-value ${item.tone}">${item.value}</div>
        </div>`).join('')}
    </div>`;
}

// ─── Empty State ──────────────────────────────────────────

export function renderEmpty() {
  return `
    <div class="mft-empty">
      <div class="mft-empty-icon">📊</div>
      <div class="mft-empty-title">No funds tracked yet</div>
      <div class="mft-empty-sub">Search for a mutual fund above to start tracking</div>
    </div>`;
}

// ─── Card Loading Overlay ─────────────────────────────────

export function renderCardLoading(schemeCode) {
  return `
    <div class="mft-card" data-scheme-code="${schemeCode}">
      <div class="mft-card-loading">
        <div class="mft-spinner"></div>
        Loading fund data…
      </div>
    </div>`;
}

// ─── Utility ──────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
