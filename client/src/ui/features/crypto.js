import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderCrypto(portfolioId) {
    const container = document.getElementById('content-crypto');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.crypto.list(portfolioId);
        const holdings = resp?.data || [];

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
                    <td>${item.coin_name}</td>
                    <td>${item.platform || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>${Utilities.formatCurrency(item.invested)}</td>
                    <td>${Utilities.formatCurrency(item.current)}</td>
                    <td class="${pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(pl)} (${plPct}%)</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('crypto','${item.id}')">Edit</button>
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
                <div class="stat-card"><h3>Invested</h3><p class="stat-value">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Current Value</h3><p class="stat-value">${Utilities.formatCurrency(totalCurrent)}</p></div>
                <div class="stat-card"><h3>P/L</h3><p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)} (${plPercent}%)</p></div>
            </div>
            ${holdings.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Coin</th><th>Platform</th><th>Qty</th><th>Invested</th><th>Current</th><th>P/L</th><th>Actions</th></tr></thead>
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

export default renderCrypto;
