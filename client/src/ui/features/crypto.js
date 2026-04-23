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
    return `<th class="${cls}" onclick="window.app.setSortState('crypto','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderCrypto(portfolioId) {
    const container = document.getElementById('content-crypto');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.crypto.list(portfolioId);
        const sort = window.app?.getSortState('crypto') || { col: null, dir: 'asc' };
        const holdings = sortData(resp?.data || [], sort.col, sort.dir);

        const totalInvested = holdings.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
        const totalCurrent = holdings.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const plPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';

        let tableRows = '';
        holdings.forEach(item => {
            const pl = (parseFloat(item.current) || 0) - (parseFloat(item.invested) || 0);
            const plPct = parseFloat(item.invested) > 0 ? ((pl / item.invested) * 100).toFixed(2) : '0.00';
            tableRows += `
                <tr>
                    <td data-label="Coin">${item.coin_name}</td>
                    <td data-label="Platform">${item.platform || '-'}</td>
                    <td data-label="Qty">${item.quantity}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(item.invested)}</td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(item.current)}</td>
                    <td data-label="P/L" class="mono ${pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('crypto','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('crypto','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Crypto</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('crypto')">+ Add Crypto</button>
                    <button class="btn" onclick="window.app.refreshCryptoLive()">🔄 Refresh Prices</button>
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
                        ${th('Qty', 'quantity', sort)}
                        ${th('Invested', 'invested', sort)}
                        ${th('Current', 'current', sort)}
                        ${th('P/L', 'current', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No crypto holdings added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Crypto render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load crypto.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

