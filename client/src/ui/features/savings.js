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
    return `<th class="${cls}" onclick="window.app.setSortState('savings','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderSavings(portfolioId) {
    const container = document.getElementById('content-savings');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.savings.list(portfolioId);
        const sort = window.app?.getSortState('savings') || { col: null, dir: 'asc' };
        const savings = sortData(resp?.data || [], sort.col, sort.dir);

        const total = savings.reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);

        let tableRows = '';
        savings.forEach(item => {
            tableRows += `
                <tr>
                    <td data-label="Bank">${item.bank_name}</td>
                    <td data-label="Type">${item.account_type}</td>
                    <td data-label="Balance" class="mono">${Utilities.formatCurrency(item.balance)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('savings','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('savings','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Savings Accounts</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('savings')">+ Add Account</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Total Savings</h3>
                    <p class="stat-value">${Utilities.formatCurrency(total)}</p>
                </div>
            </div>
            ${savings.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Bank', 'bank_name', sort)}
                        ${th('Type', 'account_type', sort)}
                        ${th('Balance', 'balance', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No savings accounts added yet. Click "+ Add Account" to get started.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Savings render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load savings.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

