import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

let _showArchivedLoans = false;

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
    const icon = active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲▼';
    const cls = active ? (sort.dir === 'asc' ? 'sortable sort-asc' : 'sortable sort-desc') : 'sortable';
    return `<th class="${cls}" onclick="window.app.setSortState('liabilities','${col}')">${label} <span class="sort-icon">${icon}</span></th>`;
}

function buildRow(item, isArchived = false) {
    const archiveBtn = isArchived
        ? `<button class="btn btn-sm btn-ghost" onclick="window._restoreLiability('${item.id}')">Restore</button>`
        : `<button class="btn btn-sm btn-ghost" onclick="window._archiveLiability('${item.id}')" title="Mark as paid off / closed">Archive</button>`;
    return `
        <tr style="${isArchived ? 'opacity:0.6;' : ''}">
            <td data-label="Type">${item.type}${isArchived ? ' <span class="badge badge-muted" style="font-size:10px;">Closed</span>' : ''}</td>
            <td data-label="Lender">${item.lender || '—'}</td>
            <td data-label="Loan Amt" class="mono">${Utilities.formatCurrency(item.loan_amount)}</td>
            <td data-label="Outstanding" class="mono">${Utilities.formatCurrency(item.outstanding)}</td>
            <td data-label="Rate">${item.interest_rate}%</td>
            <td data-label="EMI" class="mono">${item.emi ? Utilities.formatCurrency(item.emi) : '—'}</td>
            <td class="actions">
                ${!isArchived ? `<button class="btn btn-sm btn-ghost" onclick="window.app.editEntry('liabilities','${item.id}')">Edit</button>` : ''}
                ${archiveBtn}
                <button class="btn btn-sm btn-danger" onclick="window.app.deleteEntry('liabilities','${item.id}')">Delete</button>
            </td>
        </tr>`;
}

export async function renderLiabilities(portfolioId) {
    const container = document.getElementById('content-liabilities');
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.liabilities.list(portfolioId);
        const sort = window.app?.getSortState('liabilities') || { col: null, dir: 'asc' };
        const all = resp?.data || [];

        const active   = sortData(all.filter(i => (i.status || 'active') === 'active'),   sort.col, sort.dir);
        const archived = sortData(all.filter(i => i.status === 'closed'),                sort.col, sort.dir);

        const totalOutstanding = active.reduce((s, i) => s + (parseFloat(i.outstanding) || 0), 0);
        const totalEmi         = active.reduce((s, i) => s + (parseFloat(i.emi) || 0), 0);

        const thead = `<thead><tr>
            ${th('Type', 'type', sort)}
            ${th('Lender', 'lender', sort)}
            ${th('Loan Amount', 'loan_amount', sort)}
            ${th('Outstanding', 'outstanding', sort)}
            ${th('Rate', 'interest_rate', sort)}
            ${th('EMI', 'emi', sort)}
            <th>Actions</th>
        </tr></thead>`;

        const archivedSection = archived.length > 0 ? `
            <div style="margin-top:24px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <h3 style="margin:0;">Closed / Paid Off</h3>
                    <button class="btn btn-ghost btn-sm" id="liab-toggle-archived">
                        ${_showArchivedLoans ? '🗂 Hide' : '📂 Show'} (${archived.length})
                    </button>
                </div>
                ${_showArchivedLoans ? `
                <div class="data-table-container">
                    <table class="data-table">
                        ${thead}
                        <tbody>${archived.map(i => buildRow(i, true)).join('')}</tbody>
                    </table>
                </div>` : ''}
            </div>` : '';

        container.innerHTML = `
            <div class="section-header">
                <h2>Liabilities</h2>
                <button class="btn btn-primary" onclick="window.app.showAddForm('liabilities')">+ Add Liability</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><h3>Total Outstanding</h3><p class="stat-value">${Utilities.formatCurrency(totalOutstanding)}</p></div>
                <div class="stat-card"><h3>Total EMI</h3><p class="stat-value">${Utilities.formatCurrency(totalEmi)}</p></div>
            </div>
            ${active.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    ${thead}
                    <tbody>${active.map(i => buildRow(i, false)).join('')}</tbody>
                </table>
            </div>` : '<p class="empty-state">No active liabilities.</p>'}
            ${archivedSection}
        `;

        container.querySelector('#liab-toggle-archived')?.addEventListener('click', () => {
            _showArchivedLoans = !_showArchivedLoans;
            renderLiabilities(portfolioId);
        });

        window._archiveLiability = async (id) => {
            await api.liabilities.update(id, { status: 'closed' });
            await renderLiabilities(portfolioId);
        };
        window._restoreLiability = async (id) => {
            await api.liabilities.update(id, { status: 'active' });
            await renderLiabilities(portfolioId);
        };
    } catch {
        container.innerHTML = '<div class="error-state"><p>Failed to load liabilities.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

