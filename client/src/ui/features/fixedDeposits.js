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
    return `<th class="${cls}" onclick="window.app.setSortState('fixedDeposits','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

export async function renderFixedDeposits(portfolioId) {
    const container = document.getElementById('content-fixedDeposits');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.fixedDeposits.list(portfolioId);
        const sort = window.app?.getSortState('fixedDeposits') || { col: null, dir: 'asc' };
        const fds = sortData(resp?.data || [], sort.col, sort.dir);

        const totalInvested = fds.reduce((sum, item) => sum + (parseFloat(item.invested) || 0), 0);
        const totalMaturity = fds.reduce((sum, item) => sum + (parseFloat(item.maturity) || 0), 0);

        let tableRows = '';
        fds.forEach(item => {
            tableRows += `
                <tr>
                    <td data-label="Bank">${item.bank_name}</td>
                    <td data-label="Invested" class="mono">${Utilities.formatCurrency(item.invested)}</td>
                    <td data-label="Maturity" class="mono">${Utilities.formatCurrency(item.maturity)}</td>
                    <td data-label="Rate">${item.interest_rate}%</td>
                    <td data-label="Start">${Utilities.formatDate(item.start_date)}</td>
                    <td data-label="Maturity Date">${Utilities.formatDate(item.maturity_date)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('fixedDeposits','${item.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('fixedDeposits','${item.id}')">Delete</button>
                    </td>
                </tr>`;
        });

        const html = `
            <div class="section-header">
                <h2>Fixed Deposits</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('fixedDeposits')">+ Add FD</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Total Invested</h3><p class="stat-value">${Utilities.formatCurrency(totalInvested)}</p></div>
                <div class="stat-card"><h3>Total Maturity</h3><p class="stat-value">${Utilities.formatCurrency(totalMaturity)}</p></div>
            </div>
            ${fds.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        ${th('Bank', 'bank_name', sort)}
                        ${th('Invested', 'invested', sort)}
                        ${th('Maturity', 'maturity', sort)}
                        ${th('Rate', 'interest_rate', sort)}
                        ${th('Start', 'start_date', sort)}
                        ${th('Maturity Date', 'maturity_date', sort)}
                        <th>Actions</th>
                    </tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>` : '<p class="empty-state">No fixed deposits added yet.</p>'}
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('FD render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load fixed deposits.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

