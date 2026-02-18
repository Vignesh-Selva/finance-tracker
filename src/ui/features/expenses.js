import Utilities from '../../utils/utils.js';
import { Calculator } from '../../services/calculator.js';

export async function renderExpenses(dbManager) {
    const transactions = await dbManager.getAll('transactions');
    const expenseTotals = await Calculator.calculateExpenseTotals(dbManager);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `
        <div class="section-header">
            <h2>Monthly Expenses</h2>
            <button class="btn btn-primary" onclick="window.app.showAddTransactionForm()">➕ Add Transaction</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Income</h3>
                <p class="stat-value positive">${Utilities.formatCurrency(expenseTotals.income)}</p>
            </div>
            <div class="stat-card">
                <h3>Expenses</h3>
                <p class="stat-value negative">${Utilities.formatCurrency(expenseTotals.expenses)}</p>
            </div>
            <div class="stat-card">
                <h3>Balance</h3>
                <p class="stat-value ${expenseTotals.balance >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(expenseTotals.balance)}</p>
            </div>
            <div class="stat-card">
                <h3>Transactions</h3>
                <p class="stat-value">${expenseTotals.transactionCount}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (monthlyTransactions.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center;">No transactions yet</td></tr>';
    } else {
        monthlyTransactions.forEach(t => {
            html += `
                <tr>
                    <td>${Utilities.formatDate(t.date)}</td>
                    <td><span class="badge badge-${t.type}">${t.type}</span></td>
                    <td>${t.category}</td>
                    <td>${t.description || '-'}</td>
                    <td class="${t.type === 'income' ? 'positive' : 'negative'}">${Utilities.formatCurrency(t.amount)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editTransaction(${t.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteTransaction(${t.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-expenses').innerHTML = html;
}

export default renderExpenses;
