import Utilities from '../../utils/utils.js';
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

// ─── Module state ──────────────────────────────────────────
let _activeTab = 'portfolio';     // 'portfolio' | 'tracker'
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
    } else {
        await renderTrackerTab(container);
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
                <button class="mft-tab ${_activeTab === 'tracker' ? 'active' : ''}" data-tab="tracker">
                    🔍 Fund Research
                </button>
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
            } else {
                await renderTrackerTab(container);
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
    const icon = active ? (sort.dir === 'asc' ? '▴' : '▾') : '▴▾';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('mutualFunds','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

// ─── Tab 1: Portfolio (original Supabase tracker) ─────────
async function renderPortfolioTab(container, portfolioId) {
    const content = container.querySelector('#mft-tab-content');
    content.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.mutualFunds.list(portfolioId);
        const sort = window.app?.getSortState('mutualFunds') || { col: null, dir: 'asc' };
        const funds = sortData(resp?.data || [], sort.col, sort.dir);

        const totalInvested = funds.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
        const totalCurrent = funds.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';

        let tableRows = '';
        funds.forEach(item => {
            const pl = (parseFloat(item.current) || 0) - (parseFloat(item.invested) || 0);
            const plPct = parseFloat(item.invested) > 0 ? ((pl / item.invested) * 100).toFixed(2) : '0.00';
            tableRows += `
                <tr>
                    <td data-label="Fund">${item.fund_name}</td>
                    <td data-label="Type">${item.fund_type || 'Equity'}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(item.invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(item.current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('mutualFunds','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('mutualFunds','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        content.innerHTML = `
            <div class="section-header" style="margin-top:20px;">
                <div></div>
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
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'current', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No mutual funds added yet.</p>'}
        `;
    } catch (error) {
        console.error('MF portfolio render error:', error);
        content.innerHTML = '<div class="error-state"><p>Failed to load mutual funds.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
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
