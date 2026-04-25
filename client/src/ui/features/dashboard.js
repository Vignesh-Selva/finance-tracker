import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';
import { getCurrentUser, extractUsernameFromEmail } from '../../services/authService.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let netWorthChart = null;
let fiProjectionChart = null;

function getDashboardGreeting(username) {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    let greetingBase, emoji;
    if (hour >= 5 && hour < 12)       { greetingBase = 'Good Morning';   emoji = '🌅'; }
    else if (hour >= 12 && hour < 17) { greetingBase = 'Good Afternoon'; emoji = '☀️'; }
    else if (hour >= 17 && hour < 21) { greetingBase = 'Good Evening';   emoji = '🌆'; }
    else                              { greetingBase = 'Good Night';     emoji = '🌙'; }

    const greeting = username ? `${greetingBase}, ${username}` : greetingBase;

    const tips = [
        'Automate your SIPs — consistency beats timing.',        // Sun
        'A new week, a chance to review your goals.',            // Mon
        'Small daily savings compound into big wealth.',         // Tue
        'Track every rupee — awareness is the first step.',     // Wed
        'Diversify your portfolio across asset classes.',        // Thu
        'Review this week\'s spending before the weekend.',      // Fri
        'Net worth is built one weekend at a time too.',         // Sat
    ];

    return { greeting, emoji, tip: tips[day] };
}

export async function renderDashboard(portfolioId) {
    const container = document.getElementById('content-dashboard');

    // Show loading skeleton
    container.innerHTML = `<div class="skeleton-grid">
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
        <div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;

    try {
        const [resp, ccResp, snapshotsRes] = await Promise.all([
            api.dashboard.get(portfolioId),
            api.creditCards.list(portfolioId).catch(() => ({ data: [] })),
            api.dashboard.timeline(portfolioId, { limit: 40 }).catch(() => ({ data: [] })),
        ]);
        const { netWorth, allocation, investmentPL, goal, settings } = resp.data;
        const creditCards = ccResp?.data || [];
        const snapshots = snapshotsRes?.data || [];
        const totalCCDue = creditCards.reduce((s, c) => s + (parseFloat(c.amount_to_pay) || 0), 0);
        const totalCCLimit = creditCards.reduce((s, c) => s + (parseFloat(c.credit_limit) || 0), 0);
        const totalCCOutstanding = creditCards.reduce((s, c) => {
            const current = parseFloat(c.current_balance) || 0;
            const statement = parseFloat(c.statement_balance) || 0;
            return s + Math.max(current, statement);
        }, 0);
        const ccUtilization = totalCCLimit > 0 ? (totalCCOutstanding / totalCCLimit) * 100 : 0;
        const nextCCDue = creditCards
            .filter(c => c.due_date && parseFloat(c.amount_to_pay) > 0)
            .sort((a, b) => parseInt(a.due_date) - parseInt(b.due_date))[0];
        const nextCCLabel = (() => {
            if (!nextCCDue) return '';
            const day = parseInt(nextCCDue.due_date);
            const today = new Date();
            const d = new Date(today.getFullYear(), today.getMonth(), day);
            if (d <= today) d.setMonth(d.getMonth() + 1);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), days: diffDays };
        })();
        const ccUrgencyClass = nextCCLabel ? (nextCCLabel.days <= 3 ? 'value-negative' : nextCCLabel.days <= 7 ? 'value-neutral' : 'value-positive') : '';

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

        const hasInvestments = (netWorth.mutual_funds + netWorth.stocks + netWorth.crypto) > 0;

        // Auto-snapshot on first load of the day (non-blocking)
        const today = new Date().toISOString().split('T')[0];
        const lastSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1].snapshot_date.split('T')[0] : null;
        if (lastSnapshot !== today) {
            api.dashboard.takeSnapshot(portfolioId)
                .then(() => console.log('Auto-snapshot taken for', today))
                .catch((e) => console.warn('Auto-snapshot failed:', e));
        }

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
                return `<div class="legend-item" ${roleAttr} ${clickAttr} ${keyAttr}><span class="legend-color" style="background:${a.color}"></span><span class="legend-label">${a.name}</span><span class="legend-value">${a.percentage}%</span><button class="btn-drill" onclick="event.stopPropagation();window.app.showDrillDown('${a.name}')" title="Drill down" aria-label="View ${a.name} holdings">⊞</button></div>`;
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

        const authUser = await getCurrentUser().catch(() => null);
        const username = authUser?.user_metadata?.username || extractUsernameFromEmail(authUser?.email) || '';
        const { greeting, emoji, tip } = getDashboardGreeting(username);


        const html = `
            <div class="section-header">
                <div>
                    <h2 style="margin-bottom:4px;">${greeting} ${emoji}</h2>
                    <p style="font-size:13px;color:var(--text-muted);margin:0;">${tip}</p>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card desktop-summary-card">
                    <h3>Net Worth</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.total)}</p>
                    <p class="stat-change ${changePercentClass}" style="font-size:1rem;font-weight:700;margin-top:6px;">${changePercentRaw >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(changePercent))}% this month</p>
                    <div class="net-worth-sparkline" style="height:40px;margin-top:8px;">
                        <canvas id="netWorthSparkline"></canvas>
                    </div>
                </div>
                <div class="stat-card desktop-summary-card">
                    <h3>Total Assets</h3>
                    <p class="stat-value">${Utilities.formatCurrency(netWorth.total + netWorth.liabilities)}</p>
                    <div style="font-size:13px;line-height:1.6;color:var(--text-muted);margin-top:4px;">
                        <div style="display:flex;justify-content:space-between;"><span>Savings + FD</span><span class="mono">${Utilities.formatCurrency(netWorth.savings + netWorth.fixed_deposits)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>MF + Stocks</span><span class="mono">${Utilities.formatCurrency(netWorth.mutual_funds + netWorth.stocks)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Crypto</span><span class="mono">${Utilities.formatCurrency(netWorth.crypto)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>EPF + PPF</span><span class="mono">${Utilities.formatCurrency(netWorth.epf + netWorth.ppf)}</span></div>
                    </div>
                </div>
                <div class="stat-card desktop-summary-card">
                    <h3>Total Liabilities</h3>
                    <p class="stat-value ${netWorth.liabilities + totalCCOutstanding > 0 ? 'negative' : ''}">${Utilities.formatCurrency(netWorth.liabilities + totalCCOutstanding)}</p>
                    <div style="font-size:13px;line-height:1.6;color:var(--text-muted);margin-top:4px;">
                        <div style="display:flex;justify-content:space-between;"><span>Active Loans</span><span class="mono">${Utilities.formatCurrency(netWorth.liabilities)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Credit Card Debt</span><span class="mono">${Utilities.formatCurrency(totalCCOutstanding)}</span></div>
                    </div>
                </div>
                ${creditCards.length > 0 ? `
                <div class="stat-card cc-stat-card" onclick="window.app.switchTab('creditCards')" style="cursor:pointer;">
                    <h3>Credit Cards</h3>
                    <p class="stat-value mono ${ccUrgencyClass || (totalCCDue > 0 ? 'value-negative' : '')}">${Utilities.formatCurrency(totalCCDue)}</p>
                    <p class="stat-change">${creditCards.length} card${creditCards.length !== 1 ? 's' : ''}${nextCCLabel ? ` · Due ${nextCCLabel.date}` : ''}</p>
                    ${totalCCLimit > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-top:8px;">
                        <span style="font-size:12px;color:var(--text-muted);">Utilization</span>
                        <span style="font-size:12px;font-weight:600;color:${ccUtilization > 70 ? 'var(--red)' : ccUtilization > 50 ? 'var(--yellow)' : 'var(--green)'};">${ccUtilization.toFixed(0)}%</span>
                    </div>
                    ` : ''}
                </div>` : `
                <div class="stat-card cc-stat-card">
                    <h3>Credit Cards</h3>
                    <p style="color:var(--text-muted);margin-bottom:12px;">No credit cards added</p>
                    <button class="btn btn-primary" onclick="window.app.switchTab('creditCards')">+ Add Card</button>
                </div>`}
                <div class="mobile-summary-card" style="display:none;">
                    <div class="mobile-summary-header">Summary</div>
                    <div class="mobile-summary-row mobile-summary-standout">
                        <span class="mobile-summary-label">Net Worth</span>
                        <span class="mobile-summary-value mobile-summary-value-standout">${Utilities.formatCurrency(netWorth.total)}</span>
                    </div>
                    <div class="mobile-summary-row">
                        <span class="mobile-summary-label">Total Assets</span>
                        <span class="mobile-summary-value">${Utilities.formatCurrency(netWorth.total + netWorth.liabilities)}</span>
                    </div>
                    <div style="padding:0 16px 8px 16px;font-size:12px;color:var(--text-muted);line-height:1.6;">
                        <div style="display:flex;justify-content:space-between;"><span>Savings + FD</span><span class="mono">${Utilities.formatCurrency(netWorth.savings + netWorth.fixed_deposits)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>MF + Stocks</span><span class="mono">${Utilities.formatCurrency(netWorth.mutual_funds + netWorth.stocks)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Crypto</span><span class="mono">${Utilities.formatCurrency(netWorth.crypto)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>EPF + PPF</span><span class="mono">${Utilities.formatCurrency(netWorth.epf + netWorth.ppf)}</span></div>
                    </div>
                    <div class="mobile-summary-row">
                        <span class="mobile-summary-label">Total Liabilities</span>
                        <span class="mobile-summary-value">${Utilities.formatCurrency(netWorth.liabilities + totalCCOutstanding)}</span>
                    </div>
                    <div style="padding:0 16px 12px 16px;font-size:12px;color:var(--text-muted);line-height:1.6;">
                        <div style="display:flex;justify-content:space-between;"><span>Active Loans</span><span class="mono">${Utilities.formatCurrency(netWorth.liabilities)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Credit Card Debt</span><span class="mono">${Utilities.formatCurrency(totalCCOutstanding)}</span></div>
                    </div>
                </div>
            </div>
            <div class="breakdown">
                <h3>Asset Allocation</h3>
                ${allocationHTML}
                ${legendHTML}
            </div>
            <div class="section-header"></div>
            <div class="breakdown">
                <h3>Investments P/L</h3>
                ${hasInvestments ? `
                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total P/L</h3>
                        <p class="stat-value ${totalPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL.pl)}</p>
                        <p class="stat-change">${totalPL.plPercent}%</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('mutualFunds')" style="cursor:pointer;">
                        <h3>Mutual Funds P/L</h3>
                        <p class="stat-value ${mfPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(mfPL.pl)}</p>
                        <p class="stat-change">${mfPL.plPercent}%</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('stocks')" style="cursor:pointer;">
                        <h3>Stocks & ETF P/L</h3>
                        <p class="stat-value ${stocksPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(stocksPL.pl)}</p>
                        <p class="stat-change">${stocksPL.plPercent}%</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('crypto')" style="cursor:pointer;">
                        <h3>Crypto P/L</h3>
                        <p class="stat-value ${cryptoPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(cryptoPL.pl)}</p>
                        <p class="stat-change">${cryptoPL.plPercent}%</p>
                    </div>
                </div>
                <div class="mobile-summary-card" style="display:none;">
                    <div class="mobile-summary-row mobile-summary-standout">
                        <span class="mobile-summary-label">Total</span>
                        <span class="mobile-summary-value mobile-summary-value-standout ${totalPL.pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(totalPL.pl)} (${totalPL.plPercent}%)</span>
                    </div>
                    <div class="mobile-summary-row">
                        <span class="mobile-summary-label">Mutual Funds</span>
                        <span class="mobile-summary-value ${mfPL.pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(mfPL.pl)} (${mfPL.plPercent}%)</span>
                    </div>
                    <div class="mobile-summary-row">
                        <span class="mobile-summary-label">Stocks & ETF</span>
                        <span class="mobile-summary-value ${stocksPL.pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(stocksPL.pl)} (${stocksPL.plPercent}%)</span>
                    </div>
                    <div class="mobile-summary-row">
                        <span class="mobile-summary-label">Crypto</span>
                        <span class="mobile-summary-value ${cryptoPL.pl >= 0 ? 'value-positive' : 'value-negative'}">${Utilities.formatCurrency(cryptoPL.pl)} (${cryptoPL.plPercent}%)</span>
                    </div>
                </div>` : `
                <p style="color:var(--text-muted);margin-bottom:12px;">No investments yet</p>
                <button class="btn btn-primary" onclick="window.app.switchTab('mutualFunds')">+ Add Investment</button>`}
            </div>

            <div class="breakdown" style="margin-top:20px;">
                <h3>Net Worth History</h3>
                <div class="chart-container" style="position:relative;height:300px;width:100%;margin-top:12px;">
                    <canvas id="netWorthChart"></canvas>
                </div>
            </div>


            <div class="last-refreshed">Last Refreshed ${lastRefreshedText}</div>
        `;

        container.innerHTML = html;

        await renderNetWorthChart(portfolioId);
        await renderNetWorthSparkline(snapshots);

        window._dashAllocationData = { allocation, portfolioId };
    } catch (error) {
        console.error('Dashboard render error:', error);
        container.innerHTML = `<div class="error-state"><p>Failed to load dashboard. Please check your connection.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>`;
    }
}

let netWorthSparklineChart = null;

async function renderNetWorthSparkline(snapshots) {
    const canvas = document.getElementById('netWorthSparkline');
    if (!canvas || snapshots.length < 2) return;

    const data = snapshots.slice(-30).map(s => parseFloat(s.net_worth) || 0);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (netWorthSparklineChart) {
        netWorthSparklineChart.destroy();
        netWorthSparklineChart = null;
    }

    netWorthSparklineChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data,
                borderColor: isDark ? '#3b82f6' : '#d97757',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false },
            },
            layout: { padding: 0 },
        },
    });
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

function computeProjection(currentNW, goalTarget, annualReturn, monthlyContribution) {
    const monthlyRate = annualReturn / 100 / 12;
    const points = [];
    let balance = currentNW;
    let yearsToGoal = null;

    for (let month = 0; month <= 360; month++) {
        if (month % 12 === 0) {
            points.push({ year: Math.floor(month / 12), value: Math.round(balance) });
        }
        if (yearsToGoal === null && balance >= goalTarget && goalTarget > 0) {
            yearsToGoal = parseFloat((month / 12).toFixed(1));
        }
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        if (balance > goalTarget * 3 && goalTarget > 0) break;
        if (month === 360) break;
    }

    const totalInvested = currentNW + monthlyContribution * Math.min(yearsToGoal ? yearsToGoal * 12 : 360, 360);
    return { points, yearsToGoal, totalInvested };
}

export function renderFIProjection(currentNW, goalTarget) {
    const canvas = document.getElementById('fiProjectionChart');
    const summaryEl = document.getElementById('fi-summary');
    if (!canvas || !summaryEl) return;

    const monthlyContrib = Math.max(0, parseFloat(document.getElementById('fi-monthly')?.value) || 0);
    const annualReturn = Math.max(0.1, parseFloat(document.getElementById('fi-return')?.value) || 12);

    const { points, yearsToGoal, totalInvested } = computeProjection(currentNW, goalTarget, annualReturn, monthlyContrib);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const accentColor = isDark ? '#3b82f6' : '#d97757';
    const goalColor = isDark ? '#10b981' : '#059669';
    const textColor = isDark ? '#ccc' : '#666';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    const labels = points.map(p => `Year ${p.year}`);
    const values = points.map(p => p.value);
    const goalLine = points.map(() => goalTarget);

    summaryEl.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:10px 16px;min-width:140px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;">Years to Goal</div>
            <div style="font-size:1.4rem;font-weight:700;color:${yearsToGoal ? 'var(--green)' : 'var(--text-muted)'};">${yearsToGoal !== null ? yearsToGoal + ' yrs' : '30+ yrs'}</div>
        </div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:10px 16px;min-width:140px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;">Goal Target</div>
            <div style="font-size:1.1rem;font-weight:700;font-family:var(--font-mono);">${Utilities.formatCurrency(goalTarget)}</div>
        </div>
        ${monthlyContrib > 0 ? `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:10px 16px;min-width:140px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.06em;">Total Invested</div>
            <div style="font-size:1.1rem;font-weight:700;font-family:var(--font-mono);">${Utilities.formatCurrency(totalInvested)}</div>
        </div>` : ''}
    `;

    if (fiProjectionChart) {
        fiProjectionChart.destroy();
        fiProjectionChart = null;
    }

    fiProjectionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Projected Balance',
                    data: values,
                    borderColor: accentColor,
                    backgroundColor: accentColor + '18',
                    fill: true,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    tension: 0.4,
                },
                ...(goalTarget > 0 ? [{
                    label: 'Goal',
                    data: goalLine,
                    borderColor: goalColor,
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                }] : []),
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: textColor, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${Utilities.formatCurrency(ctx.parsed.y)}`,
                    },
                },
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, callback: (v) => Utilities.formatCurrency(v) },
                },
            },
        },
    });
}
