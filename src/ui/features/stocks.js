import Utilities from '../../utils/utils.js';

export async function renderStocks(dbManager) {
    const stocks = await dbManager.getAll('stocks');
    const totals = {
        invested: stocks.reduce((sum, item) => sum + (item.invested || 0), 0),
        current: stocks.reduce((sum, item) => sum + (item.current || 0), 0)
    };

    const totalPL = totals.current - totals.invested;
    const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

    let html = `
        <div class="section-header">
            <h2>Stocks</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshStocksLive()">🔄 Refresh Live</button>
                <button class="btn btn-primary" onclick="window.app.showAddForm('stocks')">➕ Add Stock</button>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Current Value</h3>
                <p class="stat-value">${Utilities.formatCurrency(totals.current)}</p>
            </div>
            <div class="stat-card">
                <h3>Total P/L</h3>
                <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)}</p>
                <p class="stat-change">${totalPLPercent}%</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Stock Name</th>
                        <th>Ticker</th>
                        <th>Quantity</th>
                        <th>Invested</th>
                        <th>Current</th>
                        <th>P/L</th>
                        <th>P/L %</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (stocks.length === 0) {
        html += '<tr><td colspan="8" style="text-align: center;">No stocks yet</td></tr>';
    } else {
        stocks.forEach(stock => {
            const plData = Utilities.calculatePL(stock.invested || 0, stock.current || 0);
            html += `
                <tr>
                    <td>${stock.stockName || ''}</td>
                    <td>${stock.ticker || ''}</td>
                    <td>${stock.quantity || 0}</td>
                    <td>${Utilities.formatCurrency(stock.invested || 0)}</td>
                    <td>${Utilities.formatCurrency(stock.current || 0)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('stocks', ${stock.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('stocks', ${stock.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-stocks').innerHTML = html;
}

export default renderStocks;
