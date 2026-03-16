import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderFixedDeposits(portfolioId) {
    const container = document.getElementById('content-fixedDeposits');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.fixedDeposits.list(portfolioId);
        const fds = resp?.data || [];

        const totalInvested = fds.reduce((sum, item) => sum + (parseFloat(item.invested) || 0), 0);
        const totalMaturity = fds.reduce((sum, item) => sum + (parseFloat(item.maturity) || 0), 0);

        let tableRows = '';
        fds.forEach(item => {
            tableRows += `
                <tr>
                    <td>${item.bank_name}</td>
                    <td>${Utilities.formatCurrency(item.invested)}</td>
                    <td>${Utilities.formatCurrency(item.maturity)}</td>
                    <td>${item.interest_rate}%</td>
                    <td>${Utilities.formatDate(item.start_date)}</td>
                    <td>${Utilities.formatDate(item.maturity_date)}</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('fixedDeposits','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('fixedDeposits','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Fixed Deposits</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('fixedDeposits')">+ Add FD</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Total Invested</h3><p class="stat-value">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Total Maturity</h3><p class="stat-value">${Utilities.formatCurrency(totalMaturity)}</p></div>
            </div>
            ${fds.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Bank</th><th>Invested</th><th>Maturity</th><th>Rate</th><th>Start</th><th>Maturity Date</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No fixed deposits added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('FD render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load fixed deposits.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderFixedDeposits;
