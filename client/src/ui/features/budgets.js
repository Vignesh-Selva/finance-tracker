import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

function th(label, col, sort) {
    const active = sort.col === col;
    const icon = active ? (sort.dir === 'asc' ? '▴' : '▾') : '▴▾';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('budgets','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderBudgets(portfolioId) {
    const container = document.getElementById('content-budgets');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const [budgetResp, txResp] = await Promise.all([
            api.budgets.list(portfolioId),
            api.transactions.list(portfolioId),
        ]);

        const sort = window.app?.getSortState('budgets') || { col: null, dir: 'asc' };
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

        const budgetRows = budgets.map(item => ({
            ...item,
            _spent: categorySpent[item.category] || 0,
        }));

        const sorted = sort.col ? [...budgetRows].sort((a, b) => {
            const av = sort.col === 'monthly_limit' ? parseFloat(a.monthly_limit) || 0 :
                       sort.col === '_spent'        ? a._spent :
                       (a[sort.col] || '').toLowerCase();
            const bv = sort.col === 'monthly_limit' ? parseFloat(b.monthly_limit) || 0 :
                       sort.col === '_spent'        ? b._spent :
                       (b[sort.col] || '').toLowerCase();
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        }) : budgetRows;

        let tableRows = '';
        sorted.forEach(item => {
            const spent = item._spent;
            const limit = parseFloat(item.monthly_limit) || 0;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100).toFixed(1) : 0;
            const overBudget = spent > limit;

            tableRows += `
                <tr>
                    <td data-label="Category">${item.category}</td>
                    <td data-label="Limit" class="mono">${Utilities.formatCurrency(limit)}</td>
                    <td data-label="Spent" class="mono ${overBudget ? 'value-negative' : ''}">${Utilities.formatCurrency(spent)}</td>
                    <td data-label="Progress">
                        <div class="progress-bar" style="height:8px;">
                            <div class="progress-fill ${overBudget ? 'over-budget' : ''}" style="width:${pct}%"></div>
                        </div>
                        <small>${pct}%</small>
                    </td>
                    <td data-label="Notes">${item.notes || '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('budgets','${item.id}')">Edit</button>
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
                    <thead><tr>
                        ${th('Category', 'category', sort)}
                        ${th('Limit', 'monthly_limit', sort)}
                        ${th('Spent', '_spent', sort)}
                        <th>Progress</th>
                        <th>Notes</th>
                        <th>Actions</th>
                    </tr></thead>
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

