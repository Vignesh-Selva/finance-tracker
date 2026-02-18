import Utilities from '../../utils/utils.js';

export async function renderLiabilities(dbManager) {
    const liabilities = await dbManager.getAll('liabilities');
    const totals = {
        loanAmount: liabilities.reduce((sum, item) => sum + (item.loanAmount || 0), 0),
        outstanding: liabilities.reduce((sum, item) => sum + (item.outstanding || 0), 0)
    };

    const totalPaid = totals.loanAmount - totals.outstanding;

    let html = `
        <div class="section-header">
            <h2>Liabilities</h2>
            <button class="btn btn-primary" onclick="window.app.showAddForm('liabilities')">➕ Add Liability</button>
        </div>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Total Outstanding</h3>
                <p class="stat-value negative">${Utilities.formatCurrency(totals.outstanding)}</p>
            </div>
            <div class="stat-card">
                <h3>Original Amount</h3>
                <p class="stat-value">${Utilities.formatCurrency(totals.loanAmount)}</p>
            </div>
            <div class="stat-card">
                <h3>Amount Paid</h3>
                <p class="stat-value positive">${Utilities.formatCurrency(totalPaid)}</p>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Lender</th>
                        <th>Original Amount</th>
                        <th>Outstanding</th>
                        <th>Interest Rate</th>
                        <th>EMI</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (liabilities.length === 0) {
        html += '<tr><td colspan="7" style="text-align: center;">No liabilities yet</td></tr>';
    } else {
        liabilities.forEach(l => {
            html += `
                <tr>
                    <td>${l.type || ''}</td>
                    <td>${l.lender || ''}</td>
                    <td>${Utilities.formatCurrency(l.loanAmount || 0)}</td>
                    <td>${Utilities.formatCurrency(l.outstanding || 0)}</td>
                    <td>${l.interestRate || 0}%</td>
                    <td>${l.emi ? Utilities.formatCurrency(l.emi) : 'N/A'}</td>
                    <td>
                        <button class="btn-icon" onclick="window.app.editEntry('liabilities', ${l.id})" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.app.deleteEntry('liabilities', ${l.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    document.getElementById('content-liabilities').innerHTML = html;
}

export default renderLiabilities;
