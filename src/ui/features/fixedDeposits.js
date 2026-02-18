import Utilities from '../../utils/utils.js';

export async function renderFixedDeposits(dbManager) {
    const fixedDeposits = await dbManager.getAll('fixedDeposits');
    const totals = {
        invested: fixedDeposits.reduce((sum, item) => sum + (item.invested || 0), 0),
        maturity: fixedDeposits.reduce((sum, item) => sum + (item.maturity || 0), 0)
    };

    let html = `
        <div class="section-header">
            <h2>Fixed Deposits</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('fixedDeposits')">➕ Add FD</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Invested</h3>
                <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
            </div>
            <div class="stat-card">
                <h3>Maturity Value</h3>
                <p class="stat-value">${Utilities.formatCurrency(totals.maturity)}</p>
            </div>
            <div class="stat-card">
                <h3>Expected Gain</h3>
                <p class="stat-value positive">${Utilities.formatCurrency(totals.maturity - totals.invested)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bank Name</th>
                        <th>Invested</th>
                        <th>Maturity</th>
                        <th>Interest Rate</th>
                        <th>Maturity Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (fixedDeposits.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center;">No fixed deposits yet</td></tr>';
    } else {
        fixedDeposits.forEach(fd => {
            html += `
                <tr>
                    <td>${fd.bankName || ''}</td>
                    <td>${Utilities.formatCurrency(fd.invested || 0)}</td>
                    <td>${Utilities.formatCurrency(fd.maturity || 0)}</td>
                    <td>${fd.interestRate || 0}%</td>
                    <td>${Utilities.formatDate(fd.maturityDate)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('fixedDeposits', ${fd.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('fixedDeposits', ${fd.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-fixedDeposits').innerHTML = html;
}

export default renderFixedDeposits;
