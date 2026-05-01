import Utilities from '../../utils/utils.js';
import { FinanceUtils } from '../../utils/financeUtils.js';
import api from '../../services/api.js';
import { renderOrderHistoryTab, preSelectOrderHistoryHolding } from './order-history/orderHistory.js';
import { computeDerivedPosition, groupOrdersByHolding } from '../../services/orderEngine.js';

// ── Module state ───────────────────────────────────────────
let _stocksActiveTab = 'portfolio';
let _stocksShowClosed = false;

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
    return `<th class="${cls}" onclick="window.app.setSortState('stocks','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

// ── Main render ────────────────────────────────────────────
export async function renderStocks(portfolioId) {
    const container = document.getElementById('content-stocks');
    container.innerHTML = _buildShell();
    _attachTabEvents(container, portfolioId);

    const tabContent = container.querySelector('#st-tab-content');
    if (_stocksActiveTab === 'portfolio') {
        await _renderPortfolioTab(tabContent, container, portfolioId);
    } else {
        await renderOrderHistoryTab(tabContent, portfolioId, 'stocks');
    }
}

function _buildShell() {
    return `
        <div class="mft">
            <div class="section-header">
                <div>
                    <p class="page-eyebrow">WEALTH OS · STOCKS &amp; ETFS</p>
                    <h1 class="page-title">Stocks &amp; ETFs</h1>
                </div>
                <button class="btn btn-primary btn-add-desktop" onclick="window.app.showAddForm('stocks')">+ Add Stock</button>
            </div>
            <div class="mft-tab-bar" id="st-tab-bar">
                <button class="mft-tab ${_stocksActiveTab === 'portfolio' ? 'active' : ''}" data-tab="portfolio">Portfolio</button>
                <button class="mft-tab ${_stocksActiveTab === 'orderHistory' ? 'active' : ''}" data-tab="orderHistory">Order History</button>
            </div>
            <div id="st-tab-content"></div>
            <button class="fab-add" onclick="window.app.showAddForm('stocks')" title="Add Stock">+</button>
        </div>`;
}

function _attachTabEvents(container, portfolioId) {
    container.querySelectorAll('#st-tab-bar [data-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            _stocksActiveTab = btn.dataset.tab;
            container.querySelectorAll('#st-tab-bar [data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabContent = container.querySelector('#st-tab-content');
            tabContent.innerHTML = '';
            if (_stocksActiveTab === 'portfolio') {
                await _renderPortfolioTab(tabContent, container, portfolioId);
            } else {
                await renderOrderHistoryTab(tabContent, portfolioId, 'stocks');
            }
        });
    });
}

// ── Portfolio tab ──────────────────────────────────────────
async function _renderPortfolioTab(tabContent, container, portfolioId) {
    tabContent.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [stocksResp, ordersResp] = await Promise.all([
            api.stocks.list(portfolioId),
            api.stockOrders.list(portfolioId),
        ]);
        const sort = window.app?.getSortState('stocks') || { col: null, dir: 'asc' };
        const allStocks = stocksResp?.data || [];
        const allOrders = ordersResp?.data || [];
        const ordersByHolding = groupOrdersByHolding(allOrders, 'stock_id');

        const resolved = allStocks.map(item => {
            const holdingOrders = ordersByHolding.get(item.id) || [];
            if (holdingOrders.length > 0) {
                const pos = computeDerivedPosition(holdingOrders, 'quantity');
                const firstOrderDate = holdingOrders.map(o => o.execution_date).filter(Boolean).sort()[0] || null;
                return { ...item, _derived: true, _qty: pos.units, _invested: pos.invested, _firstOrderDate: firstOrderDate };
            }
            return { ...item, _derived: false, _qty: parseFloat(item.quantity) || 0, _invested: parseFloat(item.invested) || 0, _firstOrderDate: null };
        });

        const visible = _stocksShowClosed
            ? resolved
            : resolved.filter(s => !(s._derived && s._qty === 0));
        const stocks = sortData(visible, sort.col, sort.dir);

        const totalInvested = stocks.reduce((s, f) => s + f._invested, 0);
        const totalCurrent = stocks.reduce((s, f) => s + (parseFloat(f.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';
        const closedCount = resolved.filter(s => s._derived && s._qty === 0).length;

        let tableRows = '';
        stocks.forEach(item => {
            const invested = item._invested;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
            const xirr = FinanceUtils.xirrFromHolding(invested, current, item._firstOrderDate || item.created_at);
            const xirrCell = xirr !== null
                ? `<span class="${parseFloat(xirr.value) >= 0 ? 'value-positive' : 'value-negative'}" ${xirr.hint ? `title="${xirr.hint}"` : ''}>${xirr.value}%${xirr.hint ? '*' : ''}</span>`
                : '<span style="color:var(--text-muted)">—</span>';

            const isClosed = item._derived && item._qty === 0;
            const rowStyle = isClosed ? 'opacity:0.5;' : '';

            let qtyCell;
            if (isClosed) {
                qtyCell = `<span class="badge badge-muted">Closed</span>`;
            } else if (!item._derived) {
                qtyCell = `
                    <span class="mono" style="font-size:12px;">${item._qty.toFixed(4)}</span>
                    <span class="badge badge-muted" style="cursor:pointer;margin-left:4px;font-size:10px;"
                        data-legacy-stock="${item.id}" title="No order history — click to add orders">No history</span>`;
            } else {
                qtyCell = `<span class="mono" style="font-size:12px;">${item._qty.toFixed(4)}</span>`;
            }

            tableRows += `
                <tr style="${rowStyle}">
                    <td data-label="Name">${item.stock_name}</td>
                    <td data-label="Ticker">${item.ticker || '—'}</td>
                    <td data-label="Qty">${qtyCell}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td data-label="XIRR" class="mono">${xirrCell}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('stocks','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('stocks','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        tabContent.innerHTML = `
            <div class="section-header">
                <div style="display:flex;gap:8px;align-items:center;">
                    ${closedCount > 0 ? `
                    <button class="btn btn-ghost btn-sm" id="st-toggle-closed">
                        ${_stocksShowClosed ? '📁 Hide Closed' : '📂 Show Closed'} (${closedCount})
                    </button>` : ''}
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Invested</h3><p class="stat-value mono">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value mono">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value mono ${totalPL >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
            </div>
            ${stocks.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Name', 'stock_name', sort)}
                        ${th('Ticker', 'ticker', sort)}
                        <th>Qty</th>
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'current', sort)}
                        <th title="Extended IRR — uses first order date if available, otherwise record creation date">XIRR</th>
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div class="mobile-list-container" style="display:none;background:var(--surface);border-radius:20px;padding:0;overflow:hidden;">
                ${stocks.map(item => {
            const invested = item._invested;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
            const xirr = FinanceUtils.xirrFromHolding(invested, current, item._firstOrderDate || item.created_at);
            const xirrValue = xirr !== null ? `${xirr.value}%` : '—';
            const xirrClass = xirr !== null ? (parseFloat(xirr.value) >= 0 ? 'color:var(--green)' : 'color:var(--red)') : '';
            const plClass = pl >= 0 ? 'color:var(--green)' : 'color:var(--red)';
            return `
                        <div class="mobile-compact-row" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;" data-stock-id="${item.id}">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-family:var(--font-ui);font-size:14px;color:var(--text-primary);font-weight:500;">${item.stock_name}</span>
                                <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-primary);font-weight:500;">${Utilities.formatCurrency(current)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">${item.ticker || '—'} · ${item._qty.toFixed(4)}</span>
                                <span style="font-family:var(--font-mono);font-size:11px;${plClass};font-weight:500;">${plPct}%</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>` : '<p class="empty-state">No stocks added yet.</p>'}
        `;

        const toggleClosedBtn = tabContent.querySelector('#st-toggle-closed');
        if (toggleClosedBtn) toggleClosedBtn.addEventListener('click', async () => {
            _stocksShowClosed = !_stocksShowClosed;
            await _renderPortfolioTab(tabContent, container, portfolioId);
        });

        tabContent.querySelectorAll('[data-legacy-stock]').forEach(badge => {
            badge.addEventListener('click', () => {
                const stockId = badge.dataset.legacyStock;
                preSelectOrderHistoryHolding('stocks', stockId);
                _stocksActiveTab = 'orderHistory';
                container.querySelectorAll('#st-tab-bar [data-tab]').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === 'orderHistory');
                });
                const tc = container.querySelector('#st-tab-content');
                tc.innerHTML = '';
                renderOrderHistoryTab(tc, portfolioId, 'stocks');
            });
        });

        // Mobile list tap handlers
        tabContent.querySelectorAll('[data-stock-id]').forEach(row => {
            row.addEventListener('click', () => {
                const stockId = row.dataset.stockId;
                const stock = stocks.find(s => s.id === stockId);
                if (!stock) return;
                const invested = stock._invested;
                const current = parseFloat(stock.current) || 0;
                const pl = current - invested;
                const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
                const xirr = FinanceUtils.xirrFromHolding(invested, current, stock._firstOrderDate || stock.created_at);
                const xirrValue = xirr !== null ? `${xirr.value}%` : '—';
                const fields = {
                    'Stock Name': stock.stock_name,
                    'Ticker': stock.ticker || '—',
                    'Quantity': stock._qty.toFixed(4),
                    'Invested': Utilities.formatCurrency(invested),
                    'Current Value': Utilities.formatCurrency(current),
                    'P/L': `${Utilities.formatCurrency(pl)} (${plPct}%)`,
                    'XIRR': xirrValue,
                };
                const actions = [
                    {
                        label: 'Edit',
                        onClick: () => {
                            window.app.editEntry('stocks', stockId);
                            const sheet = document.getElementById('mobile-bottom-sheet');
                            const overlay = document.getElementById('mobile-bottom-sheet-overlay');
                            if (sheet) sheet.style.transform = 'translateY(100%)';
                            if (overlay) overlay.remove();
                            if (sheet) setTimeout(() => sheet.remove(), 300);
                        }
                    },
                    {
                        label: 'Delete',
                        onClick: () => {
                            window.app.deleteEntry('stocks', stockId);
                            const sheet = document.getElementById('mobile-bottom-sheet');
                            const overlay = document.getElementById('mobile-bottom-sheet-overlay');
                            if (sheet) sheet.style.transform = 'translateY(100%)';
                            if (overlay) overlay.remove();
                            if (sheet) setTimeout(() => sheet.remove(), 300);
                        }
                    }
                ];
                Utilities.openBottomSheet(fields, actions);
            });
        });

        // Add mobile CSS
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            @media (max-width: 680px) {
                .data-table-container { display: none !important; }
                .mobile-list-container { display: block !important; }
            }
        `;
        tabContent.appendChild(mobileStyle);
    } catch {
        tabContent.innerHTML = '<div class="error-state"><p>Failed to load stocks.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

