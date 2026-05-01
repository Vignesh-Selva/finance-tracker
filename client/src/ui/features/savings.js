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
    const icon = active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲▼';
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
                <div>
                    <p class="page-eyebrow">WEALTH OS · SAVINGS</p>
                    <h1 class="page-title">Savings Accounts</h1>
                </div>
                <button class="btn btn-primary btn-add-desktop" onclick="window.app.showAddForm('savings')">+ Add Account</button>
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
            </div>
            <div class="mobile-list-container" style="display:none;background:var(--surface);border-radius:20px;padding:0;overflow:hidden;">
                ${savings.map(item => {
            const balance = parseFloat(item.balance) || 0;
            return `
                        <div class="mobile-compact-row" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;" data-savings-id="${item.id}">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-family:var(--font-ui);font-size:14px;color:var(--text-primary);font-weight:500;">${item.bank_name}</span>
                                <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-primary);font-weight:500;">${Utilities.formatCurrency(balance)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">${item.account_type} · ${item.bank_name}</span>
                                <span style="font-family:var(--font-mono);font-size:11px;color:var(--green);font-weight:500;">+₹${(balance * 0.04 / 12).toFixed(0)}/mo</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>` : '<p class="empty-state">No savings accounts added yet.</p>'}
            <button class="fab-add" onclick="window.app.showAddForm('savings')" title="Add Savings Account">+</button>
        `;

        container.innerHTML = html;

        // Mobile list tap handlers
        container.querySelectorAll('[data-savings-id]').forEach(row => {
            row.addEventListener('click', () => {
                const savingsId = row.dataset.savingsId;
                const savingsItem = savings.find(s => s.id === savingsId);
                if (!savingsItem) return;
                const balance = parseFloat(savingsItem.balance) || 0;
                const monthlyInterest = (balance * 0.04 / 12).toFixed(0);
                const fields = {
                    'Bank Name': savingsItem.bank_name,
                    'Account Type': savingsItem.account_type,
                    'Balance': Utilities.formatCurrency(balance),
                    'Est. Monthly Interest': `+₹${monthlyInterest}`,
                };
                const actions = [
                    {
                        label: 'Edit',
                        onClick: () => {
                            window.app.editEntry('savings', savingsId);
                            const sheet = document.getElementById('mobile-bottom-sheet');
                            const overlay = document.getElementById('mobile-bottom-sheet-overlay');
                            if (sheet) sheet.style.transform = 'translateY(100%)';
                            if (overlay) overlay.remove();
                            if (sheet) setTimeout(() => sheet.remove(), 300);
                        }
                    },
                    {
                        label: 'Delete',
                        onClick: () => {
                            window.app.deleteEntry('savings', savingsId);
                            const sheet = document.getElementById('mobile-bottom-sheet');
                            const overlay = document.getElementById('mobile-bottom-sheet-overlay');
                            if (sheet) sheet.style.transform = 'translateY(100%)';
                            if (overlay) overlay.remove();
                            if (sheet) setTimeout(() => sheet.remove(), 300);
                        }
                    }
                ];
                Utilities.openBottomSheet(fields, actions);
            });
        });

        // Add mobile CSS
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            @media (max-width: 680px) {
                .data-table-container { display: none !important; }
                .mobile-list-container { display: block !important; }
            }
        `;
        container.appendChild(mobileStyle);
    } catch (error) {
        console.error('Savings render error:', error);
        container.innerHTML = '<div class="error-state"><p>Failed to load savings.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

