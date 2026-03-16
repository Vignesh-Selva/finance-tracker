import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderMutualFunds(portfolioId) {
    const container = document.getElementById('content-mutualFunds');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.mutualFunds.list(portfolioId);
        const funds = resp?.data || [];

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
                    <td>${item.fund_name}</td>
                    <td>${item.fund_type || 'Equity'}</td>
                    <td>${Utilities.formatCurrency(item.invested)}</td>
                    <td>${Utilities.formatCurrency(item.current)}</td>
                    <td class="${pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('mutualFunds','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('mutualFunds','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Mutual Funds</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="window.app.showAddForm('mutualFunds')">+ Add Fund</button>
                    <button class="btn" onclick="window.app.refreshMutualFundsLive()">🔄 Refresh NAV</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Invested</h3><p class="stat-value">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
            </div>
            ${funds.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Fund</th><th>Type</th><th>Invested</th><th>Current</th><th>P/L</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No mutual funds added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('MF render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load mutual funds.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderMutualFunds;
