import Utilities from '../../utils/utils.js';
import { FinanceUtils } from '../../utils/financeUtils.js';
import api from '../../services/api.js';
import { searchFunds } from '../../services/mfapi.js';
import { dismissAlert } from '../../services/mfSnapshot.js';
import {
    renderFundCard, renderPortfolioSummary,
    renderEmpty, renderCardLoading,
} from './mf-tracker/components.js';
import {
    getTrackedFunds, trackFund, untrackFund,
    fetchFullFundData, fetchAllTrackedFunds,
    computePortfolioSummary, exportFundData,
    setPortfolioContext,
    loadPortfolioTerSnapshot, savePortfolioTerSnapshot,
} from './mf-tracker/fundStore.js';
import { renderOrderHistoryTab, preSelectOrderHistoryHolding } from './order-history/orderHistory.js';
import { computeDerivedPosition, groupOrdersByHolding } from '../../services/orderEngine.js';

// ─── Module state ──────────────────────────────────────────
let _activeTab = 'portfolio';     // 'portfolio' | 'tracker' | 'sip' | 'tax' | 'orderHistory'
let _mfShowClosed = false;
let _fundDataCache = [];
let _sortBy = 'name';
let _filterCategory = 'all';
let _searchDebounce = null;
let _onDataUpdate = null;
let _currentPortfolioId = null;
let _terDelta = null;             // TER change since last saved snapshot

// ─── Public: set integration props ────────────────────────
export function setMfTrackerProps(props = {}) {
    if (props.portfolioContext) setPortfolioContext(props.portfolioContext);
    if (props.onDataUpdate) _onDataUpdate = props.onDataUpdate;
}

// ─── Main render ──────────────────────────────────────────
export async function renderMutualFunds(portfolioId) {
    _currentPortfolioId = portfolioId;
    const container = document.getElementById('content-mutualFunds');

    container.innerHTML = buildPageShell();
    attachTabEvents(container, portfolioId);

    if (_activeTab === 'portfolio') {
        await renderPortfolioTab(container, portfolioId);
    // } else if (_activeTab === 'sip') {
    //     await renderSIPTab(container, portfolioId);
    // } else if (_activeTab === 'tax') {
    //     await renderTaxTab(container, portfolioId);
    } else if (_activeTab === 'orderHistory') {
        const content = container.querySelector('#mft-tab-content');
        await renderOrderHistoryTab(content, portfolioId, 'mutualFunds');
    // } else {
    //     await renderTrackerTab(container);
    }
}

// ─── Page Shell with tab bar ──────────────────────────────
function buildPageShell() {
    return `
        <div class="mft">
            <div class="section-header">
                <h2 class="page-title">Mutual Funds</h2>
            </div>
            <div class="mft-tab-bar" id="mft-tab-bar">
                <button class="mft-tab ${_activeTab === 'portfolio' ? 'active' : ''}" data-tab="portfolio">
                    📊 Portfolio
                </button>
                <button class="mft-tab ${_activeTab === 'orderHistory' ? 'active' : ''}" data-tab="orderHistory">
                    📋 Order History
                </button>
                <!-- <button class="mft-tab ${_activeTab === 'sip' ? 'active' : ''}" data-tab="sip">
                    📅 SIP Tracker
                </button> -->
                <!-- <button class="mft-tab ${_activeTab === 'tracker' ? 'active' : ''}" data-tab="tracker">
                    🔍 Fund Research
                </button> -->
                <!-- <button class="mft-tab ${_activeTab === 'tax' ? 'active' : ''}" data-tab="tax">
                    🧾 Tax Harvest
                </button> -->
            </div>
            <div id="mft-tab-content"></div>
        </div>`;
}

function attachTabEvents(container, portfolioId) {
    container.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            _activeTab = btn.dataset.tab;
            container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const content = container.querySelector('#mft-tab-content');
            content.innerHTML = '';
            if (_activeTab === 'portfolio') {
                await renderPortfolioTab(container, portfolioId);
            // } else if (_activeTab === 'sip') {
            //     await renderSIPTab(container, portfolioId);
            // } else if (_activeTab === 'tax') {
            //     await renderTaxTab(container, portfolioId);
            } else if (_activeTab === 'orderHistory') {
                await renderOrderHistoryTab(content, portfolioId, 'mutualFunds');
            // } else {
            //     await renderTrackerTab(container);
            }
        });
    });
}

function sortData(data, col, dir) {
    if (!col) return data;
    return [...data].sort((a, b) => {
        const av = parseFloat(a[col]) || (typeof a[col] === 'string' ? a[col].toLowerCase() : 0);
        const bv = parseFloat(b[col]) || (typeof b[col] === 'string' ? b[col].toLowerCase() : 0);
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

function th(label, col, sort) {
    const active = sort.col === col;
    const icon = active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲▼';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('mutualFunds','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

// ─── Tab 1: Portfolio (original Supabase tracker) ─────────
async function renderPortfolioTab(container, portfolioId) {
    const content = container.querySelector('#mft-tab-content');
    content.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [mfResp, ordersResp] = await Promise.all([
            api.mutualFunds.list(portfolioId),
            api.mfOrders.list(portfolioId),
        ]);
        const sort = window.app?.getSortState('mutualFunds') || { col: null, dir: 'asc' };
        const allFunds = mfResp?.data || [];
        const allOrders = ordersResp?.data || [];
        const ordersByHolding = groupOrdersByHolding(allOrders, 'mf_id');

        const resolvedFunds = allFunds.map(item => {
            const holdingOrders = ordersByHolding.get(item.id) || [];
            if (holdingOrders.length > 0) {
                const pos = computeDerivedPosition(holdingOrders, 'units');
                const firstOrderDate = holdingOrders.map(o => o.execution_date).filter(Boolean).sort()[0] || null;
                return { ...item, _derived: true, _units: pos.units, _invested: pos.invested, _firstOrderDate: firstOrderDate };
            }
            return { ...item, _derived: false, _units: parseFloat(item.units) || 0, _invested: parseFloat(item.invested) || 0, _firstOrderDate: null };
        });

        const visibleFunds = _mfShowClosed
            ? resolvedFunds
            : resolvedFunds.filter(f => !(f._derived && f._units === 0));
        const funds = sortData(visibleFunds, sort.col, sort.dir);

        const totalInvested = funds.reduce((s, f) => s + f._invested, 0);
        const totalCurrent = funds.reduce((s, f) => s + (parseFloat(f.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';
        const closedCount = resolvedFunds.filter(f => f._derived && f._units === 0).length;

        let tableRows = '';
        funds.forEach(item => {
            const invested = item._invested;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
            const xirr = FinanceUtils.xirrFromHolding(invested, current, item._firstOrderDate || item.created_at);
            const xirrCell = xirr !== null
                ? `<span class="${parseFloat(xirr.value) >= 0 ? 'value-positive' : 'value-negative'}" ${xirr.hint ? `title="${xirr.hint}"` : ''}>${xirr.value}%${xirr.hint ? '*' : ''}</span>`
                : '<span style="color:var(--text-muted)">—</span>';

            const isClosed = item._derived && item._units === 0;
            const rowStyle = isClosed ? 'opacity:0.5;' : '';

            let unitsCell;
            if (isClosed) {
                unitsCell = `<span class="badge badge-muted">Closed</span>`;
            } else if (!item._derived) {
                unitsCell = `
                    <span class="mono" style="font-size:12px;">${item._units.toFixed(4)}</span>
                    <span class="badge badge-muted" style="cursor:pointer;margin-left:4px;font-size:10px;"
                        data-legacy-fund="${item.id}" title="No order history — click to add orders">No history</span>`;
            } else {
                unitsCell = `<span class="mono" style="font-size:12px;">${item._units.toFixed(4)}</span>`;
            }

            tableRows += `
                <tr style="${rowStyle}">
                    <td data-label="Fund">${item.fund_name}</td>
                    <td data-label="Type">${item.fund_type || 'Equity'}</td>
                    <td data-label="Units">${unitsCell}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td data-label="XIRR" class="mono">${xirrCell}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('mutualFunds','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('mutualFunds','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        content.innerHTML = `
            <div class="section-header" style="margin-top:20px;">
                <div style="display:flex;gap:8px;align-items:center;">
                    ${closedCount > 0 ? `
                    <button class="btn btn-ghost btn-sm" id="mf-toggle-closed">
                        ${_mfShowClosed ? '📁 Hide Closed' : '📂 Show Closed'} (${closedCount})
                    </button>` : ''}
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('mutualFunds')">+ Add Fund</button>
                    <button class="btn btn-ghost" onclick="window.app.refreshMutualFundsLive()">🔄 Refresh NAV</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Invested</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(totalInvested)}</p>
                </div>
                <div class="stat-card">
                    <h3>Current Value</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(totalCurrent)}</p>
                </div>
                <div class="stat-card">
                    <h3>P / L</h3>
                    <p class="stat-value mono ${totalPL >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p>
                </div>
            </div>
            ${funds.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Fund', 'fund_name', sort)}
                        ${th('Type', 'fund_type', sort)}
                        <th>Units</th>
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'current', sort)}
                        <th title="Extended IRR — uses first order date if available, otherwise record creation date">XIRR</th>
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No mutual funds added yet.</p>'}
        `;

        const toggleClosedBtn = content.querySelector('#mf-toggle-closed');
        if (toggleClosedBtn) toggleClosedBtn.addEventListener('click', async () => {
            _mfShowClosed = !_mfShowClosed;
            await renderPortfolioTab(container, portfolioId);
        });

        content.querySelectorAll('[data-legacy-fund]').forEach(badge => {
            badge.addEventListener('click', () => {
                const fundId = badge.dataset.legacyFund;
                preSelectOrderHistoryHolding('mutualFunds', fundId);
                _activeTab = 'orderHistory';
                container.querySelectorAll('[data-tab]').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === 'orderHistory');
                });
                const tabContent = container.querySelector('#mft-tab-content');
                tabContent.innerHTML = '';
                renderOrderHistoryTab(tabContent, portfolioId, 'mutualFunds');
            });
        });
    } catch {
        content.innerHTML = '<div class="error-state"><p>Failed to load mutual funds.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

// ─── Tab 4: Tax Harvesting ─────────────────────────────

const LTCG_THRESHOLD_MONTHS = 12;
const LTCG_EXEMPTION = 100000;

function holdingAgeMonths(createdAt) {
    const start = new Date(createdAt);
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
}

async function renderTaxTab(container, portfolioId) {
    const content = container.querySelector('#mft-tab-content');
    content.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [mfResp, stResp] = await Promise.all([
            api.mutualFunds.list(portfolioId),
            api.stocks ? api.stocks.list(portfolioId) : Promise.resolve({ data: [] }),
        ]);
        const mfItems = (mfResp?.data || []).map(i => ({ ...i, assetType: 'MF' }));
        const stItems = (stResp?.data || []).map(i => ({ ...i, assetType: 'Stock', fund_name: i.stock_name }));
        const allItems = [...mfItems, ...stItems];

        let totalLTCG = 0;
        let totalSTCL = 0;
        let harvestableSTCL = 0;

        const rows = allItems.map(item => {
            const invested = parseFloat(item.invested) || 0;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const ageMonths = holdingAgeMonths(item.created_at);
            if (ageMonths === null) return '';

            const isLTCG = ageMonths >= LTCG_THRESHOLD_MONTHS;
            const tenure = ageMonths >= 12
                ? Math.floor(ageMonths / 12) + 'y ' + (ageMonths % 12) + 'm'
                : ageMonths + ' months';
            const monthsToLT = Math.max(0, LTCG_THRESHOLD_MONTHS - ageMonths);

            let tag = '';
            let action = '';
            let rowClass = '';

            if (pl < 0 && !isLTCG) {
                tag = '<span class="badge badge-red">STCL</span>';
                action = 'Harvest loss to offset gains';
                rowClass = 'value-negative';
                totalSTCL += Math.abs(pl);
                harvestableSTCL += Math.abs(pl);
            } else if (pl < 0 && isLTCG) {
                tag = '<span class="badge badge-red">LTCL</span>';
                action = 'Harvest long-term loss';
                totalSTCL += Math.abs(pl);
            } else if (pl > 0 && isLTCG) {
                totalLTCG += pl;
                if (pl > LTCG_EXEMPTION * 0.9) {
                    tag = '<span class="badge badge-yellow">LTCG Alert</span>';
                    action = 'Near exemption limit \u2014 consider booking in stages';
                    rowClass = '';
                } else {
                    tag = '<span class="badge badge-green">LTCG</span>';
                    action = 'Tax-free up to \u20b91L exemption';
                }
            } else if (pl > 0 && !isLTCG) {
                tag = '<span class="badge badge-yellow">STCG</span>';
                action = monthsToLT > 0 ? monthsToLT + ' months to LTCG' : 'Just became LTCG';
            } else {
                tag = '<span class="badge badge-muted">Neutral</span>';
                action = '\u2014';
            }

            return `
                <tr>
                    <td data-label="Asset">${item.fund_name}</td>
                    <td data-label="Type"><span class="badge badge-muted">${item.assetType}</span></td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)}</td>
                    <td data-label="Age">${tenure}</td>
                    <td data-label="Status">${tag}</td>
                    <td data-label="Action" class="${rowClass}" style="font-size:12px;">${action}</td>
                </tr>`;
        }).join('');

        const remainingLTCGExemption = Math.max(0, LTCG_EXEMPTION - totalLTCG);

        content.innerHTML = `
            <div class="cc-warning-banner" style="margin-top:16px;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:var(--text-primary);">
                Tenures use record creation date as a proxy for purchase date. Add actual purchase dates if available for accuracy.
            </div>
            <div class="stat-grid" style="margin-top:12px;">
                <div class="stat-card">
                    <h3>Accumulated LTCG</h3>
                    <p class="stat-value mono ${totalLTCG > LTCG_EXEMPTION ? 'value-negative' : 'value-positive'}">${Utilities.formatCurrency(totalLTCG)}</p>
                    <p class="stat-change">Limit: \u20b91,00,000 / yr</p>
                </div>
                <div class="stat-card">
                    <h3>Remaining Exemption</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(remainingLTCGExemption)}</p>
                </div>
                <div class="stat-card">
                    <h3>Harvestable STCL</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(harvestableSTCL)}</p>
                    <p class="stat-change">Can offset STCG</p>
                </div>
            </div>
            <div class="data-table-container" style="margin-top:16px;">
                <table class="data-table">
                    <thead><tr>
                        <th>Asset</th><th>Type</th><th>P/L</th>
                        <th>Age</th><th>Status</th><th>Action</th>
                    </tr></thead>
                    <tbody>${rows || '<tr><td colspan="6" class="empty-state">No holdings found.</td></tr>'}</tbody>
                </table>
            </div>`;
    } catch (error) {
        content.innerHTML = '<div class="error-state"><p>Failed to load tax data.</p></div>';
    }
}

// ─── Tab 3: SIP Tracker ───────────────────────────────────

const SIP_DAYS_KEY = 'sip_days_v1';

function getSIPDays() {
    try { return JSON.parse(localStorage.getItem(SIP_DAYS_KEY) || '{}'); } catch { return {}; }
}

function setSIPDay(fundId, day) {
    const days = getSIPDays();
    days[fundId] = day;
    localStorage.setItem(SIP_DAYS_KEY, JSON.stringify(days));
}

function nextSIPDate(dayOfMonth) {
    const day = parseInt(dayOfMonth);
    if (!day || day < 1 || day > 31) return null;
    const today = new Date();
    let candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
}

function estimateYTDSIP(sipAmount, startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const from = start > yearStart ? start : yearStart;
    const months = Math.max(0, (now.getFullYear() - from.getFullYear()) * 12 + now.getMonth() - from.getMonth());
    return sipAmount * months;
}

async function renderSIPTab(container, portfolioId) {
    const content = container.querySelector('#mft-tab-content');
    content.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.mutualFunds.list(portfolioId);
        const funds = resp?.data || [];
        const sipFunds = funds.filter(f => parseFloat(f.sip) > 0);

        const sipDays = getSIPDays();
        const monthlyTotal = sipFunds.reduce((s, f) => s + (parseFloat(f.sip) || 0), 0);
        const ytdTotal = sipFunds.reduce((s, f) => s + estimateYTDSIP(parseFloat(f.sip) || 0, f.created_at), 0);

        const rows = sipFunds.map(f => {
            const sip = parseFloat(f.sip) || 0;
            const day = sipDays[f.id] || '';
            const next = nextSIPDate(day);
            const nextLabel = next ? next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
            const ytd = estimateYTDSIP(sip, f.created_at);
            const daysUntil = next ? Math.ceil((next - new Date()) / 86400000) : null;
            const urgency = daysUntil !== null && daysUntil <= 5 ? 'value-negative' : daysUntil !== null && daysUntil <= 10 ? '' : 'value-neutral';
            return `
                <tr>
                    <td data-label="Fund">${f.fund_name}</td>
                    <td data-label="SIP Amount" class="mono">${Utilities.formatCurrency(sip)}</td>
                    <td data-label="SIP Day">
                        <input type="number" min="1" max="31" value="${day}" placeholder="1–31"
                            class="form-input" style="width:64px;padding:5px 8px;font-size:13px;"
                            onchange="window._setSIPDay('${f.id}', this.value)">
                    </td>
                    <td data-label="Next Date" class="mono ${urgency}">${nextLabel}${daysUntil !== null ? ` <small>(${daysUntil}d)</small>` : ''}</td>
                    <td data-label="YTD Invested" class="mono">${Utilities.formatCurrency(ytd)}</td>
                </tr>`;
        }).join('');

        content.innerHTML = `
            <div class="stat-grid" style="margin-top:20px;">
                <div class="stat-card">
                    <h3>Monthly SIP Outflow</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(monthlyTotal)}</p>
                </div>
                <div class="stat-card">
                    <h3>YTD SIP Invested</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(ytdTotal)}</p>
                    <p class="stat-change">Jan – ${new Date().toLocaleDateString('en-IN', { month: 'short' })} ${new Date().getFullYear()}</p>
                </div>
                <div class="stat-card">
                    <h3>Active SIPs</h3>
                    <p class="stat-value">${sipFunds.length}</p>
                </div>
            </div>
            ${sipFunds.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Fund</th><th>SIP Amount</th>
                        <th title="Set day of month for SIP payment">SIP Day</th>
                        <th>Next Date</th><th>YTD Invested</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No SIPs set. Edit a fund and enter a monthly SIP amount to track here.</p>'}`;

        window._setSIPDay = (id, day) => {
            setSIPDay(id, parseInt(day) || '');
            renderSIPTab(container, portfolioId);
        };
    } catch (error) {
        content.innerHTML = '<div class="error-state"><p>Failed to load SIP data.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

// ─── Tab 2: Fund Research (mfapi.in tracker) ──────────────
async function renderTrackerTab(container) {
    const content = container.querySelector('#mft-tab-content');
    content.innerHTML = buildTrackerShell();
    attachTrackerShellEvents(content);

    const tracked = getTrackedFunds();
    if (tracked.length === 0) {
        renderFundList(content, []);
        return;
    }

    const listEl = content.querySelector('#mft-fund-list');
    if (listEl) listEl.innerHTML = tracked.map(c => renderCardLoading(c)).join('');

    try {
        _fundDataCache = [];
        _terDelta = null;
        await fetchAllTrackedFunds((code, data) => {
            _fundDataCache.push(data);
            const loadingCard = listEl?.querySelector(`[data-scheme-code="${code}"]`);
            if (loadingCard && !data.error) {
                loadingCard.outerHTML = renderFundCard(data, {
                    holdings: data.holdings,
                    changes: data.changes,
                    dismissed: data.dismissed,
                });
                attachCardEvents(content, code);
            } else if (loadingCard && data.error) {
                loadingCard.outerHTML = `
                    <div class="mft-card" data-scheme-code="${code}" style="border-color: var(--red);">
                        <div class="mft-card-header">
                            <span class="mft-status-dot red"></span>
                            <div class="mft-card-title">
                                <div class="mft-card-name">Scheme ${code}</div>
                                <div class="mft-card-sub" style="color: var(--red); font-size: 0.8rem;">${data.error}</div>
                            </div>
                            <div class="mft-card-actions">
                                <button class="mft-btn-icon" data-refresh-fund="${code}" title="Retry">🔄</button>
                                <button class="mft-btn-icon" data-remove-fund="${code}" title="Remove">✕</button>
                            </div>
                        </div>
                    </div>`;
                attachCardEvents(content, code);
            }
            updateTrackerSummary(content);
        });

        // Compute portfolio TER delta vs last saved snapshot, then save new value
        const summary = computePortfolioSummary(_fundDataCache.filter(f => !f.error));
        if (summary.avgExpenseRatio != null) {
            const prevTer = loadPortfolioTerSnapshot();
            _terDelta = prevTer != null
                ? parseFloat((summary.avgExpenseRatio - prevTer).toFixed(3))
                : null;
            savePortfolioTerSnapshot(summary.avgExpenseRatio);
            updateTrackerSummary(content);
        }

        if (_onDataUpdate) _onDataUpdate(exportFundData(_fundDataCache));
    } catch (error) {
        console.error('MF tracker render error:', error);
        if (listEl) {
            listEl.innerHTML = `<div class="error-state"><p>Failed to load fund data: ${error.message}</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>`;
        }
    }
}

// ─── Tracker Shell HTML ───────────────────────────────────
function buildTrackerShell() {
    return `
        <div style="margin-top:20px;">
            <div class="section-header">
                <div></div>
                <div style="display:flex; gap:10px;">
                    <button class="mft-btn mft-btn-primary" id="mft-refresh-all">🔄 Refresh All</button>
                    <button class="mft-btn mft-btn-ghost" id="mft-export-json">📤 Export</button>
                </div>
            </div>

            <div id="mft-summary"></div>

            <div class="mft-controls">
                <div class="mft-search-box">
                    <span class="mft-search-icon">🔍</span>
                    <input type="text" class="mft-search-input" id="mft-search"
                           placeholder="Search & add fund (e.g. Motilal Oswal Midcap)…"
                           autocomplete="off" />
                    <div class="mft-search-results" id="mft-search-results" style="display:none;"></div>
                </div>
                <div class="mft-filter-group" id="mft-filters"></div>
                <select class="mft-sort-select" id="mft-sort">
                    <option value="name">Sort: Name</option>
                    <option value="return1Y">Sort: 1Y Return</option>
                    <option value="alpha">Sort: Alpha</option>
                    <option value="expenseRatio">Sort: Expense Ratio</option>
                </select>
            </div>

            <div id="mft-fund-list"></div>
            <div class="last-refreshed" id="mft-last-refreshed"></div>
        </div>`;
}

// ─── Tracker Shell event wiring ───────────────────────────
function attachTrackerShellEvents(content) {
    const searchInput = content.querySelector('#mft-search');
    const searchResults = content.querySelector('#mft-search-results');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(_searchDebounce);
            const query = e.target.value.trim();
            if (query.length < 2) { searchResults.style.display = 'none'; return; }
            _searchDebounce = setTimeout(() => runSearch(query, searchResults, content), 350);
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(() => { searchResults.style.display = 'none'; }, 200);
        });
        searchInput.addEventListener('focus', () => {
            if (searchResults.children.length > 0) searchResults.style.display = 'block';
        });
    }

    const sortSelect = content.querySelector('#mft-sort');
    if (sortSelect) {
        sortSelect.value = _sortBy;
        sortSelect.addEventListener('change', (e) => {
            _sortBy = e.target.value;
            rerenderFundList(content);
        });
    }

    const refreshBtn = content.querySelector('#mft-refresh-all');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '⏳ Refreshing…';

            // Auto-populate from Portfolio (Supabase) scheme codes
            if (_currentPortfolioId) {
                try {
                    const resp = await api.mutualFunds.list(_currentPortfolioId);
                    const portfolioFunds = resp?.data || [];
                    let addedCount = 0;
                    for (const fund of portfolioFunds) {
                        if (fund.scheme_code) {
                            const code = String(fund.scheme_code);
                            if (!getTrackedFunds().includes(code)) {
                                trackFund(code);
                                addedCount++;
                            }
                        }
                    }
                    if (addedCount > 0) {
                        Utilities.showNotification(`Auto-added ${addedCount} fund(s) from portfolio`, 'info');
                    }
                } catch (err) {
                    console.warn('Auto-populate from portfolio failed:', err);
                }
            }

            await renderMutualFunds(_currentPortfolioId);
        });
    }

    const exportBtn = content.querySelector('#mft-export-json');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = exportFundData(_fundDataCache);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mf-tracker-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Utilities.showNotification('Fund data exported!', 'success');
        });
    }
}

// ─── Search ───────────────────────────────────────────────
async function runSearch(query, resultsEl, content) {
    try {
        const results = await searchFunds(query);
        const tracked = getTrackedFunds();

        if (results.length === 0) {
            resultsEl.innerHTML = '<div class="mft-search-item" style="color: var(--text-muted);">No funds found</div>';
        } else {
            resultsEl.innerHTML = results.slice(0, 15).map(r => {
                const isTracked = tracked.includes(String(r.schemeCode));
                return `
                    <div class="mft-search-item" data-add-fund="${r.schemeCode}" ${isTracked ? 'style="opacity:0.5;"' : ''}>
                        <div>${r.schemeName} ${isTracked ? '✓' : ''}</div>
                        <div class="mft-search-item-code">${r.schemeCode}</div>
                    </div>`;
            }).join('');

            resultsEl.querySelectorAll('[data-add-fund]').forEach(el => {
                el.addEventListener('mousedown', async (e) => {
                    e.preventDefault();
                    const code = el.dataset.addFund;
                    if (getTrackedFunds().includes(code)) return;

                    trackFund(code);
                    resultsEl.style.display = 'none';
                    content.querySelector('#mft-search').value = '';

                    const listEl = content.querySelector('#mft-fund-list');
                    const emptyEl = listEl?.querySelector('.mft-empty');
                    if (emptyEl) emptyEl.remove();
                    if (listEl) listEl.insertAdjacentHTML('beforeend', renderCardLoading(code));

                    try {
                        const data = await fetchFullFundData(code);
                        _fundDataCache.push(data);
                        const loadingCard = listEl?.querySelector(`[data-scheme-code="${code}"]`);
                        if (loadingCard) {
                            loadingCard.outerHTML = renderFundCard(data, {
                                holdings: data.holdings,
                                changes: data.changes,
                                dismissed: data.dismissed,
                            });
                            attachCardEvents(content, code);
                        }
                        updateTrackerSummary(content);
                        Utilities.showNotification(`Added: ${data.name}`, 'success');
                    } catch (err) {
                        Utilities.showNotification(`Failed to fetch fund ${code}: ${err.message}`, 'error');
                    }
                });
            });
        }
        resultsEl.style.display = 'block';
    } catch (err) {
        console.error('Search error:', err);
        resultsEl.innerHTML = '<div class="mft-search-item" style="color: var(--red);">Search failed</div>';
        resultsEl.style.display = 'block';
    }
}

// ─── Fund list rendering ──────────────────────────────────
function renderFundList(content, funds) {
    const listEl = content.querySelector('#mft-fund-list');
    if (!listEl) return;

    if (funds.length === 0) {
        listEl.innerHTML = renderEmpty();
        updateTrackerSummary(content);
        updateFilters(content);
        return;
    }

    const filtered = filterFunds(sortFunds(funds));
    listEl.innerHTML = filtered.map(f => {
        if (f.error) return `
            <div class="mft-card" data-scheme-code="${f.schemeCode}" id="mft-card-${f.schemeCode}" style="border-color: var(--red);">
                <div class="mft-card-header">
                    <span class="mft-status-dot red"></span>
                    <div class="mft-card-title">
                        <div class="mft-card-name">Scheme ${f.schemeCode}</div>
                        <div class="mft-card-sub" style="color: var(--red); font-size: 0.8rem;">${f.error}</div>
                    </div>
                    <div class="mft-card-actions">
                        <button class="mft-btn-icon" data-refresh-fund="${f.schemeCode}" title="Retry">🔄</button>
                        <button class="mft-btn-icon" data-remove-fund="${f.schemeCode}" title="Remove">✕</button>
                    </div>
                </div>
            </div>`;
        return renderFundCard(f, { holdings: f.holdings, changes: f.changes, dismissed: f.dismissed });
    }).join('');
    filtered.forEach(f => attachCardEvents(content, f.schemeCode));
    updateTrackerSummary(content);
    updateFilters(content);
}

function rerenderFundList(content) { renderFundList(content, _fundDataCache); }

// ─── Sort / Filter ────────────────────────────────────────
function sortFunds(funds) {
    return [...funds].sort((a, b) => {
        switch (_sortBy) {
            case 'return1Y':     return (b.return1Y ?? -999) - (a.return1Y ?? -999);
            case 'alpha':        return (b.alpha ?? -999) - (a.alpha ?? -999);
            case 'expenseRatio': return (a.expenseRatio ?? 999) - (b.expenseRatio ?? 999);
            case 'aum':          return (b.aum ?? 0) - (a.aum ?? 0);
            default:             return (a.name || '').localeCompare(b.name || '');
        }
    });
}

function filterFunds(funds) {
    if (_filterCategory === 'all') return funds;
    return funds.filter(f => (f.category || '').toLowerCase().includes(_filterCategory.toLowerCase()));
}

function updateFilters(content) {
    const filtersEl = content.querySelector('#mft-filters');
    if (!filtersEl) return;
    const categories = [...new Set(_fundDataCache.filter(f => f.category).map(f => f.category))];
    filtersEl.innerHTML = [
        `<button class="mft-pill ${_filterCategory === 'all' ? 'active' : ''}" data-filter="all">All</button>`,
        ...categories.map(c => `<button class="mft-pill ${_filterCategory === c ? 'active' : ''}" data-filter="${c}">${c}</button>`),
    ].join('');
    filtersEl.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => { _filterCategory = btn.dataset.filter; rerenderFundList(content); });
    });
}

// ─── Summary update ───────────────────────────────────────
function updateTrackerSummary(content) {
    const summaryEl = content.querySelector('#mft-summary');
    if (!summaryEl) return;
    summaryEl.innerHTML = renderPortfolioSummary({ ...computePortfolioSummary(_fundDataCache.filter(f => !f.error)), terDelta: _terDelta });
    const lastEl = content.querySelector('#mft-last-refreshed');
    if (lastEl && _fundDataCache.length > 0) lastEl.textContent = `Last refreshed: ${new Date().toLocaleTimeString()}`;
}

// ─── Card event wiring ────────────────────────────────────
function attachCardEvents(content, schemeCode) {
    const card = content.querySelector(`#mft-card-${schemeCode}`);
    if (!card) return;

    const header = card.querySelector('[data-toggle-card]');
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.mft-card-actions')) return;
            card.classList.toggle('expanded');
        });
    }

    const refreshBtn = card.querySelector(`[data-refresh-fund="${schemeCode}"]`);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            refreshBtn.textContent = '⏳';
            try {
                const data = await fetchFullFundData(schemeCode);
                const idx = _fundDataCache.findIndex(f => f.schemeCode === schemeCode);
                if (idx >= 0) _fundDataCache[idx] = data; else _fundDataCache.push(data);
                card.outerHTML = renderFundCard(data, { holdings: data.holdings, changes: data.changes, dismissed: data.dismissed });
                attachCardEvents(content, schemeCode);
                updateTrackerSummary(content);
                Utilities.showNotification(`Refreshed: ${data.name}`, 'success');
            } catch (err) {
                Utilities.showNotification(`Refresh failed: ${err.message}`, 'error');
                refreshBtn.textContent = '🔄';
            }
        });
    }

    const removeBtn = card.querySelector(`[data-remove-fund="${schemeCode}"]`);
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!await Utilities.showConfirm('Remove this fund from tracking?')) return;
            untrackFund(schemeCode);
            _fundDataCache = _fundDataCache.filter(f => f.schemeCode !== schemeCode);
            card.remove();
            updateTrackerSummary(content);
            const listEl = content.querySelector('#mft-fund-list');
            if (_fundDataCache.length === 0 && listEl) listEl.innerHTML = renderEmpty();
        });
    }

    card.querySelectorAll('[data-dismiss-alert]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const [code, key] = btn.dataset.dismissAlert.split(':');
            dismissAlert(code, key);
            const cached = _fundDataCache.find(f => f.schemeCode === code);
            if (cached?.dismissed instanceof Set) cached.dismissed.add(key);
            btn.closest('.mft-alert')?.remove();
        });
    });
}

export default renderMutualFunds;
