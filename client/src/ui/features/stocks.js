import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderStocks(portfolioId) {
    const container = document.getElementById('content-stocks');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.stocks.list(portfolioId);
        const stocks = resp?.data || [];

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
                    <td>${item.stock_name}</td>
                    <td>${item.ticker || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>${Utilities.formatCurrency(item.invested)}</td>
                    <td>${Utilities.formatCurrency(item.current)}</td>
                    <td class="${pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('stocks','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('stocks','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Stocks & ETFs</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('stocks')">+ Add Stock</button>
                    <button class="btn" onclick="window.app.refreshStocksLive()">🔄 Refresh Prices</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Invested</h3><p class="stat-value">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
            </div>
            ${stocks.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Ticker</th><th>Qty</th><th>Invested</th><th>Current</th><th>P/L</th><th>Actions</th></tr></thead>
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

export default renderStocks;
