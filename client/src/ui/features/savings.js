import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderSavings(portfolioId) {
    const container = document.getElementById('content-savings');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.savings.list(portfolioId);
        const savings = resp?.data || [];

        const total = savings.reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);

        let tableRows = '';
        savings.forEach(item => {
            tableRows += `
                <tr>
                    <td>${item.bank_name}</td>
                    <td>${item.account_type}</td>
                    <td>${Utilities.formatCurrency(item.balance)}</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('savings','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('savings','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Savings Accounts</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('savings')">+ Add Account</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Total Savings</h3>
                    <p class="stat-value">${Utilities.formatCurrency(total)}</p>
                </div>
            </div>
            ${savings.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Bank</th><th>Type</th><th>Balance</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No savings accounts added yet. Click "+ Add Account" to get started.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Savings render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load savings.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderSavings;
