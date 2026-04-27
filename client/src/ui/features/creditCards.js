import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

const CARD_GRADIENTS = {
    'Visa': 'linear-gradient(135deg, #1a1f71 0%, #2d5fce 100%)',
    'Mastercard': 'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
    'Rupay': 'linear-gradient(135deg, #0b3d91 0%, #00a86b 100%)',
    'Amex': 'linear-gradient(135deg, #006fcf 0%, #00175a 100%)',
    'Diners Club': 'linear-gradient(135deg, #1a3a4a 0%, #2d7d9a 100%)',
};

const NETWORK_ICONS = {
    'Visa': '𝗩𝗜𝗦𝗔',
    'Mastercard': '●●',
    'Rupay': '₹pay',
    'Amex': 'AMEX',
    'Diners Club': 'DC',
};

function computeBillingCycle(billingDay) {
    const day = parseInt(billingDay);
    if (!day || day < 1 || day > 31) return null;
    const today = new Date();
    const todayDay = today.getDate();

    let cycleEnd, cycleStart;
    if (todayDay <= day) {
        cycleEnd = new Date(today.getFullYear(), today.getMonth(), day);
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, day + 1);
    } else {
        cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, day);
        cycleStart = new Date(today.getFullYear(), today.getMonth(), day + 1);
    }
    const daysTotal = Math.round((cycleEnd - cycleStart) / 86400000);
    const daysElapsed = Math.round((today - cycleStart) / 86400000);
    const daysRemaining = Math.max(0, Math.round((cycleEnd - today) / 86400000));
    return { cycleStart, cycleEnd, daysTotal, daysElapsed, daysRemaining };
}

function nextDueDateLabel(dayOfMonth) {
    const day = parseInt(dayOfMonth);
    if (!day) return '';
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getUtilization(used, limit) {
    if (!limit || limit <= 0) return 0;
    return Math.min((used / limit) * 100, 100);
}

function getUtilizationClass(pct) {
    if (pct >= 75) return 'cc-util-danger';
    if (pct >= 50) return 'cc-util-warning';
    return 'cc-util-good';
}

function renderCardVisual(card) {
    const gradient = CARD_GRADIENTS[card.card_type] || CARD_GRADIENTS['Visa'];
    const networkIcon = NETWORK_ICONS[card.card_type] || card.card_type;
    const stmt = parseFloat(card.statement_balance) || 0;
    const limit = parseFloat(card.credit_limit) || 0;
    const util = getUtilization(stmt, limit);
    const utilClass = getUtilizationClass(util);

    return `
        <div class="cc-visual" style="background: ${gradient};">
            <div class="cc-visual-top">
                <div class="cc-chip">
                    <div class="cc-chip-line"></div>
                    <div class="cc-chip-line"></div>
                    <div class="cc-chip-line"></div>
                </div>
                <div class="cc-contactless">))))</div>
            </div>
            <div class="cc-visual-middle">
                <div class="cc-card-name-display">${card.card_name}</div>
            </div>
            <div class="cc-visual-bottom">
                <div class="cc-issuer-display">${card.issuer}</div>
                <div class="cc-network-icon">${networkIcon}</div>
            </div>
            <div class="cc-util-bar-container">
                <div class="cc-util-bar ${utilClass}" style="width: ${util}%;"></div>
            </div>
        </div>`;
}

function renderFullCardVisual(card) {
    const gradient = CARD_GRADIENTS[card.card_type] || CARD_GRADIENTS['Visa'];
    const networkIcon = NETWORK_ICONS[card.card_type] || card.card_type;
    const stmt = parseFloat(card.statement_balance) || 0;
    const total = parseFloat(card.current_balance) || 0;
    const outstanding = Math.max(total, stmt);

    return `
        <div class="cc-visual-full" style="background: ${gradient};">
            <div class="cc-vf-shine"></div>
            <div class="cc-vf-top">
                <div class="cc-chip-block">
                    <div class="cc-chip-h"></div>
                    <div class="cc-chip-v"></div>
                </div>
                <div class="cc-network-badge">${networkIcon}</div>
            </div>
            <div class="cc-number-dots">• • • •&nbsp;&nbsp;• • • •&nbsp;&nbsp;• • • •&nbsp;&nbsp;— — — —</div>
            <div class="cc-vf-bottom">
                <div class="cc-vf-name-block">
                    <div class="cc-vf-card-name">${card.card_name}</div>
                    <div class="cc-vf-bank">${card.issuer}</div>
                </div>
                <div class="cc-vf-outstanding">
                    <div class="cc-vf-out-label">OUTSTANDING</div>
                    <div class="cc-vf-out-amt">${Utilities.formatCurrency(outstanding)}</div>
                </div>
            </div>
        </div>`;
}

function renderCardItem(card, expanded) {
    const stmt = parseFloat(card.statement_balance) || 0;
    const total = parseFloat(card.current_balance) || 0;
    const unbilled = Math.max(total - stmt, 0);
    const limit = parseFloat(card.credit_limit) || 0;
    const amtToPay = parseFloat(card.amount_to_pay) || 0;
    const outstanding = Math.max(total, stmt);
    const util = getUtilization(outstanding, limit);
    const utilClass = getUtilizationClass(util);

    const detailsHTML = expanded ? `
        <div class="cc-details-panel">
            <div class="cc-util-row">
                <span class="cc-util-text">${Utilities.formatCurrency(outstanding)} used of ${Utilities.formatCurrency(limit)}</span>
                <span class="cc-util-pct ${util >= 75 ? 'value-negative' : 'value-positive'}">${util.toFixed(1)}%</span>
            </div>
            <div class="cc-util-track">
                <div class="cc-util-fill ${utilClass}" style="width: ${util}%;"></div>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Credit limit</span>
                <span class="cc-detail-value mono">${Utilities.formatCurrency(limit)}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Current balance</span>
                <span class="cc-detail-value mono">${Utilities.formatCurrency(total)}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Statement balance</span>
                <span class="cc-detail-value mono">${stmt > 0 ? Utilities.formatCurrency(stmt) : '₹0 (no statement yet)'}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Unbilled spend</span>
                <span class="cc-detail-value mono">${Utilities.formatCurrency(unbilled)}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Amount to pay</span>
                <span class="cc-detail-value mono">${Utilities.formatCurrency(amtToPay)}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Billing date</span>
                <span class="cc-detail-value">${card.billing_date ? `${card.billing_date}th every month` : '—'}</span>
            </div>
            <div class="cc-detail-row">
                <span class="cc-detail-label">Due date</span>
                <span class="cc-detail-value">${card.due_date ? `<span class="cc-due-badge">${nextDueDateLabel(card.due_date)}</span>` : '—'}</span>
            </div>
            ${(() => {
            const cycle = card.billing_date ? computeBillingCycle(card.billing_date) : null;
            if (!cycle) return '';
            const spendRate = cycle.daysElapsed > 0 ? (total / cycle.daysElapsed) : 0;
            const projectedSpend = spendRate * cycle.daysTotal;
            const paceWarning = limit > 0 && projectedSpend > limit * 0.8
                ? `<div class="cc-warning-banner" style="margin-top:8px;">⚠️ At current pace, projected spend ${Utilities.formatCurrency(projectedSpend)} may approach limit</div>` : '';
            const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `
                    <div class="cc-detail-row">
                        <span class="cc-detail-label">Current cycle</span>
                        <span class="cc-detail-value">${fmt(cycle.cycleStart)} – ${fmt(cycle.cycleEnd)}</span>
                    </div>
                    <div class="cc-detail-row">
                        <span class="cc-detail-label">Days remaining</span>
                        <span class="cc-detail-value ${cycle.daysRemaining <= 3 ? 'value-negative' : ''}"><b>${cycle.daysRemaining}</b> of ${cycle.daysTotal} days</span>
                    </div>
                    <div class="cc-detail-row">
                        <span class="cc-detail-label">Cycle progress</span>
                        <span class="cc-detail-value" style="flex:1;">
                            <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;min-width:80px;">
                                <div style="height:100%;background:var(--accent);width:${Math.min(100, (cycle.daysElapsed / cycle.daysTotal) * 100).toFixed(0)}%;"></div>
                            </div>
                        </span>
                    </div>
                    ${paceWarning}`;
        })()}
            <div class="cc-btn-row">
                <button class="cc-action-btn" onclick="event.stopPropagation(); window.app.editEntry('creditCards','${card.id}')">Edit</button>
                <button class="cc-action-btn" onclick="event.stopPropagation(); window._ccMarkPaid('${card.id}')">Mark paid</button>
                <button class="cc-action-btn cc-action-danger" onclick="event.stopPropagation(); window.app.deleteEntry('creditCards','${card.id}')">Delete</button>
            </div>
        </div>` : '';

    return `
        <div class="cc-card-item ${expanded ? 'expanded' : ''}">
            <div onclick="window._ccToggle('${card.id}', event)">
                ${renderFullCardVisual(card)}
                <div class="cc-chevron-row">${expanded ? '∧' : '∨'}</div>
            </div>
            ${detailsHTML}
        </div>`;
}

export async function renderCreditCards(portfolioId) {
    const container = document.getElementById('content-creditCards');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.creditCards.list(portfolioId);
        const cards = resp?.data || [];

        const totalLimit = cards.reduce((s, c) => s + (parseFloat(c.credit_limit) || 0), 0);
        const totalStmt = cards.reduce((s, c) => s + (parseFloat(c.statement_balance) || 0), 0);
        const totalTotal = cards.reduce((s, c) => s + (parseFloat(c.current_balance) || 0), 0);
        const totalAmountDue = cards.reduce((s, c) => s + (parseFloat(c.amount_to_pay) || 0), 0);
        const overallUtil = getUtilization(totalStmt, totalLimit);
        const overallClass = getUtilizationClass(overallUtil);

        const nextDue = cards
            .filter(c => c.due_date && parseFloat(c.amount_to_pay) > 0)
            .sort((a, b) => parseInt(a.due_date) - parseInt(b.due_date))[0];
        const nextDueLabel = nextDue ? nextDueDateLabel(nextDue.due_date) : '';

        const warningHTML = overallUtil >= 30 ? `
            <div class="cc-warning-banner">
                ⚠️ High utilization (above 30%) can negatively affect your credit score. Consider paying down balances before the billing date.
            </div>` : '';

        window._ccExpanded = window._ccExpanded || {};
        const cardListHTML = cards.map(c => renderCardItem(c, !!window._ccExpanded[c.id])).join('');

        container.innerHTML = `
            <div class="section-header">
                <div>
                    <h2>Credit Cards</h2>
                    <p class="stat-change">${cards.length} card${cards.length !== 1 ? 's' : ''}${nextDueLabel ? ` · Next due ${nextDueLabel}` : ''}</p>
                </div>
                <button class="btn btn-primary" onclick="window.app.showAddForm('creditCards')">+ Add Card</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Total Credit Limit</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(totalLimit)}</p>
                </div>
                <div class="stat-card">
                    <h3>Current Balance</h3>
                    <p class="stat-value mono">${Utilities.formatCurrency(totalTotal)}</p>
                </div>
                <div class="stat-card">
                    <h3>Due This Cycle</h3>
                    <p class="stat-value mono value-negative">${Utilities.formatCurrency(totalAmountDue)}</p>
                    ${nextDueLabel ? `<p class="stat-change">Due ${nextDueLabel}</p>` : ''}
                </div>
                <div class="stat-card">
                    <h3>Overall Utilization</h3>
                    <p class="stat-value ${overallClass === 'cc-util-danger' ? 'value-negative' : overallClass === 'cc-util-warning' ? '' : 'value-positive'}">${overallUtil.toFixed(1)}%</p>
                    <div class="progress-bar" style="margin: 6px 0 4px;">
                        <div class="progress-fill ${overallUtil >= 75 ? 'over-budget' : ''}" style="width: ${overallUtil}%;"></div>
                    </div>
                    <p class="stat-change">Aim for below 30%</p>
                </div>
            </div>
            ${warningHTML}
            ${cards.length > 0 ? `<div class="cc-list">${cardListHTML}</div>` : '<p class="empty-state">No credit cards added yet.</p>'}
        `;

        window._ccToggle = (id, e) => {
            e.stopPropagation();
            window._ccExpanded[id] = !window._ccExpanded[id];
            renderCreditCards(portfolioId);
        };

        window._ccMarkPaid = async (id) => {
            try {
                await api.creditCards.update(id, { amount_to_pay: 0 });
                Utilities.showNotification('Marked as paid', 'success');
                renderCreditCards(portfolioId);
            } catch (e) {
                Utilities.showNotification('Failed to mark as paid', 'error');
            }
        };

    } catch (error) {
        container.innerHTML = '<div class="error-state"><p>Failed to load credit cards.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

export default renderCreditCards;
