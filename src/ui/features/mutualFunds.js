import Utilities from '../../utils/utils.js';

export async function renderMutualFunds(dbManager) {
    const mutualFunds = await dbManager.getAll('mutualFunds');
    const totals = {
        invested: mutualFunds.reduce((sum, item) => sum + (item.invested || 0), 0),
        current: mutualFunds.reduce((sum, item) => sum + (item.current || 0), 0)
    };

    const totalPL = totals.current - totals.invested;
    const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

    let html = `
        <div class="section-header">
            <h2>Mutual Funds</h2>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="window.app.refreshMutualFundsLive()">🔄 Refresh Live</button>
                <button class="btn btn-primary" onclick="window.app.showAddForm('mutualFunds')">➕ Add Fund</button>
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
                        <th>Fund Name</th>
                        <th>Type</th>
                        <th>Units</th>
                        <th>Invested</th>
                        <th>Current</th>
                        <th>P/L</th>
                        <th>P/L %</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (mutualFunds.length === 0) {
        html += '<tr><td colspan="8" style="text-align: center;">No mutual funds yet</td></tr>';
    } else {
        mutualFunds.forEach(mf => {
            const plData = Utilities.calculatePL(mf.invested || 0, mf.current || 0);
            html += `
                <tr>
                    <td>${mf.fundName || ''}</td>
                    <td>${mf.type || ''}</td>
                    <td>${mf.units || 0}</td>
                    <td>${Utilities.formatCurrency(mf.invested || 0)}</td>
                    <td>${Utilities.formatCurrency(mf.current || 0)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                    <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('mutualFunds', ${mf.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('mutualFunds', ${mf.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-mutualFunds').innerHTML = html;
}

export default renderMutualFunds;
