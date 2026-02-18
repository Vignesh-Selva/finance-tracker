import Utilities from '../../utils/utils.js';
import { Calculator } from '../../services/calculator.js';

export async function renderBudgets(dbManager) {
    const [budgets = [], transactions = []] = await Promise.all([
        dbManager.getAll('budgets'),
        dbManager.getAll('transactions')
    ]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        try {
            const tDate = new Date(t.date);
            return !isNaN(tDate.getTime()) && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        } catch (e) {
            console.warn('Invalid transaction for budget calc:', t);
            return false;
        }
    });

    const categoryTotals = Calculator.calculateCategoryExpenses(monthlyTransactions);

    const budgetSummaries = budgets.map(b => {
        const limit = parseFloat(b.limit) || 0;
        const actual = categoryTotals[b.category] || 0;
        const remaining = limit - actual;
        const progress = limit > 0 ? Math.min((actual / limit) * 100, 999).toFixed(1) : '0.0';
        return { ...b, limit, actual, remaining, progress };
    });

    const totalBudget = budgetSummaries.reduce((s, b) => s + (isNaN(b.limit) ? 0 : b.limit), 0);
    const totalActual = budgetSummaries.reduce((s, b) => s + (isNaN(b.actual) ? 0 : b.actual), 0);
    const totalRemaining = totalBudget - totalActual;

    const overspentMessages = budgetSummaries
        .filter(b => b.actual > b.limit && b.limit > 0)
        .map(b => `${b.category}: ${Utilities.formatCurrency(b.actual - b.limit)} over`);

    if (overspentMessages.length > 0) {
        Utilities.showNotification(`Overspent budgets - ${overspentMessages.join(', ')}`, 'error');
    }

    let html = `
        <div class="section-header">
            <h2>Budgets</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('budgets')">➕ Add Budget</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Budget</h3>
                <p class="stat-value">${Utilities.formatCurrency(totalBudget)}</p>
            </div>
            <div class="stat-card">
                <h3>Actual Spend</h3>
                <p class="stat-value">${Utilities.formatCurrency(totalActual)}</p>
            </div>
            <div class="stat-card">
                <h3>Remaining</h3>
                <p class="stat-value ${totalRemaining >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalRemaining)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Monthly Budget</th>
                        <th>Actual (Month)</th>
                        <th>Remaining</th>
                        <th>Progress</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (budgetSummaries.length === 0) {
        html += '<tr><td colspan="6" style="text-align:center;">No budgets yet</td></tr>';
    } else {
        budgetSummaries.forEach(b => {
            const over = b.actual > b.limit && b.limit > 0;
            const near = !over && b.limit > 0 && b.actual >= b.limit * 0.9;
            const progressValue = b.limit > 0 ? Math.min((b.actual / b.limit) * 100, 100) : 0;

            html += `
                <tr>
                    <td>${b.category}</td>
                    <td>${Utilities.formatCurrency(b.limit)}</td>
                    <td class="${over ? 'negative' : 'positive'}">${Utilities.formatCurrency(b.actual)}</td>
                    <td class="${over ? 'negative' : 'positive'}">${Utilities.formatCurrency(b.remaining)}</td>
                    <td>
                        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressValue.toFixed(1)}">
                            <div class="progress-fill" style="width:${progressValue}%"></div>
                        </div>
                        <p class="stat-change ${over ? 'negative' : near ? 'warning' : 'positive'}">${b.progress}% used</p>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('budgets', ${b.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('budgets', ${b.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-budgets').innerHTML = html;
}

export default renderBudgets;
