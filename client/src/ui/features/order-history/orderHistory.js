import Utilities from '../../../utils/utils.js';
import api from '../../../services/api.js';
import { computeDerivedPosition } from '../../../services/orderEngine.js';

// ── Per-asset configuration ───────────────────────────────
const ASSET_CONFIG = {
    mutualFunds: {
        orderApi: () => api.mfOrders,
        holdingApi: () => api.mutualFunds,
        holdingIdField: 'mf_id',
        unitsField: 'units',
        priceField: 'nav',
        priceLabel: 'NAV',
        unitsLabel: 'Units',
        holdingLabel: 'Fund',
        holdingNameField: 'fund_name',
        bannerKey: 'oh_banner_mf_v1',
        decimals: 4,
    },
    stocks: {
        orderApi: () => api.stockOrders,
        holdingApi: () => api.stocks,
        holdingIdField: 'stock_id',
        unitsField: 'quantity',
        priceField: 'price',
        priceLabel: 'Price',
        unitsLabel: 'Quantity',
        holdingLabel: 'Stock',
        holdingNameField: 'stock_name',
        bannerKey: 'oh_banner_st_v1',
        decimals: 4,
    },
    crypto: {
        orderApi: () => api.cryptoOrders,
        holdingApi: () => api.crypto,
        holdingIdField: 'crypto_id',
        unitsField: 'quantity',
        priceField: 'price',
        priceLabel: 'Price per Coin',
        unitsLabel: 'Quantity',
        holdingLabel: 'Coin',
        holdingNameField: 'coin_name',
        bannerKey: 'oh_banner_cr_v1',
        decimals: 8,
    },
};

// ── Module state (per asset type) ─────────────────────────
const _states = {};

function _getState(assetType) {
    if (!_states[assetType]) {
        _states[assetType] = {
            sortCol: 'execution_date',
            sortDir: 'desc',
            filterHolding: 'all',
            filterType: 'all',
            filterDateFrom: '',
            filterDateTo: '',
            selectedOrders: new Set(),
            currentPage: 1,
            pageSize: 12,
        };
    }
    return _states[assetType];
}

/**
 * Pre-select a holding in the Order History filter (called before switching to the tab).
 * @param {string} assetType
 * @param {string} holdingId
 */
export function preSelectOrderHistoryHolding(assetType, holdingId) {
    _getState(assetType).filterHolding = holdingId;
}

// ── Main render ───────────────────────────────────────────

/**
 * Render the Order History tab into a container element.
 * @param {HTMLElement} el          — target container
 * @param {string}      portfolioId
 * @param {string}      assetType   — 'mutualFunds' | 'stocks' | 'crypto'
 */
export async function renderOrderHistoryTab(el, portfolioId, assetType) {
    el.innerHTML = '<div class="skeleton-card"></div>';
    const cfg = ASSET_CONFIG[assetType];
    const state = _getState(assetType);

    try {
        const [holdingsResp, ordersResp] = await Promise.all([
            cfg.holdingApi().list(portfolioId),
            cfg.orderApi().list(portfolioId),
        ]);
        const holdings = holdingsResp?.data || [];
        const allOrders = ordersResp?.data || [];
        const showBanner = !localStorage.getItem(cfg.bannerKey);

        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, showBanner);
    } catch {
        el.innerHTML = `
            <div class="error-state">
                <p>Failed to load order history.</p>
                <button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button>
            </div>`;
    }
}

function _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, showBanner) {
    const filtered = _applyFilters(allOrders, state, cfg);
    const sorted = _sortOrders(filtered, state, cfg);
    const totalPages = Math.ceil(sorted.length / state.pageSize);
    const paginated = _paginate(sorted, state);

    el.innerHTML = `
        ${showBanner ? _buildBanner() : ''}
        ${_buildSummary(allOrders, state, cfg)}
        ${_buildFilters(state, cfg, holdings, portfolioId, assetType, sorted.length, totalPages)}
        ${sorted.length > 0
            ? _buildTable(paginated, holdings, cfg, state)
            : _buildEmpty(cfg)}
    `;

    _wireEvents(el, portfolioId, assetType, holdings, allOrders, state, cfg);
}

// ── Banner ────────────────────────────────────────────────

function _buildBanner() {
    return `
        <div class="oh-banner" id="oh-migration-banner"
             style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;
                    margin-top:16px;background:rgba(59,130,246,0.07);
                    border:1px solid rgba(59,130,246,0.2);border-radius:10px;">
            <div style="flex:1;font-size:13px;line-height:1.5;">
                <strong>Order History is now active.</strong>
                Once you add orders for a holding, its portfolio values (units &amp; invested) are
                computed automatically from your order history using the Weighted Average Cost method.
                Holdings without orders continue showing their manually entered values until migrated.
            </div>
            <button class="btn btn-ghost btn-sm" id="oh-dismiss-banner" style="white-space:nowrap;">Dismiss</button>
        </div>`;
}

// ── Summary strip ─────────────────────────────────────────

function _buildSummary(allOrders, state, cfg) {
    const source = state.filterHolding !== 'all'
        ? allOrders.filter(o => o[cfg.holdingIdField] === state.filterHolding)
        : allOrders;

    const totalBought = source
        .filter(o => o.order_type === 'Buy')
        .reduce((s, o) => s + (parseFloat(o.amount) || 0) + (parseFloat(o.charges) || 0), 0);
    const totalSold = source
        .filter(o => o.order_type === 'Sell')
        .reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
    const netInvested = totalBought - totalSold;

    return `
        <div class="stat-grid" style="margin-top:16px;">
            <div class="stat-card">
                <h3>Orders</h3>
                <p class="stat-value">${source.length}</p>
            </div>
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value mono">${Utilities.formatCurrency(totalBought)}</p>
            </div>
            <div class="stat-card">
                <h3>Total Redeemed</h3>
                <p class="stat-value mono">${Utilities.formatCurrency(totalSold)}</p>
            </div>
            <div class="stat-card">
                <h3>Net Invested</h3>
                <p class="stat-value mono ${netInvested >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(netInvested)}</p>
            </div>
        </div>`;
}

// ── Filters ───────────────────────────────────────────────

function _buildFilters(state, cfg, holdings, portfolioId, assetType, totalRecords, totalPages) {
    const holdingOpts = holdings.map(h =>
        `<option value="${h.id}" ${state.filterHolding === h.id ? 'selected' : ''}>${h[cfg.holdingNameField]}</option>`
    ).join('');

    const hasActive = state.filterHolding !== 'all' || state.filterType !== 'all'
        || state.filterDateFrom || state.filterDateTo;
    const hasSelected = state.selectedOrders.size > 0;

    // Build pagination controls
    let paginationHtml = '';
    if (totalPages > 1) {
        const startRecord = (state.currentPage - 1) * state.pageSize + 1;
        const endRecord = Math.min(state.currentPage * state.pageSize, totalRecords);

        let pageNumbers = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers += `<button class="btn btn-sm ${i === state.currentPage ? 'btn-primary' : 'btn-ghost'}" data-page="${i}">${i}</button>`;
        }

        paginationHtml = `
            <span style="font-size:13px;color:var(--text-muted);margin-right:8px;">
                ${startRecord}-${endRecord} of ${totalRecords}
            </span>
            <div style="display:flex;gap:4px;align-items:center;">
                <button class="btn btn-sm btn-ghost" id="oh-prev-page" ${state.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                ${pageNumbers}
                <button class="btn btn-sm btn-ghost" id="oh-next-page" ${state.currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;
    }

    return `
        <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <select class="form-input" id="oh-f-holding" style="min-width:140px;width:auto;">
                <option value="all" ${state.filterHolding === 'all' ? 'selected' : ''}>All ${cfg.holdingLabel}s</option>
                ${holdingOpts}
            </select>
            <select class="form-input" id="oh-f-type" style="min-width:100px;width:auto;">
                <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>All Types</option>
                <option value="Buy" ${state.filterType === 'Buy' ? 'selected' : ''}>Buy</option>
                <option value="Sell" ${state.filterType === 'Sell' ? 'selected' : ''}>Sell</option>
            </select>
            <input type="date" class="form-input" id="oh-f-from" value="${state.filterDateFrom}"
                style="width:auto;" title="From date">
            <input type="date" class="form-input" id="oh-f-to" value="${state.filterDateTo}"
                style="width:auto;" title="To date">
            ${hasActive ? `<button class="btn btn-ghost btn-sm" id="oh-clear-filters">✕ Clear</button>` : ''}
            ${paginationHtml}
            <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                ${hasSelected ? `<button class="btn btn-danger btn-sm" id="oh-delete-selected">Delete Selected (${state.selectedOrders.size})</button>` : ''}
                <button class="btn btn-primary" id="oh-add-order"
                    data-portfolio="${portfolioId}" data-asset="${assetType}">+ Add Order</button>
            </div>
        </div>`;
}

// ── Table ─────────────────────────────────────────────────

function _thSort(label, col, state, alignRight = false) {
    const active = state.sortCol === col;
    const icon = active ? (state.sortDir === 'asc' ? '▲' : '▼') : '▲▼';
    const cls = active ? `sortable ${state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc'}` : 'sortable';
    const style = alignRight ? 'style="text-align:right;"' : '';
    return `<th class="${cls}" data-sort="${col}" ${style}>${label} <span class="sort-icon">${icon}</span></th>`;
}

function _buildTable(orders, holdings, cfg, state) {
    const holdingMap = new Map(holdings.map(h => [h.id, h[cfg.holdingNameField]]));
    const hasCharges = orders.some(o => parseFloat(o.charges) > 0);
    const hasRemarks = orders.some(o => o.remarks?.trim());
    const hasPlatform = orders.some(o => o.platform?.trim());
    const allSelected = orders.length > 0 && orders.every(o => state.selectedOrders.has(o.id));

    const rows = orders.map(o => {
        const isSelected = state.selectedOrders.has(o.id);
        const holdingName = holdingMap.get(o[cfg.holdingIdField]) || '—';
        const qty = parseFloat(o[cfg.unitsField] ?? o.units ?? o.quantity) || 0;
        const price = parseFloat(o[cfg.priceField] ?? o.nav ?? o.price) || 0;
        const amount = parseFloat(o.amount) || 0;
        const charges = parseFloat(o.charges) || 0;
        const date = o.execution_date
            ? new Date(o.execution_date + 'T00:00:00').toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            })
            : '—';
        const typeBadge = o.order_type === 'Buy'
            ? '<span class="badge badge-green">Buy</span>'
            : '<span class="badge badge-red">Sell</span>';
        const rawRemarks = o.remarks || '';
        const remarksDisplay = rawRemarks.length > 30
            ? `<span title="${rawRemarks.replace(/"/g, '&quot;')}">${rawRemarks.slice(0, 30)}…</span>`
            : rawRemarks;

        return `
            <tr class="${isSelected ? 'row-selected' : ''}">
                <td style="width:40px;text-align:center;">
                    <input type="checkbox" class="oh-row-checkbox" data-order-id="${o.id}" ${isSelected ? 'checked' : ''}>
                </td>
                <td data-label="${cfg.holdingLabel}">${holdingName}</td>
                <td data-label="Date">${date}</td>
                <td data-label="Type">${typeBadge}</td>
                <td data-label="${cfg.unitsLabel}" class="mono" style="text-align:right;">${qty.toFixed(cfg.decimals)}</td>
                <td data-label="${cfg.priceLabel}" class="mono" style="text-align:right;">${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                <td data-label="Amount" class="mono" style="text-align:right;">${Utilities.formatCurrency(amount)}</td>
                ${hasCharges ? `<td data-label="Charges" class="mono" style="text-align:right;">${charges > 0 ? Utilities.formatCurrency(charges) : '<span style="color:var(--text-muted)">—</span>'}</td>` : ''}
                ${hasPlatform ? `<td data-label="Platform">${o.platform || '<span style="color:var(--text-muted)">—</span>'}</td>` : ''}
                ${hasRemarks ? `<td data-label="Remarks">${remarksDisplay || '<span style="color:var(--text-muted)">—</span>'}</td>` : ''}
                <td class="actions">
                    <button class="btn btn-sm btn-ghost" data-edit-order="${o.id}">Edit</button>
                    <button class="btn btn-sm btn-danger" data-delete-order="${o.id}">Delete</button>
                </td>
            </tr>`;
    }).join('');

    return `
        <div class="data-table-container" style="margin-top:16px;">
            <table class="data-table oh-table">
                <thead><tr>
                    <th style="width:40px;text-align:center;">
                        <input type="checkbox" id="oh-select-all" ${allSelected ? 'checked' : ''}>
                    </th>
                    <th>${cfg.holdingLabel}</th>
                    ${_thSort('Date', 'execution_date', state)}
                    <th>Type</th>
                    ${_thSort(cfg.unitsLabel, cfg.unitsField, state, true)}
                    ${_thSort(cfg.priceLabel, cfg.priceField, state, true)}
                    ${_thSort('Amount', 'amount', state, true)}
                    ${hasCharges ? '<th style="text-align:right;">Charges</th>' : ''}
                    ${hasPlatform ? '<th>Platform</th>' : ''}
                    ${hasRemarks ? '<th>Remarks</th>' : ''}
                    <th>Actions</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <style>
            .oh-table th, .oh-table td { padding: 10px 10px; font-size: 13px; white-space: nowrap; }
            .oh-table th:first-child, .oh-table td:first-child { white-space: normal; max-width: 180px; }
            .row-selected { background-color: rgba(59,130,246,0.08); }
            .oh-row-checkbox { cursor: pointer; width:16px;height:16px; }
            #oh-select-all { cursor: pointer; width:16px;height:16px; }
        </style>`;
}

function _buildEmpty(cfg) {
    return `
        <div style="margin-top:24px;padding:48px 24px;text-align:center;background:var(--bg-elevated);
                    border-radius:12px;border:1px dashed var(--border);">
            <div style="font-size:2.5rem;margin-bottom:12px;">📋</div>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">No orders yet</p>
            <p style="color:var(--text-muted);margin-bottom:20px;max-width:400px;margin-inline:auto;">
                Record your ${cfg.holdingLabel.toLowerCase()} purchases and sales here to track your
                cost basis automatically using Weighted Average Cost.
            </p>
        </div>`;
}

// ── Filter + Sort logic ───────────────────────────────────

function _applyFilters(orders, state, cfg) {
    return orders.filter(o => {
        if (state.filterHolding !== 'all' && o[cfg.holdingIdField] !== state.filterHolding) return false;
        if (state.filterType !== 'all' && o.order_type !== state.filterType) return false;
        if (state.filterDateFrom && o.execution_date < state.filterDateFrom) return false;
        if (state.filterDateTo && o.execution_date > state.filterDateTo) return false;
        return true;
    });
}

function _sortOrders(orders, state, cfg) {
    const col = state.sortCol;
    const dir = state.sortDir;
    const numericCols = ['amount', 'charges', cfg.unitsField, cfg.priceField, 'nav', 'price', 'units', 'quantity'];

    return [...orders].sort((a, b) => {
        const av = a[col] ?? '';
        const bv = b[col] ?? '';
        let cmp;
        if (numericCols.includes(col)) {
            cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
        } else {
            cmp = String(av).localeCompare(String(bv));
        }
        return dir === 'asc' ? cmp : -cmp;
    });
}

function _paginate(orders, state) {
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    return orders.slice(start, end);
}

// ── Event wiring ──────────────────────────────────────────

function _wireEvents(el, portfolioId, assetType, holdings, allOrders, state, cfg) {
    const holdingFilter = el.querySelector('#oh-f-holding');
    if (holdingFilter) holdingFilter.addEventListener('change', () => {
        state.filterHolding = holdingFilter.value;
        state.selectedOrders.clear();
        state.currentPage = 1;
        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
    });

    const typeFilter = el.querySelector('#oh-f-type');
    if (typeFilter) typeFilter.addEventListener('change', () => {
        state.filterType = typeFilter.value;
        state.selectedOrders.clear();
        state.currentPage = 1;
        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
    });

    const fromFilter = el.querySelector('#oh-f-from');
    if (fromFilter) fromFilter.addEventListener('change', () => {
        state.filterDateFrom = fromFilter.value;
        state.selectedOrders.clear();
        state.currentPage = 1;
        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
    });

    const toFilter = el.querySelector('#oh-f-to');
    if (toFilter) toFilter.addEventListener('change', () => {
        state.filterDateTo = toFilter.value;
        state.selectedOrders.clear();
        state.currentPage = 1;
        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
    });

    const clearBtn = el.querySelector('#oh-clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        state.filterHolding = 'all';
        state.filterType = 'all';
        state.filterDateFrom = '';
        state.filterDateTo = '';
        state.selectedOrders.clear();
        state.currentPage = 1;
        _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
    });

    const addBtn = el.querySelector('#oh-add-order');
    if (addBtn) addBtn.addEventListener('click', () => {
        if (holdings.length === 0) {
            Utilities.showNotification(
                `No ${cfg.holdingLabel.toLowerCase()}s found. Add one in the Portfolio tab first.`,
                'info'
            );
            return;
        }
        _showOrderForm(null, portfolioId, assetType, holdings, allOrders, cfg, el, state);
    });

    // Row checkboxes
    el.querySelectorAll('.oh-row-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const orderId = cb.dataset.orderId;
            if (cb.checked) {
                state.selectedOrders.add(orderId);
            } else {
                state.selectedOrders.delete(orderId);
            }
            _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
        });
    });

    // Select all checkbox
    const selectAllCb = el.querySelector('#oh-select-all');
    if (selectAllCb) {
        const filtered = _applyFilters(allOrders, state, cfg);
        selectAllCb.addEventListener('change', () => {
            if (selectAllCb.checked) {
                filtered.forEach(o => state.selectedOrders.add(o.id));
            } else {
                state.selectedOrders.clear();
            }
            _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
        });
    }

    // Delete selected button
    const deleteSelectedBtn = el.querySelector('#oh-delete-selected');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            const selectedIds = Array.from(state.selectedOrders);
            if (selectedIds.length === 0) return;

            const confirmMsg = `Delete ${selectedIds.length} selected order${selectedIds.length > 1 ? 's' : ''}? Portfolio positions will be recomputed.`;
            if (!await Utilities.showConfirm(confirmMsg)) return;

            try {
                for (const orderId of selectedIds) {
                    await cfg.orderApi().delete(orderId);
                }
                state.selectedOrders.clear();
                Utilities.showNotification(`${selectedIds.length} order${selectedIds.length > 1 ? 's' : ''} deleted`, 'success');
                await renderOrderHistoryTab(el, portfolioId, assetType);
            } catch {
                Utilities.showNotification('Failed to delete orders', 'error');
            }
        });
    }

    el.querySelectorAll('[data-edit-order]').forEach(btn => {
        btn.addEventListener('click', () => {
            const order = allOrders.find(o => o.id === btn.dataset.editOrder);
            if (order) _showOrderForm(order, portfolioId, assetType, holdings, allOrders, cfg, el, state);
        });
    });

    el.querySelectorAll('[data-delete-order]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.deleteOrder;
            const order = allOrders.find(o => o.id === orderId);
            if (!order) return;

            const holdingOrders = allOrders.filter(o => o[cfg.holdingIdField] === order[cfg.holdingIdField]);
            const afterDelete = holdingOrders.filter(o => o.id !== orderId);
            const posAfter = computeDerivedPosition(afterDelete, cfg.unitsField);

            let message = 'Delete this order? The portfolio position will be recomputed.';
            if (afterDelete.length === 0) {
                message = 'This is the last order for this holding. Deleting it returns the holding to legacy mode with zero derived values. Continue?';
            } else if (posAfter.units === 0) {
                message = 'Deleting this order will result in a zero position. The holding will appear as closed. Continue?';
            }

            if (!await Utilities.showConfirm(message)) return;

            try {
                await cfg.orderApi().delete(orderId);
                state.selectedOrders.delete(orderId);
                Utilities.showNotification('Order deleted', 'success');
                await renderOrderHistoryTab(el, portfolioId, assetType);
            } catch {
                Utilities.showNotification('Failed to delete order', 'error');
            }
        });
    });

    el.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (state.sortCol === col) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortCol = col;
                state.sortDir = 'desc';
            }
            _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
        });
    });

    const dismissBanner = el.querySelector('#oh-dismiss-banner');
    if (dismissBanner) dismissBanner.addEventListener('click', () => {
        localStorage.setItem(cfg.bannerKey, '1');
        el.querySelector('#oh-migration-banner')?.remove();
    });

    // Pagination controls
    const prevPageBtn = el.querySelector('#oh-prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
            }
        });
    }

    const nextPageBtn = el.querySelector('#oh-next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const filtered = _applyFilters(allOrders, state, cfg);
            const sorted = _sortOrders(filtered, state, cfg);
            const totalPages = Math.ceil(sorted.length / state.pageSize);
            if (state.currentPage < totalPages) {
                state.currentPage++;
                _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
            }
        });
    }

    el.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page && page !== state.currentPage) {
                state.currentPage = page;
                _renderContent(el, portfolioId, assetType, holdings, allOrders, state, cfg, false);
            }
        });
    });
}

// ── Order form (modal) ────────────────────────────────────

function _getKnownPlatforms(allOrders) {
    const platforms = new Set();
    for (const o of allOrders) {
        if (o.platform?.trim()) platforms.add(o.platform.trim());
    }
    return [...platforms].sort((a, b) => a.localeCompare(b));
}

function _showOrderForm(order, portfolioId, assetType, holdings, allOrders, cfg, el, state) {
    const isEdit = !!order;
    const today = new Date().toISOString().split('T')[0];

    const holdingOpts = holdings.map(h => {
        const sel = isEdit && order[cfg.holdingIdField] === h.id ? 'selected' : '';
        return `<option value="${h.id}" ${sel}>${h[cfg.holdingNameField]}</option>`;
    }).join('');

    const fv = (field, fallback = '') => isEdit ? (order[field] ?? fallback) : fallback;
    const orderType = fv('order_type', 'Buy');
    const knownPlatforms = _getKnownPlatforms(allOrders);
    const currentPlatform = fv('platform');
    const isKnown = !currentPlatform || knownPlatforms.includes(currentPlatform);

    const formHTML = `
        <form id="order-form">
            <div class="form-group">
                <label>${cfg.holdingLabel}:</label>
                <select id="of-holding" class="form-input" required ${isEdit ? 'disabled' : ''}>
                    <option value="">Select ${cfg.holdingLabel.toLowerCase()}…</option>
                    ${holdingOpts}
                </select>
            </div>
            <div class="form-group">
                <label>Date:</label>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-ghost btn-sm of-date-quick" data-offset="0">Today</button>
                    <button type="button" class="btn btn-ghost btn-sm of-date-quick" data-offset="-1">Yesterday</button>
                    <button type="button" class="btn btn-ghost btn-sm" id="of-date-prev" title="Previous month">◀ Month</button>
                    <button type="button" class="btn btn-ghost btn-sm" id="of-date-next" title="Next month">Month ▶</button>
                    <button type="button" class="btn btn-ghost btn-sm" id="of-date-cal" title="Open calendar">📅</button>
                </div>
                <input type="date" id="of-date" class="form-input" required
                    value="${fv('execution_date')}" max="${today}">
            </div>
            <div class="form-group">
                <label>Type:</label>
                <div style="display:flex;gap:8px;">
                    <button type="button" id="of-type-buy"
                        class="btn ${orderType === 'Buy' ? 'btn-primary' : 'btn-ghost'}">Buy</button>
                    <button type="button" id="of-type-sell"
                        class="btn ${orderType === 'Sell' ? 'btn-primary' : 'btn-ghost'}">Sell</button>
                </div>
                <input type="hidden" id="of-type" value="${orderType}">
            </div>
            <div class="of-row">
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>${cfg.unitsLabel}:</label>
                    <input type="number" id="of-units" class="form-input"
                        step="0.00000001" min="0.00000001"
                        value="${fv(cfg.unitsField)}" required>
                </div>
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>${cfg.priceLabel}:</label>
                    <input type="number" id="of-price" class="form-input"
                        step="0.0001" min="0.0001"
                        value="${fv(cfg.priceField)}" required>
                </div>
            </div>
            <div class="of-row">
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>Amount:</label>
                    <input type="number" id="of-amount" class="form-input"
                        step="0.01" min="0.01" value="${fv('amount')}" required>
                </div>
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>Charges <span style="font-weight:normal;font-size:0.85em;color:var(--text-muted)">${assetType === 'mutualFunds' && orderType === 'Buy' ? '(stamp duty)' : '(optional)'}</span>:</label>
                    <input type="number" id="of-charges" class="form-input"
                        step="0.01" min="0" value="${fv('charges', '0')}">
                </div>
            </div>
            <div class="of-row">
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>Platform <span style="font-weight:normal;font-size:0.85em;color:var(--text-muted)">(optional)</span>:</label>
                    <select id="of-platform-select" class="form-input">
                        <option value="">Select…</option>
                        ${knownPlatforms.map(p => `<option value="${p}" ${isKnown && currentPlatform === p ? 'selected' : ''}>${p}</option>`).join('')}
                        <option value="__other__" ${!isKnown && currentPlatform ? 'selected' : ''}>Other…</option>
                    </select>
                    <input type="text" id="of-platform-custom" class="form-input"
                        placeholder="Enter platform name" value="${!isKnown ? currentPlatform : ''}"
                        style="margin-top:6px;display:${!isKnown && currentPlatform ? 'block' : 'none'};">
                </div>
                <div class="form-group" style="flex:1;min-width:0;">
                    <label>Remarks <span style="font-weight:normal;font-size:0.85em;color:var(--text-muted)">(optional)</span>:</label>
                    <input type="text" id="of-remarks" class="form-input" value="${fv('remarks')}">
                </div>
            </div>
            <div id="of-sell-warning" style="display:none;padding:10px 14px;margin-top:4px;
                background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);
                border-radius:8px;font-size:13px;"></div>
        </form>
        <style>
            .of-row { display: flex; gap: 12px; }
            @media (max-width: 480px) { .of-row { flex-direction: column; gap: 0; } }
        </style>`;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Order' : 'Add Order';
    document.getElementById('modalBody').innerHTML = formHTML;
    document.getElementById('dataModal').style.display = 'block';

    _wireOrderForm(isEdit, order, portfolioId, assetType, holdings, allOrders, cfg, el, state);
}

function _wireOrderForm(isEdit, order, portfolioId, assetType, holdings, allOrders, cfg, el, _state) {
    const g = id => document.getElementById(id);

    function _computeStampDuty() {
        if (assetType !== 'mutualFunds') return;
        const typeVal = g('of-type')?.value;
        if (typeVal !== 'Buy') return;
        const amtEl = g('of-amount');
        const chargesEl = g('of-charges');
        if (!amtEl || !chargesEl) return;
        const amount = parseFloat(amtEl.value) || 0;
        if (amount > 0 && !isEdit) {
            const stampDuty = (amount * 0.00005).toFixed(2);
            chargesEl.value = stampDuty;
        }
    }

    function _checkSellWarning() {
        const typeEl = g('of-type');
        const warnEl = g('of-sell-warning');
        if (!warnEl) return;
        if (typeEl?.value !== 'Sell') { warnEl.style.display = 'none'; return; }
        const holdingId = g('of-holding')?.value;
        if (!holdingId) return;
        const holdingOrders = allOrders.filter(o =>
            o[cfg.holdingIdField] === holdingId && (!isEdit || o.id !== order?.id)
        );
        const pos = computeDerivedPosition(holdingOrders, cfg.unitsField);
        const sellQty = parseFloat(g('of-units')?.value) || 0;
        if (sellQty > pos.units) {
            warnEl.textContent = `Warning: Selling ${sellQty.toFixed(cfg.decimals)} ${cfg.unitsLabel.toLowerCase()} but current position is ${pos.units.toFixed(cfg.decimals)}. Confirm to proceed anyway.`;
            warnEl.style.display = 'block';
        } else {
            warnEl.style.display = 'none';
        }
    }

    g('of-units')?.addEventListener('input', _checkSellWarning);
    g('of-amount')?.addEventListener('input', _computeStampDuty);
    g('of-holding')?.addEventListener('change', _checkSellWarning);

    const dateEl = g('of-date');
    const todayDate = new Date().toISOString().split('T')[0];

    document.querySelectorAll('.of-date-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            const offset = parseInt(btn.dataset.offset);
            const d = new Date();
            d.setDate(d.getDate() + offset);
            const val = d.toISOString().split('T')[0];
            if (dateEl) { dateEl.value = val <= todayDate ? val : todayDate; }
        });
    });

    const datePrev = g('of-date-prev');
    const dateNext = g('of-date-next');
    function _stepMonth(dir) {
        if (!dateEl) return;
        const current = dateEl.value ? new Date(dateEl.value + 'T00:00:00') : new Date();
        current.setMonth(current.getMonth() + dir);
        const val = current.toISOString().split('T')[0];
        dateEl.value = val <= todayDate ? val : todayDate;
    }
    datePrev?.addEventListener('click', () => _stepMonth(-1));
    dateNext?.addEventListener('click', () => _stepMonth(1));

    const dateCal = g('of-date-cal');
    dateCal?.addEventListener('click', () => { dateEl?.showPicker?.(); dateEl?.focus(); });

    const buyBtn = g('of-type-buy');
    const sellBtn = g('of-type-sell');

    buyBtn?.addEventListener('click', () => {
        g('of-type').value = 'Buy';
        buyBtn.className = 'btn btn-primary';
        sellBtn.className = 'btn btn-ghost';
        _checkSellWarning();
        _computeStampDuty();
    });
    sellBtn?.addEventListener('click', () => {
        g('of-type').value = 'Sell';
        sellBtn.className = 'btn btn-primary';
        buyBtn.className = 'btn btn-ghost';
        _checkSellWarning();
    });

    if (!isEdit) _computeStampDuty();

    const platformSelect = g('of-platform-select');
    const platformCustom = g('of-platform-custom');
    if (platformSelect) platformSelect.addEventListener('change', () => {
        if (platformSelect.value === '__other__') {
            platformCustom.style.display = 'block';
            platformCustom.focus();
        } else {
            platformCustom.style.display = 'none';
            platformCustom.value = '';
        }
    });

    window.app._orderSaveHandler = async () => {
        const holdingId = isEdit ? order[cfg.holdingIdField] : g('of-holding')?.value;
        const dateVal = g('of-date')?.value;
        const typeVal = g('of-type')?.value;
        const unitsVal = parseFloat(g('of-units')?.value);
        const priceVal = parseFloat(g('of-price')?.value);
        const amountVal = parseFloat(g('of-amount')?.value);
        const chargesVal = parseFloat(g('of-charges')?.value) || 0;
        const platformSel = g('of-platform-select')?.value || '';
        const platformVal = platformSel === '__other__' ? (g('of-platform-custom')?.value?.trim() || '') : platformSel;
        const remarksVal = g('of-remarks')?.value?.trim() || '';
        const todayStr = new Date().toISOString().split('T')[0];

        if (!holdingId) { Utilities.showNotification(`Please select a ${cfg.holdingLabel.toLowerCase()}`, 'error'); return; }
        if (!dateVal) { Utilities.showNotification('Please enter a date', 'error'); return; }
        if (dateVal > todayStr) { Utilities.showNotification('Date cannot be in the future', 'error'); return; }
        if (!typeVal) { Utilities.showNotification('Please select order type', 'error'); return; }
        if (!unitsVal || unitsVal <= 0) { Utilities.showNotification(`${cfg.unitsLabel} must be greater than zero`, 'error'); return; }
        if (!priceVal || priceVal <= 0) { Utilities.showNotification(`${cfg.priceLabel} must be greater than zero`, 'error'); return; }
        if (!amountVal || amountVal <= 0) { Utilities.showNotification('Amount must be greater than zero', 'error'); return; }
        if (chargesVal < 0) { Utilities.showNotification('Charges cannot be negative', 'error'); return; }

        const payload = {
            portfolio_id: portfolioId,
            [cfg.holdingIdField]: holdingId,
            execution_date: dateVal,
            order_type: typeVal,
            [cfg.unitsField]: unitsVal,
            [cfg.priceField]: priceVal,
            amount: amountVal,
            charges: chargesVal,
            platform: platformVal,
            remarks: remarksVal,
            amount_overridden: false,
        };

        try {
            if (isEdit) {
                const { portfolio_id: _p, [cfg.holdingIdField]: _h, ...updatePayload } = payload;
                await cfg.orderApi().update(order.id, updatePayload);
            } else {
                await cfg.orderApi().create(payload);
            }
            Utilities.showNotification(`Order ${isEdit ? 'updated' : 'added'} successfully`, 'success');
            window.app.closeModal();
            await renderOrderHistoryTab(el, portfolioId, assetType);
        } catch {
            Utilities.showNotification('Failed to save order', 'error');
        }
    };
}
