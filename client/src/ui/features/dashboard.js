import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let netWorthChart = null;

export async function renderDashboard(portfolioId) {
    const container = document.getElementById('content-dashboard');

    // Show loading skeleton
    container.innerHTML = `<div class="skeleton-grid">
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;

    try {
        const resp = await api.dashboard.get(portfolioId);
        const { netWorth, allocation, investmentPL, goal, settings } = resp.data;

        // Fetch snapshots to compute 30-day net worth change (includes salary, savings, investments, liabilities)
        const snapshotsRes = await api.dashboard.timeline(portfolioId, { limit: 120 });
        const snapshots = snapshotsRes.data || [];

        const computeChangePercent = () => {
            if (!snapshots.length) return investmentPL?.total?.plPercent ?? 0;
            const now = Date.now();
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            const recent = snapshots.filter((s) => new Date(s.snapshot_date).getTime() >= thirtyDaysAgo);
            const baselineSnap = (recent.length ? recent[0] : snapshots[0]);
            const baseline = baselineSnap?.net_worth || 0;
            if (baseline <= 0) return 0;
            const delta = netWorth.total - baseline;
            return (delta / baseline) * 100;
        };

        const changePercentRaw = computeChangePercent();
        const changePercent = changePercentRaw.toFixed(2);
        const changePercentClass = changePercentRaw >= 0 ? 'positive' : 'negative';

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
        const progressClamped = Math.min(progress, 100);
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
                    <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressClamped}">
                        <div class="progress-fill" style="width:${hasGoal ? progressClamped : 0}%"></div>
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

            <div class="section-header" style="margin-top:24px;">
                <h2>Net Worth History</h2>
                <button class="btn btn-secondary" onclick="window.app.takeSnapshot()">📸 Take Snapshot</button>
            </div>
            <div class="chart-container" style="position:relative;height:300px;width:100%;">
                <canvas id="netWorthChart"></canvas>
            </div>
        `;

        container.innerHTML = html;

        // Render net worth history chart
        await renderNetWorthChart(portfolioId);
    } catch (error) {
        console.error('Dashboard render error:', error);
        container.innerHTML = `<div class="error-state"><p>Failed to load dashboard. Please check your connection.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>`;
    }
}

async function renderNetWorthChart(portfolioId) {
    try {
        const resp = await api.dashboard.timeline(portfolioId);
        const snapshots = resp.data || [];

        if (snapshots.length === 0) {
            const canvas = document.getElementById('netWorthChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.font = '14px sans-serif';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'center';
                ctx.fillText('No snapshots yet. Click "Take Snapshot" to start tracking.', canvas.width / 2, canvas.height / 2);
            }
            return;
        }

        const labels = snapshots.map(s => s.snapshot_date);
        const netWorthData = snapshots.map(s => parseFloat(s.net_worth) || 0);

        const canvas = document.getElementById('netWorthChart');
        if (!canvas) return;

        if (netWorthChart) {
            netWorthChart.destroy();
            netWorthChart = null;
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#ccc' : '#666';

        netWorthChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Net Worth',
                    data: netWorthData,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33,150,243,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: snapshots.length > 30 ? 0 : 4,
                    pointHoverRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => Utilities.formatCurrency(ctx.parsed.y),
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, maxTicksLimit: 12 },
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: (v) => Utilities.formatCurrency(v),
                        },
                    },
                },
            },
        });
    } catch (err) {
        console.error('Chart render error:', err);
    }
}

export default renderDashboard;
