import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderBudgets(portfolioId) {
    const container = document.getElementById('content-budgets');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [budgetResp, txResp] = await Promise.all([
            api.budgets.list(portfolioId),
            api.transactions.list(portfolioId),
        ]);

        const budgets = budgetResp?.data || [];
        const transactions = txResp?.data || [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenses = transactions.filter(t => {
            const d = new Date(t.date);
            return !isNaN(d.getTime()) && t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const categorySpent = {};
        monthlyExpenses.forEach(t => {
            const cat = t.category || 'Other';
            categorySpent[cat] = (categorySpent[cat] || 0) + (parseFloat(t.amount) || 0);
        });

        let tableRows = '';
        budgets.forEach(item => {
            const spent = categorySpent[item.category] || 0;
            const limit = parseFloat(item.monthly_limit) || 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100).toFixed(1) : 0;
            const overBudget = spent > limit;

            tableRows += `
                <tr>
                    <td>${item.category}</td>
                    <td>${Utilities.formatCurrency(limit)}</td>
                    <td class="${overBudget ? 'negative' : ''}">${Utilities.formatCurrency(spent)}</td>
                    <td>
                        <div class="progress-bar" style="height:8px;">
                            <div class="progress-fill ${overBudget ? 'over-budget' : ''}" style="width:${pct}%"></div>
                        </div>
                        <small>${pct}%</small>
                    </td>
                    <td>${item.notes || '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm" onclick="window.app.editEntry('budgets','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('budgets','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Budgets</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('budgets')">+ Add Budget</button>
            </div>
            ${budgets.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Category</th><th>Limit</th><th>Spent</th><th>Progress</th><th>Notes</th><th>Actions</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No budgets set yet. Click "+ Add Budget" to start tracking spending.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Budgets render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load budgets.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderBudgets;
