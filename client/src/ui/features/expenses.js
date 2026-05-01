import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

let _expenseTab = 'transactions';

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
    const icon = active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲▼';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('expenses','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderExpenses(portfolioId) {
    const container = document.getElementById('content-expenses');

    container.innerHTML = `
        <div class="section-header" style="margin-bottom:0;">
            <h2>Expenses & Income</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-add-desktop" onclick="window.app.showAddForm('transactions')">+ Transaction</button>
                <button class="btn btn-ghost btn-add-desktop" onclick="window._showAddRecurring()">+ Recurring</button>
            </div>
        </div>
        <div class="mft-tab-bar" style="margin-top:12px;">
            <button class="mft-tab ${_expenseTab === 'transactions' ? 'active' : ''}" onclick="window._switchExpenseTab('transactions')">💸 Transactions</button>
            <button class="mft-tab ${_expenseTab === 'recurring' ? 'active' : ''}" onclick="window._switchExpenseTab('recurring')">🔁 Recurring Templates</button>
        </div>
        <div id="expense-tab-content"></div>
        <button class="fab-add" onclick="window._expenseFabAdd()" title="Add">+</button>`;

    window._switchExpenseTab = (tab) => {
        _expenseTab = tab;
        container.querySelectorAll('.mft-tab').forEach(b => b.classList.toggle('active', b.textContent.includes(tab === 'transactions' ? 'Transactions' : 'Recurring')));
        if (tab === 'transactions') renderTransactionsTab(portfolioId);
        else renderRecurringTab(portfolioId);
    };

    window._showAddRecurring = () => window.app.showAddForm('recurringTransactions');
    window._expenseFabAdd = () => {
        if (_expenseTab === 'transactions') window.app.showAddForm('transactions');
        else window.app.showAddForm('recurringTransactions');
    };

    if (_expenseTab === 'transactions') renderTransactionsTab(portfolioId);
    else renderRecurringTab(portfolioId);
}

async function renderTransactionsTab(portfolioId) {
    const content = document.getElementById('expense-tab-content');
    if (!content) return;
    content.innerHTML = '<div class="skeleton-card"></div>';
    try {
        const resp = await api.transactions.list(portfolioId);
        const sort = window.app?.getSortState('expenses') || { col: 'date', dir: 'desc' };
        const transactions = resp?.data || [];

        const now = new Date();
        const monthly = transactions.filter(t => {
            const d = new Date(t.date);
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const totalIncome = monthly.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const totalExpenses = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const balance = totalIncome - totalExpenses;

        let tableRows = '';
        sortData(transactions, sort.col, sort.dir).slice(0, 50).forEach(item => {
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

        content.innerHTML = `
            <div class="stat-grid" style="margin-top:16px;">
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
            </div>` : '<p class="empty-state">No transactions added yet.</p>'}`;
    } catch {
        content.innerHTML = '<div class="error-state"><p>Failed to load expenses.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

async function renderRecurringTab(portfolioId) {
    const content = document.getElementById('expense-tab-content');
    if (!content) return;
    content.innerHTML = '<div class="skeleton-card"></div>';
    try {
        const resp = await api.recurringTransactions.list(portfolioId);
        const items = resp?.data || [];

        const monthlyIncome = items.filter(i => i.type === 'income' && i.frequency === 'monthly').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        const monthlyExpense = items.filter(i => i.type === 'expense' && i.frequency === 'monthly').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

        const rows = items.map(item => {
            const typeClass = item.type === 'income' ? 'value-positive' : 'value-negative';
            const nextDate = item.next_date ? Utilities.formatDate(item.next_date) : '—';
            return `
                <tr>
                    <td data-label="Name">${item.name}</td>
                    <td data-label="Type" class="${typeClass}">${item.type}</td>
                    <td data-label="Amount" class="mono">${Utilities.formatCurrency(item.amount)}</td>
                    <td data-label="Frequency"><span class="badge badge-muted">${item.frequency}</span></td>
                    <td data-label="Category">${item.category || '—'}</td>
                    <td data-label="Next Date">${nextDate}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('recurringTransactions','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('recurringTransactions','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        }).join('');

        content.innerHTML = `
            <div class="stat-grid" style="margin-top:16px;">
                <div class="stat-card"><h3>Monthly Recurring Income</h3><p class="stat-value positive">${Utilities.formatCurrency(monthlyIncome)}</p></div>
                <div class="stat-card"><h3>Monthly Recurring Expense</h3><p class="stat-value negative">${Utilities.formatCurrency(monthlyExpense)}</p></div>
                <div class="stat-card"><h3>Templates</h3><p class="stat-value">${items.length}</p></div>
            </div>
            ${items.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Name</th><th>Type</th><th>Amount</th>
                        <th>Frequency</th><th>Category</th><th>Next Date</th><th>Actions</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No recurring templates. Click "+ Recurring" to add one.</p>'}`;
    } catch {
        content.innerHTML = '<div class="error-state"><p>Failed to load recurring templates.</p></div>';
    }
}

