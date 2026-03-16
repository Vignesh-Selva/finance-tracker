import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderLiabilities(portfolioId) {
    const container = document.getElementById('content-liabilities');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.liabilities.list(portfolioId);
        const items = resp?.data || [];

        const totalOutstanding = items.reduce((s, i) => s + (parseFloat(i.outstanding) || 0), 0);
        const totalEmi = items.reduce((s, i) => s + (parseFloat(i.emi) || 0), 0);

        let tableRows = '';
        items.forEach(item => {
            tableRows += `
                <tr>
                    <td>${item.type}</td>
                    <td>${item.lender || '-'}</td>
                    <td>${Utilities.formatCurrency(item.loan_amount)}</td>
                    <td>${Utilities.formatCurrency(item.outstanding)}</td>
                    <td>${item.interest_rate}%</td>
                    <td>${item.emi ? Utilities.formatCurrency(item.emi) : '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('liabilities','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('liabilities','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Liabilities</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('liabilities')">+ Add Liability</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Total Outstanding</h3><p class="stat-value">${Utilities.formatCurrency(totalOutstanding)}</p></div>
                <div class="stat-card"><h3>Total EMI</h3><p class="stat-value">${Utilities.formatCurrency(totalEmi)}</p></div>
            </div>
            ${items.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Type</th><th>Lender</th><th>Loan Amount</th><th>Outstanding</th><th>Rate</th><th>EMI</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No liabilities added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Liabilities render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load liabilities.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderLiabilities;
