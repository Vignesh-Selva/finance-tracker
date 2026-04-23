import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

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
    return `<th class="${cls}" onclick="window.app.setSortState('stocks','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderStocks(portfolioId) {
    const container = document.getElementById('content-stocks');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.stocks.list(portfolioId);
        const sort = window.app?.getSortState('stocks') || { col: null, dir: 'asc' };
        const stocks = sortData(resp?.data || [], sort.col, sort.dir);

        const totalInvested = stocks.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
        const totalCurrent = stocks.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';

        let tableRows = '';
        stocks.forEach(item => {
            const pl = (parseFloat(item.current) || 0) - (parseFloat(item.invested) || 0);
            const plPct = parseFloat(item.invested) > 0 ? ((pl / item.invested) * 100).toFixed(2) : '0.00';
            tableRows += `
                <tr>
                    <td data-label="Name">${item.stock_name}</td>
                    <td data-label="Ticker">${item.ticker || '-'}</td>
                    <td data-label="Qty">${item.quantity}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(item.invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(item.current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('stocks','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('stocks','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Stocks & ETFs</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('stocks')">+ Add Stock</button>
                    <button class="btn btn-ghost" onclick="window.app.refreshStocksLive()">🔄 Refresh Prices</button>
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
                        ${th('Qty', 'quantity', sort)}
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'pl_sort', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No stocks added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Stocks render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load stocks.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

