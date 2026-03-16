import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

export async function renderDashboard(portfolioId) {
    const container = document.getElementById('content-dashboard');

    // Show loading skeleton
    container.innerHTML = `<div class="skeleton-grid">
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;

    try {
        const resp = await api.dashboard.get(portfolioId);
        const { netWorth, allocation, investmentPL, expenseTotals, goal, settings } = resp.data;

        const changePercent = '+0.00';
        const changePercentClass = 'positive';

        const allocationHTML = allocation.length > 0
            ? `<div class="allocation-bar">${allocation.map(a =>
                `<div class="allocation-segment" style="width:${a.percentage}%;background:${a.color}" title="${a.name}: ${a.percentage}%"></div>`
            ).join('')}</div>`
            : '<p class="empty-state">Add assets to see allocation</p>';

        const allocationLegendMap = {
            'Savings': 'savings',
            'Fixed Deposits': 'fixedDeposits',
            'Mutual Funds': 'mutualFunds',
            'Stocks': 'stocks',
            'Crypto': 'crypto'
        };

        const legendHTML = allocation.length > 0
            ? `<div class="allocation-legend">${allocation.map(a => {
                const tab = allocationLegendMap[a.name];
                const clickAttr = tab ? `onclick="window.app.switchTab('${tab}')"` : '';
                const keyAttr = tab ? `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.app.switchTab('${tab}');}"` : '';
                const roleAttr = tab ? 'role="button" tabindex="0" style="cursor:pointer;"' : '';
                return `<div class="legend-item" ${roleAttr} ${clickAttr} ${keyAttr}><span class="legend-color" style="background:${a.color}"></span><span class="legend-label">${a.name}</span><span class="legend-value">${a.percentage}%</span></div>`;
            }).join('')}</div>`
            : '';

        const progress = goal.progress;
        const hasGoal = goal.target > 0;

        const formatLastRefresh = (isoString) => {
            if (!isoString) return 'Not available';
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return 'Not available';
            const pad = (n) => String(n).padStart(2, '0');
            return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        };
        const lastRefreshedText = formatLastRefresh(settings?.last_sync);

        const totalPL = investmentPL.total;
        const mfPL = investmentPL.mutualFunds;
        const stocksPL = investmentPL.stocks;
        const cryptoPL = investmentPL.crypto;

        const html = `
            <div class="section-header">
                <h2>Dashboard</h2>
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="window.app.refreshAllLive()">🔄 Refresh Live</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Net Worth</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.total)}</p>
                    <p class="stat-change ${changePercentClass}">${changePercent}% this month</p>
                </div>
                <div class="stat-card">
                    <h3>Investments</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.mutual_funds + netWorth.stocks + netWorth.crypto)}</p>
                </div>
                <div class="stat-card">
                    <h3>EPF & PPF</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.epf + netWorth.ppf)}</p>
                </div>
                <div class="stat-card">
                    <h3>Liabilities</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.liabilities)}</p>
                </div>
                <div class="stat-card">
                    <h3>Goal Progress</h3>
                    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                        <div class="progress-fill" style="width:${hasGoal ? progress : 0}%"></div>
                    </div>
                    <p>${hasGoal ? `${progress}% of ${Utilities.formatCurrency(goal.target)}` : 'Set a goal to track progress'}</p>
                </div>
            </div>
            <div class="breakdown">
                <h3>Asset Allocation</h3>
                ${allocationHTML}
                ${legendHTML}
            </div>
            <div class="section-header"></div>
            <div class="section-header"><h2>Investments P/L</h2></div>
            <div class="stat-grid">
                <div class="stat-card">
                    <h3>Total P/L</h3>
                    <p class="stat-value ${totalPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL.pl)}</p>
                    <p class="stat-change">${totalPL.plPercent}%</p>
                </div>
                <div class="stat-card">
                    <h3>Mutual Funds P/L</h3>
                    <p class="stat-value ${mfPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(mfPL.pl)}</p>
                    <p class="stat-change">${mfPL.plPercent}%</p>
                </div>
                <div class="stat-card">
                    <h3>Stocks & ETF P/L</h3>
                    <p class="stat-value ${stocksPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(stocksPL.pl)}</p>
                    <p class="stat-change">${stocksPL.plPercent}%</p>
                </div>
                <div class="stat-card">
                    <h3>Crypto P/L</h3>
                    <p class="stat-value ${cryptoPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(cryptoPL.pl)}</p>
                    <p class="stat-change">${cryptoPL.plPercent}%</p>
                </div>
            </div>
            <div class="last-refreshed">Last Refreshed ${lastRefreshedText}</div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Dashboard render error:', error);
        container.innerHTML = `<div class="error-state"><p>Failed to load dashboard. Please check your connection.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>`;
    }
}

export default renderDashboard;
