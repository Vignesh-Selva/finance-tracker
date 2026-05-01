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
                <div>
                    <p class="page-eyebrow">WEALTH OS · CRYPTO</p>
                    <h1 class="page-title">Crypto</h1>
                </div>
                <button class="btn btn-primary btn-add-desktop" onclick="window.app.showAddForm('crypto')">+ Add Crypto</button>
            </div>
            <div class="mft-tab-bar" id="cr-tab-bar">
                <button class="mft-tab ${_cryptoActiveTab === 'portfolio' ? 'active' : ''}" data-tab="portfolio">Portfolio</button>
                <button class="mft-tab ${_cryptoActiveTab === 'orderHistory' ? 'active' : ''}" data-tab="orderHistory">Order History</button>
            </div>
            <div id="cr-tab-content"></div>
            <button class="fab-add" onclick="window.app.showAddForm('crypto')" title="Add Crypto">+</button>
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

        // Platform badge colors
        const getPlatformBadge = (platform) => {
            if (!platform) return '—';
            const p = platform.toLowerCase();
            if (p.includes('coindcx')) {
                return `<span style="background:rgba(96,165,250,0.15);color:#60a5fa;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">CoinDCX</span>`;
            } else if (p.includes('binance')) {
                return `<span style="background:rgba(251,191,36,0.15);color:#fbbf24;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">Binance</span>`;
            } else if (p.includes('trust') || p.includes('wallet')) {
                return `<span style="background:rgba(192,132,252,0.15);color:#c084fc;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">Trust Wallet</span>`;
            }
            return `<span style="background:var(--surface3);color:var(--muted);padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">${platform}</span>`;
        };

        const visible = _cryptoShowClosed
            ? resolved
            : resolved.filter(c => !(c._derived && c._qty === 0));

        // Separate BTC holdings from others
        const visibleBtc = visible.filter(c => BTC_PATTERN.test((c.coin_name || '').trim()));
        const visibleNonBtc = visible.filter(c => !BTC_PATTERN.test((c.coin_name || '').trim()));

        // Sort non-BTC holdings
        const sortedNonBtc = sortData(visibleNonBtc, sort.col, sort.dir);

        // Combine: BTC grouped row first (if any), then sorted non-BTC
        let holdings = [];
        if (visibleBtc.length > 0) {
            const totalBtcInvested = visibleBtc.reduce((s, c) => s + c._invested, 0);
            const totalBtcCurrent = visibleBtc.reduce((s, c) => s + (parseFloat(c.current) || 0), 0);
            const totalBtcPl = totalBtcCurrent - totalBtcInvested;
            const totalBtcPlPct = totalBtcInvested > 0 ? ((totalBtcPl / totalBtcInvested) * 100).toFixed(2) : '0.00';
            holdings.push({
                _isBtcGroup: true,
                coin_name: 'BTC',
                platform: `${visibleBtc.length} platform${visibleBtc.length > 1 ? 's' : ''}`,
                _qty: totalBtcQty,
                _invested: totalBtcInvested,
                current: totalBtcCurrent,
                _pl: totalBtcPl,
                _plPct: totalBtcPlPct,
                _subRows: visibleBtc
            });
        }
        holdings = holdings.concat(sortedNonBtc);

        const totalInvested = holdings.reduce((s, f) => s + f._invested, 0);
        const totalCurrent = holdings.reduce((s, f) => s + (parseFloat(f.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';
        const closedCount = resolved.filter(c => c._derived && c._qty === 0).length;

        let tableRows = '';
        holdings.forEach(item => {
            let invested, current, pl, plPct, rowStyle = '';
            if (item._isBtcGroup) {
                invested = item._invested;
                current = item.current;
                pl = item._pl;
                plPct = item._plPct;
                rowStyle = 'cursor:pointer;';
            } else {
                invested = item._invested;
                current = parseFloat(item.current) || 0;
                pl = current - invested;
                plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
                const isClosed = item._derived && item._qty === 0;
                rowStyle = isClosed ? 'opacity:0.5;' : '';
            }

            let qtyCell;
            if (item._isBtcGroup) {
                qtyCell = `<span class="mono" style="font-size:12px;">${item._qty.toFixed(6)}</span>`;
            } else {
                const isClosed = item._derived && item._qty === 0;
                if (isClosed) {
                    qtyCell = `<span class="badge badge-muted">Closed</span>`;
                } else if (!item._derived) {
                    qtyCell = `
                        <span class="mono" style="font-size:12px;" title="${item._qty.toFixed(8)}">${item._qty.toFixed(6)}</span>
                        <span class="mono" style="cursor:pointer;margin-left:4px;font-size:11px;color:var(--muted);"
                            data-legacy-coin="${item.id}" title="No price history available">⏱</span>`;
                } else {
                    qtyCell = `<span class="mono" style="font-size:12px;" title="${item._qty.toFixed(8)}">${item._qty.toFixed(6)}</span>`;
                }
            }

            tableRows += `
                <tr style="${rowStyle}" data-btc-group="${item._isBtcGroup ? 'true' : ''}">
                    <td data-label="Coin">${item.coin_name}</td>
                    <td data-label="Platform">${item._isBtcGroup ? `<span style="color:var(--accent);font-size:12px;">▼</span> ${item.platform}` : getPlatformBadge(item.platform)}</td>
                    <td data-label="Qty">${qtyCell}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        ${item._isBtcGroup ? `<button class="btn btn-sm btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="this.closest('tr').nextElementSibling.style.display === 'none' ? (this.closest('tr').nextElementSibling.style.display='table-row', this.textContent='▲') : (this.closest('tr').nextElementSibling.style.display='none', this.textContent='▼')">▼</button>` : `
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('crypto','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('crypto','${item.id}')">Delete</button>`}
                    </td>
                </tr>`;
            if (item._isBtcGroup && item._subRows) {
                item._subRows.forEach((subItem, idx) => {
                    const subInvested = subItem._invested;
                    const subCurrent = parseFloat(subItem.current) || 0;
                    const subPl = subCurrent - subInvested;
                    const subPlPct = subInvested > 0 ? ((subPl / subInvested) * 100).toFixed(2) : '0.00';
                    const subQty = subItem._qty.toFixed(6);
                    tableRows += `
                        <tr style="background:var(--bg-elevated);" data-btc-subrow="true" style="display:none;" class="btc-subrow">
                            <td data-label="Coin" style="padding-left:32px;font-size:12px;color:var(--muted);">${subItem.coin_name}</td>
                            <td data-label="Platform">${getPlatformBadge(subItem.platform)}</td>
                            <td data-label="Qty" class="mono" style="font-size:11px;">${subQty}</td>
                            <td data-label="Invested" class="mono" style="font-size:11px;">${Utilities.formatCurrency(subInvested)}</td>
                            <td data-label="Current" class="mono" style="font-size:11px;">${Utilities.formatCurrency(subCurrent)}</td>
                            <td data-label="P/L" class="mono ${subPl >= 0 ? 'value-positive' : 'value-negative'}" style="font-size:11px;">${Utilities.formatCurrency(subPl)} (${subPlPct}%)</td>
                            <td class="actions">
                                <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('crypto','${subItem.id}')">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('crypto','${subItem.id}')">Delete</button>
                            </td>
                        </tr>`;
                });
            }
        });

        tabContent.innerHTML = `
            <div class="section-header">
                <div style="display:flex;gap:8px;align-items:center;">
                    ${closedCount > 0 ? `
                    <button class="btn btn-ghost btn-sm" id="cr-toggle-closed">
                        ${_cryptoShowClosed ? '📁 Hide Closed' : '📂 Show Closed'} (${closedCount})
                    </button>` : ''}
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Invested</h3><p class="stat-value mono">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value mono">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value mono ${totalPL >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
                <div class="stat-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <h3 style="margin:0;">₿ BTC Goal</h3>
                        <input type="number" value="${btcGoal}" min="0.001" step="0.001"
                            class="form-input" style="width:60px;padding:4px 8px;font-size:12px;"
                            onchange="window._updateBtcGoal(this.value)">
                    </div>
                    <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin:8px 0;">
                        <div style="height:100%;background:var(--accent);width:${btcProgress.toFixed(1)}%;border-radius:2px;transition:width 0.4s;"></div>
                    </div>
                    <p class="stat-change" style="font-size:11px;margin:0;">${totalBtcQty.toFixed(8)} / ${btcGoal} BTC <span style="color:var(--accent);">(${btcProgress.toFixed(1)}%)</span></p>
                </div>
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
            </div>
            <div class="mobile-list-container" style="display:none;background:var(--surface);border-radius:20px;padding:0;overflow:hidden;">
                ${holdings.map(item => {
            if (item._isBtcGroup) {
                const plClass = item._pl >= 0 ? 'color:var(--green)' : 'color:var(--red)';
                return `
                            <div class="mobile-compact-row mobile-btc-group" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:var(--bg-elevated;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-family:var(--font-ui);font-size:14px;color:var(--text-primary);font-weight:500;">${item.coin_name} <span style="color:var(--accent);font-size:11px;" class="btc-expand-icon">▼</span></span>
                                    <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-primary);font-weight:500;">${Utilities.formatCurrency(item.current)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">${item.platform}</span>
                                    <span style="font-family:var(--font-mono);font-size:11px;${plClass};font-weight:500;">${item._plPct}%</span>
                                </div>
                            </div>
                            <div class="mobile-btc-subrows" style="display:none;">
                                ${item._subRows.map(subItem => {
                    const subPl = subItem.current - subItem._invested;
                    const subPlPct = subItem._invested > 0 ? ((subPl / subItem._invested) * 100).toFixed(2) : '0.00';
                    const subPlClass = subPl >= 0 ? 'color:var(--green)' : 'color:var(--red)';
                    return `
                                    <div class="mobile-compact-row" style="padding:12px 16px 12px 32px;border-bottom:1px solid var(--border);cursor:pointer;background:var(--surface3);" data-coin-id="${subItem.id}">
                                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                            <span style="font-family:var(--font-ui);font-size:13px;color:var(--text-muted);font-weight:500;">${subItem.coin_name}</span>
                                            <span style="font-family:var(--font-mono);font-size:13px;color:var(--text-primary);font-weight:500;">${Utilities.formatCurrency(subItem.current)}</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;align-items:center;">
                                            <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted);">${subItem.platform}</span>
                                            <span style="font-family:var(--font-mono);font-size:10px;${subPlClass};font-weight:500;">${subPlPct}%</span>
                                        </div>
                                    </div>
                                `;
                }).join('')}
                            </div>
                        `;
            }
            const invested = item._invested;
            const current = parseFloat(item.current) || 0;
            const pl = current - invested;
            const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
            const plClass = pl >= 0 ? 'color:var(--green)' : 'color:var(--red)';
            return `
                        <div class="mobile-compact-row" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;" data-coin-id="${item.id}">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-family:var(--font-ui);font-size:14px;color:var(--text-primary);font-weight:500;">${item.coin_name}</span>
                                <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-primary);font-weight:500;">${Utilities.formatCurrency(current)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">${item.coin_name} · ${item._qty.toFixed(6)}</span>
                                <span style="font-family:var(--font-mono);font-size:11px;${plClass};font-weight:500;">${plPct}%</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>` : '<p class="empty-state">No crypto holdings added yet.</p>'}
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

        // BTC group row expand/collapse
        tabContent.querySelector('[data-btc-group="true"]')?.addEventListener('click', (e) => {
            const subRows = tabContent.querySelectorAll('.btc-subrow');
            const isHidden = subRows[0]?.style.display === 'none' || subRows[0]?.style.display === '';
            subRows.forEach(row => {
                row.style.display = isHidden ? 'table-row' : 'none';
            });
            const icon = e.target.closest('tr').querySelector('[data-btc-group="true"] td:nth-child(2) span');
            if (icon) icon.textContent = isHidden ? '▲' : '▼';
        });

        // Mobile list tap handlers
        tabContent.querySelectorAll('[data-coin-id]').forEach(row => {
            row.addEventListener('click', () => {
                const coinId = row.dataset.coinId;
                const coin = holdings.find(c => c.id === coinId);
                if (!coin) return;
                const invested = coin._invested;
                const current = parseFloat(coin.current) || 0;
                const pl = current - invested;
                const plPct = invested > 0 ? ((pl / invested) * 100).toFixed(2) : '0.00';
                const fields = {
                    'Coin Name': coin.coin_name,
                    'Platform': coin.platform || '—',
                    'Quantity': coin._qty.toFixed(8),
                    'Invested': Utilities.formatCurrency(invested),
                    'Current Value': Utilities.formatCurrency(current),
                    'P/L': `${Utilities.formatCurrency(pl)} (${plPct}%)`,
                };
                const actions = [
                    {
                        label: 'Edit',
                        onClick: () => {
                            window.app.editEntry('crypto', coinId);
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
                            window.app.deleteEntry('crypto', coinId);
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

        // Mobile BTC group expansion toggle
        tabContent.querySelectorAll('.mobile-btc-group').forEach(groupRow => {
            groupRow.addEventListener('click', (e) => {
                const subrowsContainer = groupRow.nextElementSibling;
                const icon = groupRow.querySelector('.btc-expand-icon');
                if (subrowsContainer && subrowsContainer.classList.contains('mobile-btc-subrows')) {
                    const isHidden = subrowsContainer.style.display === 'none' || subrowsContainer.style.display === '';
                    subrowsContainer.style.display = isHidden ? 'block' : 'none';
                    if (icon) icon.textContent = isHidden ? '▲' : '▼';
                }
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

