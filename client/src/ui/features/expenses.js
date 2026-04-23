import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

function sortData(data, col, dir) {
    return [...data].sort((a, b) => {
        let av = a[col];
        let bv = b[col];
        if (col === 'date') {
            av = new Date(av).getTime();
            bv = new Date(bv).getTime();
        } else if (col === 'amount') {
            av = parseFloat(av) || 0;
            bv = parseFloat(bv) || 0;
        } else {
            av = (av || '').toLowerCase();
            bv = (bv || '').toLowerCase();
        }
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

function th(label, col, sort) {
    const active = sort.col === col;
    const icon = active ? (sort.dir === 'asc' ? '▴' : '▾') : '▴▾';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('expenses','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderExpenses(portfolioId) {
    const container = document.getElementById('content-expenses');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.transactions.list(portfolioId);
        const sort = window.app?.getSortState('expenses') || { col: 'date', dir: 'desc' };
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
        const sorted = sortData(transactions, sort.col, sort.dir).slice(0, 50);
        sorted.forEach(item => {
            const typeClass = item.type === 'income' ? 'value-positive' : 'value-negative';
            tableRows += `
                <tr>
                    <td data-label="Date">${Utilities.formatDate(item.date)}</td>
                    <td data-label="Type" class="${typeClass}">${item.type}</td>
                    <td data-label="Category">${item.category || '-'}</td>
                    <td data-label="Amount" class="mono">${Utilities.formatCurrency(item.amount)}</td>
                    <td data-label="Description">${item.description || '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('transactions','${item.id}')">Edit</button>
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
                    <thead><tr>
                        ${th('Date', 'date', sort)}
                        ${th('Type', 'type', sort)}
                        ${th('Category', 'category', sort)}
                        ${th('Amount', 'amount', sort)}
                        ${th('Description', 'description', sort)}
                        <th>Actions</th>
                    </tr></thead>
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

