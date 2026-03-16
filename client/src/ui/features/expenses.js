import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderExpenses(portfolioId) {
    const container = document.getElementById('content-expenses');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.transactions.list(portfolioId);
        const transactions = resp?.data || [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthly = transactions.filter(t => {
            const d = new Date(t.date);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalIncome = monthly.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const totalExpenses = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const balance = totalIncome - totalExpenses;

        let tableRows = '';
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
        sorted.forEach(item => {
            const typeClass = item.type === 'income' ? 'positive' : 'negative';
            tableRows += `
                <tr>
                    <td>${Utilities.formatDate(item.date)}</td>
                    <td class="${typeClass}">${item.type}</td>
                    <td>${item.category || '-'}</td>
                    <td>${Utilities.formatCurrency(item.amount)}</td>
                    <td>${item.description || '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('transactions','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('transactions','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Expenses & Income</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('transactions')">+ Add Transaction</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Income (This Month)</h3><p class="stat-value positive">${Utilities.formatCurrency(totalIncome)}</p></div>
                <div class="stat-card"><h3>Expenses (This Month)</h3><p class="stat-value negative">${Utilities.formatCurrency(totalExpenses)}</p></div>
                <div class="stat-card"><h3>Balance</h3><p class="stat-value ${balance >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(balance)}</p></div>
            </div>
            ${transactions.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No transactions added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Expenses render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load expenses.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderExpenses;
