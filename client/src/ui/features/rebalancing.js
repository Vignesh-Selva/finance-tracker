import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

const TARGET_KEY = 'rebalancing_targets_v1';

const LOCKED_IN_KEYS = new Set(['epfPpf']);

const ASSET_CLASSES = [
    { key: 'savings',       label: 'Savings',        color: '#d97757' },
    { key: 'fixedDeposits', label: 'Fixed Deposits',  color: '#3b82f6' },
    { key: 'mutualFunds',   label: 'Mutual Funds',    color: '#059669' },
    { key: 'stocks',        label: 'Stocks',          color: '#8b5cf6' },
    { key: 'crypto',        label: 'Crypto',          color: '#f59e0b' },
    { key: 'epfPpf',        label: 'EPF / PPF',       color: '#6b7280' },
];

function loadTargets() {
    try { return JSON.parse(localStorage.getItem(TARGET_KEY) || '{}'); } catch { return {}; }
}

function saveTargets(targets) {
    localStorage.setItem(TARGET_KEY, JSON.stringify(targets));
}

function totalTargets(targets) {
    return ASSET_CLASSES.reduce((s, a) => s + (parseFloat(targets[a.key]) || 0), 0);
}

export async function renderRebalancing(portfolioId) {
    const container = document.getElementById('content-rebalancing');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.dashboard.get(portfolioId);
        const { netWorth, allocation, settings } = resp.data;

        const totalNW = netWorth.total;
        const targets = loadTargets();

        const currentMap = {};
        allocation.forEach(a => { currentMap[a.name] = a.value; });
        currentMap['EPF / PPF'] = netWorth.epf + netWorth.ppf;

        const labelToKey = {};
        ASSET_CLASSES.forEach(a => { labelToKey[a.label] = a.key; });
        const keyToLabel = {};
        ASSET_CLASSES.forEach(a => { keyToLabel[a.key] = a.label; });

        const totalTgt = totalTargets(targets);
        const tgtWarning = totalTgt > 0 && Math.abs(totalTgt - 100) > 1
            ? `<div class="cc-warning-banner" style="margin-bottom:16px;">⚠️ Target allocations sum to ${totalTgt.toFixed(1)}% — should equal 100% for accurate advice.</div>`
            : '';

        const rows = ASSET_CLASSES.map(({ key, label, color }) => {
            const currentVal = currentMap[label] || 0;
            const currentPct = totalNW > 0 ? (currentVal / totalNW) * 100 : 0;
            const targetPct = parseFloat(targets[key]) || 0;
            const targetVal = (targetPct / 100) * totalNW;
            const delta = targetVal - currentVal;
            const deltaPct = currentPct - targetPct;

            let action = '';
            if (Math.abs(delta) < 100) {
                action = '<span style="color:var(--text-muted)">✓ On target</span>';
            } else if (delta > 0) {
                action = `<span class="value-positive">▲ Buy ${Utilities.formatCurrency(delta)}</span>`;
            } else if (LOCKED_IN_KEYS.has(key)) {
                action = '<span style="color:var(--text-muted)">🔒 Locked-in</span>';
            } else {
                action = `<span class="value-negative">▼ Sell ${Utilities.formatCurrency(Math.abs(delta))}</span>`;
            }

            return `
                <tr>
                    <td data-label="Asset Class">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:6px;vertical-align:middle;"></span>
                        ${label}${LOCKED_IN_KEYS.has(key) ? ' <span title="Cannot sell — locked-in investment" style="font-size:11px;">🔒</span>' : ''}
                    </td>
                    <td data-label="Current" class="mono">${Utilities.formatCurrency(currentVal)}</td>
                    <td data-label="Current %" class="mono">${currentPct.toFixed(1)}%</td>
                    <td data-label="Target %">
                        <input type="number" min="0" max="100" step="0.5"
                            value="${targets[key] || ''}" placeholder="0"
                            class="form-input" style="width:72px;padding:5px 8px;font-size:13px;"
                            onchange="window._setRebalTarget('${key}', this.value)">%
                    </td>
                    <td data-label="Target Value" class="mono">${targetPct > 0 ? Utilities.formatCurrency(targetVal) : '—'}</td>
                    <td data-label="Delta" class="mono ${deltaPct > 2 ? 'value-negative' : deltaPct < -2 ? 'value-positive' : ''}">${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%</td>
                    <td data-label="Action">${action}</td>
                </tr>`;
        }).join('');

        const allocationBarHTML = ASSET_CLASSES.map(({ key, label, color }) => {
            const tgt = parseFloat(targets[key]) || 0;
            if (tgt <= 0) return '';
            return `<div style="flex-basis:${tgt}%;background:${color};height:100%;min-width:2px;" title="${label}: ${tgt}%"></div>`;
        }).join('');

        container.innerHTML = `
            <div class="section-header">
                <h2>Rebalancing Advisor</h2>
                <button class="btn btn-ghost" onclick="window.app.renderCurrentTab()">↺ Refresh</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Total Net Worth</h3>
                    <p class="stat-value">${Utilities.formatCurrency(totalNW)}</p>
                </div>
                <div class="stat-card">
                    <h3>Target Sum</h3>
                    <p class="stat-value ${Math.abs(totalTgt - 100) > 1 && totalTgt > 0 ? 'value-negative' : ''}">${totalTgt > 0 ? totalTgt.toFixed(1) + '%' : '—'}</p>
                    <p class="stat-change">Should be 100%</p>
                </div>
            </div>
            ${tgtWarning}
            ${totalTgt > 0 ? `
            <div class="breakdown" style="margin-bottom:20px;">
                <h3 style="margin-bottom:10px;">Target Allocation</h3>
                <div style="display:flex;width:100%;height:28px;border-radius:6px;overflow:hidden;gap:1px;">
                    ${allocationBarHTML}
                </div>
            </div>` : ''}
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Asset Class</th>
                        <th>Current</th>
                        <th>Current %</th>
                        <th>Target %</th>
                        <th>Target Value</th>
                        <th>Drift</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin-top:12px;">Set target % for each asset class. Target values are calculated from your current net worth.</p>
        `;

        window._setRebalTarget = (key, value) => {
            const targets = loadTargets();
            targets[key] = parseFloat(value) || 0;
            saveTargets(targets);
            renderRebalancing(portfolioId);
        };
    } catch (error) {
        container.innerHTML = '<div class="error-state"><p>Failed to load rebalancing data.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}
