import Utilities from '../../utils/utils.js';
import { Calculator } from '../../services/calculator.js';

export async function renderDashboard(dbManager) {
    const [netWorthTotals, settings = {}, transactions = [], mutualFunds = [], stocks = [], crypto = []] = await Promise.all([
        Calculator.calculateNetWorthTotals(dbManager),
        Utilities.getSettings(dbManager),
        dbManager.getAll('transactions'),
        dbManager.getAll('mutualFunds'),
        dbManager.getAll('stocks'),
        dbManager.getAll('crypto'),
    ]);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthNetChange = transactions.reduce((sum, t) => {
        try {
            const tDate = new Date(t.date);
            if (isNaN(tDate.getTime()) || tDate.getMonth() !== currentMonth || tDate.getFullYear() !== currentYear) {
                return sum;
            }

            const amount = parseFloat(t.amount) || 0;
            if (isNaN(amount)) return sum;

            return t.type === 'income' ? sum + amount : t.type === 'expense' ? sum - amount : sum;
        } catch (e) {
            console.warn('Skipping invalid transaction for change calc:', t);
            return sum;
        }
    }, 0);

    const netWorth = netWorthTotals.total;
    const goal = parseFloat(settings.goal) || 0;
    const hasGoal = goal > 0;
    const progress = hasGoal ? Math.min((netWorth / goal) * 100, 100).toFixed(2) : '0.00';
    const previousNetWorth = netWorth - monthNetChange;
    const changePercentValue = previousNetWorth > 0 ? (monthNetChange / previousNetWorth) * 100 : 0;
    const changePercent = `${changePercentValue >= 0 ? '+' : ''}${changePercentValue.toFixed(2)}`;
    const changePercentClass = changePercentValue >= 0 ? 'positive' : 'negative';

    const totalAssets =
        netWorthTotals.savings +
        netWorthTotals.fixedDeposits +
        netWorthTotals.mutualFunds +
        netWorthTotals.stocks +
        netWorthTotals.crypto +
        netWorthTotals.epf +
        netWorthTotals.ppf;

    const assetData = [
        { name: 'Savings', value: netWorthTotals.savings, color: '#3b82f6' },
        { name: 'Fixed Deposits', value: netWorthTotals.fixedDeposits, color: '#10b981' },
        { name: 'Mutual Funds', value: netWorthTotals.mutualFunds, color: '#8c0bf5ff' },
        { name: 'Stocks', value: netWorthTotals.stocks, color: '#ef4444' },
        { name: 'Crypto', value: netWorthTotals.crypto, color: '#e9b05bff' },
        { name: 'EPF', value: netWorthTotals.epf, color: '#06b6d4' },
        { name: 'PPF', value: netWorthTotals.ppf, color: '#ec4899' }
    ].filter(a => a.value > 0);

    const mfInvested = mutualFunds.reduce((s, i) => {
        const invested = parseFloat(i.invested);
        return s + (isNaN(invested) ? 0 : invested);
    }, 0);
    const mfCurrent = mutualFunds.reduce((s, i) => {
        const current = parseFloat(i.current);
        return s + (isNaN(current) ? 0 : current);
    }, 0);
    const mutualFundsTotalPL = mfCurrent - mfInvested;
    const mutualFundsTotalPLPercent =
        mfInvested > 0 ? ((mutualFundsTotalPL / mfInvested) * 100).toFixed(2) : 0;

    const stocksInvested = stocks.reduce((s, i) => {
        const invested = parseFloat(i.invested);
        return s + (isNaN(invested) ? 0 : invested);
    }, 0);
    const stocksCurrent = stocks.reduce((s, i) => {
        const current = parseFloat(i.current);
        return s + (isNaN(current) ? 0 : current);
    }, 0);
    const stocksTotalPL = stocksCurrent - stocksInvested;
    const stocksTotalPLPercent =
        stocksInvested > 0 ? ((stocksTotalPL / stocksInvested) * 100).toFixed(2) : 0;

    const cryptoInvested = crypto.reduce((s, i) => {
        const invested = parseFloat(i.invested);
        return s + (isNaN(invested) ? 0 : invested);
    }, 0);
    const cryptoCurrent = crypto.reduce((s, i) => {
        const current = parseFloat(i.current);
        return s + (isNaN(current) ? 0 : current);
    }, 0);
    const cryptoTotalPL = cryptoCurrent - cryptoInvested;
    const cryptoTotalPLPercent =
        cryptoInvested > 0 ? ((cryptoTotalPL / cryptoInvested) * 100).toFixed(2) : 0;

    const totalInvested = mfInvested + stocksInvested + cryptoInvested;
    const totalCurrentValue = mfCurrent + stocksCurrent + cryptoCurrent;
    const totalPL = totalCurrentValue - totalInvested;
    const overallInvestmentPLPercent = totalInvested > 0
        ? ((totalPL / totalInvested) * 100).toFixed(2)
        : '0.00';

    const allocationHTML = assetData.length > 0
        ? `<div class="allocation-bar">${assetData.map(a => {
            const pct = totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : 0;
            return `<div class="allocation-segment" style="width:${pct}%;background:${a.color}" title="${a.name}: ${pct}%"></div>`;
        }).join('')}</div>`
        : '<p class="empty-state">Add assets to see allocation</p>';

    const allocationLegendMap = {
        'Savings': 'savings',
        'Fixed Deposits': 'fixedDeposits',
        'Mutual Funds': 'mutualFunds',
        'Stocks': 'stocks',
        'Crypto': 'crypto'
    };

    const legendHTML = assetData.length > 0
        ? `<div class="allocation-legend">${assetData.map(a => {
            const pct = totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : 0;
            const tab = allocationLegendMap[a.name];
            const clickAttr = tab ? `onclick=\"window.app.switchTab('${tab}')\"` : '';
            const keyAttr = tab ? `onkeydown=\"if(event.key==='Enter'||event.key===' '){event.preventDefault();window.app.switchTab('${tab}');}\"` : '';
            const roleAttr = tab ? 'role="button" tabindex="0" style="cursor:pointer;"' : '';
            return `<div class="legend-item" ${roleAttr} ${clickAttr} ${keyAttr}><span class="legend-color" style="background:${a.color}"></span><span class="legend-label">${a.name}</span><span class="legend-value">${pct}%</span></div>`;
        }).join('')}</div>`
        : '';

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
                <p class="stat-value">${Utilities.formatCurrency(netWorth)}</p>
                <p class="stat-change ${changePercentClass}">${changePercent}% this month</p>
            </div>
            <div class="stat-card">
                <h3>Investments</h3>
                <p class="stat-value">${Utilities.formatCurrency(netWorthTotals.mutualFunds + netWorthTotals.stocks + netWorthTotals.crypto)}</p>
            </div>
            <div class="stat-card">
                <h3>EPF & PPF</h3>
                <p class="stat-value">${Utilities.formatCurrency(netWorthTotals.epf + netWorthTotals.ppf)}</p>
            </div>
            <div class="stat-card">
                <h3>Liabilities</h3>
                <p class="stat-value">${Utilities.formatCurrency(netWorthTotals.liabilities)}</p>
            </div>
            <div class="stat-card">
                <h3>Goal Progress</h3>
                <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                    <div class="progress-fill" style="width:${hasGoal ? progress : 0}%"></div>
                </div>
                <p>${hasGoal ? `${progress}% of ${Utilities.formatCurrency(goal)}` : 'Set a goal to track progress'}</p>
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
                <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)}</p>
                <p class="stat-change">${overallInvestmentPLPercent}%</p>
            </div>
            <div class="stat-card">
                <h3>Mutual Funds P/L</h3>
                <p class="stat-value ${mutualFundsTotalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(mutualFundsTotalPL)}</p>
                <p class="stat-change">${mutualFundsTotalPLPercent}%</p>
            </div>
            <div class="stat-card">
                <h3>Stocks & ETF P/L</h3>
                <p class="stat-value ${stocksTotalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(stocksTotalPL)}</p>
                <p class="stat-change">${stocksTotalPLPercent}%</p>
            </div>
            <div class="stat-card">
                <h3>Crypto P/L</h3>
                <p class="stat-value ${cryptoTotalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(cryptoTotalPL)}</p>
                <p class="stat-change">${cryptoTotalPLPercent}%</p>
            </div>
        </div>
    `;

    document.getElementById('content-dashboard').innerHTML = html;
}

export default renderDashboard;
