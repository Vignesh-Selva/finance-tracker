import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

function sortData(data, col, dir) {
    if (!col) return data;
    return [...data].sort((a, b) => {
        const av = parseFloat(a[col]) || (typeof a[col] === 'string' ? a[col].toLowerCase() : 0);
        const bv = parseFloat(b[col]) || (typeof b[col] === 'string' ? b[col].toLowerCase() : 0);
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
    });
}

function th(label, col, sort) {
    const active = sort.col === col;
    const icon = active ? (sort.dir === 'asc' ? '▴' : '▾') : '▴▾';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('liabilities','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderLiabilities(portfolioId) {
    const container = document.getElementById('content-liabilities');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.liabilities.list(portfolioId);
        const sort = window.app?.getSortState('liabilities') || { col: null, dir: 'asc' };
        const items = sortData(resp?.data || [], sort.col, sort.dir);

        const totalOutstanding = items.reduce((s, i) => s + (parseFloat(i.outstanding) || 0), 0);
        const totalEmi = items.reduce((s, i) => s + (parseFloat(i.emi) || 0), 0);

        let tableRows = '';
        items.forEach(item => {
            tableRows += `
                <tr>
                    <td data-label="Type">${item.type}</td>
                    <td data-label="Lender">${item.lender || '-'}</td>
                    <td data-label="Loan Amt" class="mono">${Utilities.formatCurrency(item.loan_amount)}</td>
                    <td data-label="Outstanding" class="mono">${Utilities.formatCurrency(item.outstanding)}</td>
                    <td data-label="Rate">${item.interest_rate}%</td>
                    <td data-label="EMI" class="mono">${item.emi ? Utilities.formatCurrency(item.emi) : '-'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('liabilities','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('liabilities','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Liabilities</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('liabilities')">+ Add Liability</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Total Outstanding</h3><p class="stat-value">${Utilities.formatCurrency(totalOutstanding)}</p></div>
                <div class="stat-card"><h3>Total EMI</h3><p class="stat-value">${Utilities.formatCurrency(totalEmi)}</p></div>
            </div>
            ${items.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Type', 'type', sort)}
                        ${th('Lender', 'lender', sort)}
                        ${th('Loan Amount', 'loan_amount', sort)}
                        ${th('Outstanding', 'outstanding', sort)}
                        ${th('Rate', 'interest_rate', sort)}
                        ${th('EMI', 'emi', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No liabilities added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Liabilities render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load liabilities.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

