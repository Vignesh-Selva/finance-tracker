import Utilities from '../../utils/utils.js';

export async function renderCrypto(dbManager) {
    const crypto = await dbManager.getAll('crypto');
    const totals = {
        invested: crypto.reduce((sum, item) => sum + (item.invested || 0), 0),
        current: crypto.reduce((sum, item) => sum + (item.current || 0), 0)
    };

    const totalPL = totals.current - totals.invested;
    const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

    let html = `
        <div class="section-header">
            <h2>Cryptocurrency</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('crypto')">➕ Add Crypto</button>
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
                        <th>Coin Name</th>
                        <th>Platform</th>
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

    if (crypto.length === 0) {
        html += '<tr><td colspan="8" style="text-align: center;">No crypto holdings yet</td></tr>';
    } else {
        crypto.forEach(c => {
            const plData = Utilities.calculatePL(c.invested || 0, c.current || 0);
            html += `
                <tr>
                    <td>${c.coinName || ''}</td>
                    <td>${c.platform || ''}</td>
                    <td>${c.quantity || 0}</td>
                    <td>${Utilities.formatCurrency(c.invested || 0)}</td>
                    <td>${Utilities.formatCurrency(c.current || 0)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('crypto', ${c.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('crypto', ${c.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-crypto').innerHTML = html;
}

export default renderCrypto;
