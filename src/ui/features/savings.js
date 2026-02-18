import Utilities from '../../utils/utils.js';

export async function renderSavings(dbManager) {
    const savings = await dbManager.getAll('savings');
    const total = savings.reduce((sum, item) => sum + (item.balance || 0), 0);

    let html = `
        <div class="section-header">
            <h2>Savings Accounts</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('savings')">➕ Add Account</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Savings</h3>
                <p class="stat-value">${Utilities.formatCurrency(total)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bank Name</th>
                        <th>Account Type</th>
                        <th>Balance</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (savings.length === 0) {
        html += '<tr><td colspan="4" style="text-align: center;">No savings accounts yet</td></tr>';
    } else {
        savings.forEach(s => {
            html += `
                <tr>
                    <td>${s.bankName || ''}</td>
                    <td>${s.accountType || ''}</td>
                    <td>${Utilities.formatCurrency(s.balance || 0)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('savings', ${s.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('savings', ${s.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-savings').innerHTML = html;
}

export default renderSavings;
