import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';
import { renderOrderHistoryTab, preSelectOrderHistoryHolding } from './order-history/orderHistory.js';
import { computeDerivedPosition, groupOrdersByHolding } from '../../services/orderEngine.js';

// ── Module state ───────────────────────────────────────────
let _cryptoActiveTab = 'portfolio';
let _cryptoShowClosed = false;

// ── Helpers ────────────────────────────────────────────────
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
    return `<th class="${cls}" onclick="window.app.setSortState('crypto','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

// ── Main render ────────────────────────────────────────────
export async function renderCrypto(portfolioId) {
    const container = document.getElementById('content-crypto');
    container.innerHTML = _buildShell();
    _attachTabEvents(container, portfolioId);

    const tabContent = container.querySelector('#cr-tab-content');
    if (_cryptoActiveTab === 'portfolio') {
        await _renderPortfolioTab(tabContent, container, portfolioId);
    } else {
        await renderOrderHistoryTab(tabContent, portfolioId, 'crypto');
    }
}

function _buildShell() {
    return `
        <div class="mft">
            <div class="section-header">
                <h2 class="page-title">Crypto</h2>
            </div>
            <div class="mft-tab-bar" id="cr-tab-bar">
                <button class="mft-tab ${_cryptoActiveTab === 'portfolio' ? 'active' : ''}" data-tab="portfolio">
                    📊 Portfolio
                </button>
                <button class="mft-tab ${_cryptoActiveTab === 'orderHistory' ? 'active' : ''}" data-tab="orderHistory">
                    📋 Order History
                </button>
            </div>
            <div id="cr-tab-content"></div>
        </div>`;
}

function _attachTabEvents(container, portfolioId) {
    container.querySelectorAll('#cr-tab-bar [data-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            _cryptoActiveTab = btn.dataset.tab;
            container.querySelectorAll('#cr-tab-bar [data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabContent = container.querySelector('#cr-tab-content');
            tabContent.innerHTML = '';
            if (_cryptoActiveTab === 'portfolio') {
                await _renderPortfolioTab(tabContent, container, portfolioId);
            } else {
                await renderOrderHistoryTab(tabContent, portfolioId, 'crypto');
            }
        });
    });
}

// ── Portfolio tab ──────────────────────────────────────────
async function _renderPortfolioTab(tabContent, container, portfolioId) {
    tabContent.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [cryptoResp, ordersResp, settingsResp] = await Promise.all([
            api.crypto.list(portfolioId),
            api.cryptoOrders.list(portfolioId),
            api.settings.list(portfolioId).catch(() => ({ data: [] })),
        ]);
        const settingsRecord = settingsResp?.data?.[0] || null;
        const btcGoal = parseFloat(settingsRecord?.btc_goal) || 1;
        const sort = window.app?.getSortState('crypto') || { col: null, dir: 'asc' };
        const allCoins = cryptoResp?.data || [];
        const allOrders = ordersResp?.data || [];
        const ordersByHolding = groupOrdersByHolding(allOrders, 'crypto_id');

        const resolved = allCoins.map(item => {
            const holdingOrders = ordersByHolding.get(item.id) || [];
            if (holdingOrders.length > 0) {
                const pos = computeDerivedPosition(holdingOrders, 'quantity');
                return { ...item, _derived: true, _qty: pos.units, _invested: pos.invested };
            }
            return { ...item, _derived: false, _qty: parseFloat(item.quantity) || 0, _invested: parseFloat(item.invested) || 0 };
        });

        const BTC_PATTERN = /^(BTC|Bitcoin)$/i;
        const btcHoldings = resolved.filter(c => BTC_PATTERN.test((c.coin_name || '').trim()));
        const totalBtcQty = btcHoldings.reduce((s, c) => s + c._qty, 0);
        const totalBtcCurrent = btcHoldings.reduce((s, c) => s + (parseFloat(c.current) || 0), 0);
        const pricePerBtc = totalBtcQty > 0 ? totalBtcCurrent / totalBtcQty : null;
        const btcRemaining = Math.max(0, btcGoal - totalBtcQty);
        const btcProgress = btcGoal > 0 ? Math.min(100, (totalBtcQty / btcGoal) * 100) : 0;
        const inrNeeded = pricePerBtc !== null && btcRemaining > 0 ? btcRemaining * pricePerBtc : null;

        const visible = _cryptoShowClosed
            ? resolved
            : resolved.filter(c => !(c._derived && c._qty === 0));
        const holdings = sortData(visible, sort.col, sort.dir);

        const totalInvested = holdings.reduce((s, f) => s + f._invested, 0);
        const totalCurrent = holdings.reduce((s, f) => s + (parseFloat(f.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';
        const closedCount = resolved.filter(c => c._derived && c._qty === 0).length;

        let tableRows = '';
        holdings.forEach(item => {
            const invested = item._invested;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';

            const isClosed = item._derived && item._qty === 0;
            const rowStyle = isClosed ? 'opacity:0.5;' : '';

            let qtyCell;
            if (isClosed) {
                qtyCell = `<span class="badge badge-muted">Closed</span>`;
            } else if (!item._derived) {
                qtyCell = `
                    <span class="mono" style="font-size:12px;">${item._qty.toFixed(8)}</span>
                    <span class="badge badge-muted" style="cursor:pointer;margin-left:4px;font-size:10px;"
                        data-legacy-coin="${item.id}" title="No order history — click to add orders">No history</span>`;
            } else {
                qtyCell = `<span class="mono" style="font-size:12px;">${item._qty.toFixed(8)}</span>`;
            }

            tableRows += `
                <tr style="${rowStyle}">
                    <td data-label="Coin">${item.coin_name}</td>
                    <td data-label="Platform">${item.platform || '—'}</td>
                    <td data-label="Qty">${qtyCell}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('crypto','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('crypto','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        tabContent.innerHTML = `
            <div class="section-header" style="margin-top:20px;">
                <div style="display:flex;gap:8px;align-items:center;">
                    ${closedCount > 0 ? `
                    <button class="btn btn-ghost btn-sm" id="cr-toggle-closed">
                        ${_cryptoShowClosed ? '📁 Hide Closed' : '📂 Show Closed'} (${closedCount})
                    </button>` : ''}
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('crypto')">+ Add Crypto</button>
                    <button class="btn btn-ghost" onclick="window.app.refreshCryptoLive()">🔄 Refresh Prices</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Invested</h3><p class="stat-value mono">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value mono">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value mono ${totalPL >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
            </div>
            ${holdings.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Coin', 'coin_name', sort)}
                        ${th('Platform', 'platform', sort)}
                        <th>Qty</th>
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'current', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No crypto holdings added yet.</p>'}
            <div class="stat-card" style="margin-top:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
                    <h3 style="margin:0;">₿ BTC Goal</h3>
                    <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);">
                        Goal:
                        <input type="number" value="${btcGoal}" min="0.001" step="0.001"
                            class="form-input" style="width:80px;padding:4px 8px;font-size:13px;"
                            onchange="window._updateBtcGoal(this.value)">
                        BTC
                    </div>
                </div>
                <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:14px;">
                    <div style="height:100%;background:var(--accent);width:${btcProgress.toFixed(1)}%;border-radius:4px;"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;font-size:13px;">
                    <div>
                        <div style="color:var(--text-muted);font-size:11px;margin-bottom:2px;">Owned</div>
                        <div class="mono" style="font-weight:600;">${totalBtcQty.toFixed(8)} BTC</div>
                        <div style="color:var(--text-muted);font-size:11px;">${btcProgress.toFixed(1)}% of goal</div>
                    </div>
                    <div>
                        <div style="color:var(--text-muted);font-size:11px;margin-bottom:2px;">Remaining</div>
                        <div class="mono" style="font-weight:600;">${btcRemaining > 0 ? btcRemaining.toFixed(8) + ' BTC' : '✓ Goal reached!'}</div>
                        ${inrNeeded !== null ? `<div style="color:var(--text-muted);font-size:11px;">≈ ${Utilities.formatCurrency(inrNeeded)} to invest</div>` : ''}
                    </div>
                    ${pricePerBtc !== null ? `
                    <div>
                        <div style="color:var(--text-muted);font-size:11px;margin-bottom:2px;">BTC Price (avg cost)</div>
                        <div class="mono" style="font-weight:600;">${Utilities.formatCurrency(pricePerBtc)}</div>
                    </div>` : ''}
                </div>
            </div>
        `;

        const toggleClosedBtn = tabContent.querySelector('#cr-toggle-closed');
        if (toggleClosedBtn) toggleClosedBtn.addEventListener('click', async () => {
            _cryptoShowClosed = !_cryptoShowClosed;
            await _renderPortfolioTab(tabContent, container, portfolioId);
        });

        tabContent.querySelectorAll('[data-legacy-coin]').forEach(badge => {
            badge.addEventListener('click', () => {
                const coinId = badge.dataset.legacyCoin;
                preSelectOrderHistoryHolding('crypto', coinId);
                _cryptoActiveTab = 'orderHistory';
                container.querySelectorAll('#cr-tab-bar [data-tab]').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === 'orderHistory');
                });
                const tc = container.querySelector('#cr-tab-content');
                tc.innerHTML = '';
                renderOrderHistoryTab(tc, portfolioId, 'crypto');
            });
        });

        window._updateBtcGoal = async (value) => {
            const g = parseFloat(value);
            if (!settingsRecord?.id || isNaN(g) || g <= 0) return;
            await api.settings.update(settingsRecord.id, { btc_goal: g });
            await _renderPortfolioTab(tabContent, container, portfolioId);
        };
    } catch {
        tabContent.innerHTML = '<div class="error-state"><p>Failed to load crypto.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

