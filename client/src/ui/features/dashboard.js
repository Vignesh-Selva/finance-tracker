import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';
import { getCurrentUser, extractUsernameFromEmail } from '../../services/authService.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const _netWorthChart = null;
let fiProjectionChart = null;
let _chartFilter = 'ALL';
let _cachedSnapshots = [];
let _cachedPortfolioId = null;

function getDashboardGreeting(username) {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    let greetingBase, emoji;
    if (hour >= 5 && hour < 12) { greetingBase = 'Good Morning'; emoji = '🌅'; }
    else if (hour >= 12 && hour < 17) { greetingBase = 'Good Afternoon'; emoji = '☀️'; }
    else if (hour >= 17 && hour < 21) { greetingBase = 'Good Evening'; emoji = '🌆'; }
    else { greetingBase = 'Good Night'; emoji = '🌙'; }

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

        const _allocationHTML = allocation.length > 0
            ? `<div class="allocation-bar">${allocation.map(a =>
                `<div class="allocation-segment" style="width:${a.percentage}%;background:${a.color}" title="${a.name}: ${a.percentage}%"></div>`
            ).join('')}</div>`
            : '<p class="empty-state">Add assets to see allocation</p>';

        // Horizontal segmented bar above legend — fixed order, flex-based
        const segmentColors = {
            'Savings': '#4ade80',
            'Fixed Deposits': '#fbbf24',
            'EPF': '#22d3ee',
            'Mutual Funds': '#60a5fa',
            'PPF': '#a78bfa',
            'Stocks': '#c084fc',
            'Crypto': '#fb923c',
        };
        const segmentOrder = ['Savings', 'Fixed Deposits', 'EPF', 'Mutual Funds', 'PPF', 'Stocks', 'Crypto'];
        const allocationMap = Object.fromEntries(allocation.map(a => [a.name, a.percentage]));
        const allocationBarSegmentsHTML = segmentOrder
            .map(name => {
                const pct = allocationMap[name] || 0;
                return pct > 0 ? `<div style="height:100%;border-radius:4px;flex:${pct};background:${segmentColors[name]};min-width:0;" title="${name}: ${pct}%"></div>` : '';
            })
            .filter(Boolean)
            .join('');
        const allocationBarHorizontalHTML = allocationBarSegmentsHTML
            ? `<div style="display:flex;height:8px;border-radius:8px;overflow:hidden;gap:2px;margin-bottom:20px;">${allocationBarSegmentsHTML}</div>`
            : '';

        const hasInvestments = (netWorth.mutual_funds + netWorth.stocks + netWorth.crypto) > 0;

        // Auto-snapshot on first load of the day (non-blocking)
        const today = new Date().toISOString().split('T')[0];
        const lastSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1].snapshot_date.split('T')[0] : null;
        if (lastSnapshot !== today) {
            api.dashboard.takeSnapshot(portfolioId)
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
        const _progressClamped = Math.min(progress, 100);
        const _hasGoal = goal.target > 0;

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

        // Check if today is user's birthday
        const isBirthday = settings?.date_of_birth ? (() => {
            const dob = new Date(settings.date_of_birth);
            const now = new Date();
            return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
        })() : false;

        const { greeting, emoji, tip } = getDashboardGreeting(username);

        const getGreetingTimeOfDay = () => {
            const hour = new Date().getHours();
            if (hour < 12) return 'morning';
            if (hour < 17) return 'afternoon';
            return 'evening';
        };

        // Birthday messages
        const birthdayMessages = [
            `🎂 Happy Birthday, ${username}! Another year of financial growth!`,
            `🎉 Wishing you a fantastic birthday, ${username}! May your net worth soar!`,
            `🥳 It's your special day, ${username}! Celebrate wisely and invest for tomorrow!`,
            `🎈 Birthday cheers, ${username}! Here's to another year of smart money moves!`,
            `🎁 Happy Birthday, ${username}! The best gift is financial freedom!`,
        ];
        const birthdayMessage = birthdayMessages[Math.floor(Math.random() * birthdayMessages.length)];

        // Override greeting and tip on birthday
        const _displayGreeting = isBirthday ? birthdayMessage : `${greeting} ${emoji}`;
        const _displayTip = isBirthday ? "🎊 Take a moment to celebrate yourself today! You've earned it." : tip;


        const html = `
            <div class="dash-header" style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;">
                <div>
                    <p class="dash-eyebrow" style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Wealth OS · Personal Finance</p>
                    <h1 class="dash-greeting" style="font-family:var(--font-display);font-size:clamp(32px,5vw,48px);font-weight:400;font-style:italic;line-height:1;color:var(--text-primary);letter-spacing:-0.01em;margin:0;">${isBirthday ? birthdayMessage : `Good ${getGreetingTimeOfDay()}, <em>${username || 'there'}</em>`}</h1>
                </div>
                <div class="dash-header-right" style="display:flex;align-items:center;gap:20px;">
                    <span class="dash-refresh-badge" style="font-family:var(--font-mono);font-size:10px;color:var(--muted2);letter-spacing:0.08em;"><span class="dash-live-dot" style="width:6px;height:6px;background:var(--green);border-radius:50%;display:inline-block;margin-right:6px;animation:dashPulse 2s ease infinite;"></span><span id="header-clock"></span></span>
                </div>
            </div>
            <style>
                @keyframes dashPulse { 0%,100% { opacity:1;box-shadow:0 0 0 0 rgba(74,222,128,0.4); } 50% { opacity:0.7;box-shadow:0 0 0 4px rgba(74,222,128,0); } }
            </style>
            ${isBirthday ? '<canvas id="birthdayConfetti" style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;"></canvas>' : ''}
            <div class="stat-grid">
                <div class="stat-card desktop-summary-card" style="background:linear-gradient(135deg,#0f1a0f 0%,#0d1320 100%);border-color:rgba(74,222,128,0.15);position:relative;overflow:hidden;">
                    <div style="content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(74,222,128,0.08) 0%,transparent 70%);pointer-events:none;"></div>
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
                        <div style="width:100%;height:2px;background:var(--surface3);border-radius:2px;margin:3px 0;overflow:hidden;"><div style="height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.16,1,0.3,1);width:${((netWorth.savings + netWorth.fixed_deposits) / (netWorth.total + netWorth.liabilities) * 100).toFixed(1)}%;background:var(--c-savings);"></div></div>
                        <div style="display:flex;justify-content:space-between;"><span>MF + Stocks</span><span class="mono">${Utilities.formatCurrency(netWorth.mutual_funds + netWorth.stocks)}</span></div>
                        <div style="width:100%;height:2px;background:var(--surface3);border-radius:2px;margin:3px 0;overflow:hidden;"><div style="height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.16,1,0.3,1);width:${((netWorth.mutual_funds + netWorth.stocks) / (netWorth.total + netWorth.liabilities) * 100).toFixed(1)}%;background:var(--c-mf);"></div></div>
                        <div style="display:flex;justify-content:space-between;"><span>Crypto</span><span class="mono">${Utilities.formatCurrency(netWorth.crypto)}</span></div>
                        <div style="width:100%;height:2px;background:var(--surface3);border-radius:2px;margin:3px 0;overflow:hidden;"><div style="height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.16,1,0.3,1);width:${(netWorth.crypto / (netWorth.total + netWorth.liabilities) * 100).toFixed(1)}%;background:var(--c-crypto);"></div></div>
                        <div style="display:flex;justify-content:space-between;"><span>EPF + PPF</span><span class="mono">${Utilities.formatCurrency(netWorth.epf + netWorth.ppf)}</span></div>
                        <div style="width:100%;height:2px;background:var(--surface3);border-radius:2px;margin:3px 0;overflow:hidden;"><div style="height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.16,1,0.3,1);width:${((netWorth.epf + netWorth.ppf) / (netWorth.total + netWorth.liabilities) * 100).toFixed(1)}%;background:var(--c-epf);"></div></div>
                    </div>
                </div>
                <div class="stat-card desktop-summary-card">
                    <h3>Total Liabilities</h3>
                    <p class="stat-value ${netWorth.liabilities + totalCCOutstanding > 0 ? 'negative' : ''}">${Utilities.formatCurrency(netWorth.liabilities + totalCCOutstanding)}</p>
                    <div style="font-size:13px;line-height:1.6;color:var(--text-muted);margin-top:4px;">
                        <div style="display:flex;justify-content:space-between;"><span>Active Loans</span><span class="mono">${Utilities.formatCurrency(netWorth.liabilities)}</span></div>
                        <div style="display:flex;justify-content:space-between;"><span>Credit Card Debt</span><span class="mono">${Utilities.formatCurrency(totalCCOutstanding)}</span></div>
                        ${totalCCOutstanding > 0 && nextCCLabel ? `
                        <div style="margin-top:12px;padding:10px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.1);border-radius:8px;">
                            <p style="font-family:var(--font-mono);font-size:9px;color:var(--green);letter-spacing:0.06em;margin:0;">DEBT-FREE TRAJECTORY</p>
                            <p style="font-family:var(--font-mono);font-size:10px;color:var(--muted);margin:3px 0 0;">Due ${nextCCLabel.date} · ${ccUtilization.toFixed(0)}% utilization</p>
                        </div>` : ''}
                    </div>
                </div>
                ${creditCards.length > 0 ? `
                <div class="stat-card cc-stat-card" onclick="window.app.switchTab('creditCards')" style="cursor:pointer;">
                    <h3>Credit Cards</h3>
                    <p class="stat-value mono ${ccUrgencyClass || (totalCCDue > 0 ? 'value-negative' : '')}">${Utilities.formatCurrency(totalCCDue)}</p>
                    <p class="stat-change">${creditCards.length} card${creditCards.length !== 1 ? 's' : ''}${nextCCLabel ? ` · Due ${nextCCLabel.date}` : ''}</p>
                    ${totalCCLimit > 0 ? `
                    <div style="margin-top:8px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                            <span style="font-size:12px;color:var(--text-muted);">Utilization</span>
                            <span style="font-size:12px;font-weight:700;color:${ccUtilization > 70 ? 'var(--red)' : ccUtilization > 50 ? 'var(--yellow)' : 'var(--green)'}">${ccUtilization.toFixed(0)}%</span>
                        </div>
                        <div style="background:var(--bg-elevated);border-radius:100px;height:4px;overflow:hidden;">
                            <div style="height:100%;width:${Math.min(ccUtilization, 100).toFixed(1)}%;background:${ccUtilization > 70 ? 'var(--red)' : ccUtilization > 50 ? 'var(--yellow)' : 'var(--green)'};border-radius:100px;transition:width .4s;"></div>
                        </div>
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
                ${allocationBarHorizontalHTML}
                ${legendHTML}
            </div>
            <div class="section-header"></div>
            <div class="breakdown">
                <h3>Investments P/L</h3>
                ${hasInvestments ? `
                <div class="stat-grid">
                    <div class="stat-card" style="background:linear-gradient(135deg,${totalPL.pl >= 0 ? '#0d180d' : '#18100f'} 0%,var(--bg-card) 100%);border-color:${totalPL.pl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'};">
                        <h3>Total P/L</h3>
                        <p class="stat-value ${totalPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL.pl)}</p>
                        <p class="stat-change">${totalPL.plPercent}%</p>
                        <div style="margin-top:14px;height:1px;background:${totalPL.pl >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}"></div>
                        <p style="margin-top:10px;font-family:var(--font-mono);font-size:8px;color:var(--muted2);letter-spacing:0.08em;">ALL INSTRUMENTS COMBINED</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('mutualFunds')" style="cursor:pointer;background:linear-gradient(135deg,${mfPL.pl >= 0 ? '#0d180d' : '#18100f'} 0%,var(--bg-card) 100%);border-color:${mfPL.pl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'}">
                        <h3>Mutual Funds P/L</h3>
                        <p class="stat-value ${mfPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(mfPL.pl)}</p>
                        <p class="stat-change">${mfPL.plPercent}%</p>
                        <div style="margin-top:14px;height:1px;background:${mfPL.pl >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}"></div>
                        <p style="margin-top:10px;font-family:var(--font-mono);font-size:8px;color:var(--muted2);letter-spacing:0.08em;">MUTUAL FUNDS PORTFOLIO</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('stocks')" style="cursor:pointer;background:linear-gradient(135deg,${stocksPL.pl >= 0 ? '#0d180d' : '#18100f'} 0%,var(--bg-card) 100%);border-color:${stocksPL.pl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'}">
                        <h3>Stocks & ETF P/L</h3>
                        <p class="stat-value ${stocksPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(stocksPL.pl)}</p>
                        <p class="stat-change">${stocksPL.plPercent}%</p>
                        <div style="margin-top:14px;height:1px;background:${stocksPL.pl >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}"></div>
                        <p style="margin-top:10px;font-family:var(--font-mono);font-size:8px;color:var(--muted2);letter-spacing:0.08em;">STOCKS & ETF PORTFOLIO</p>
                    </div>
                    <div class="stat-card" onclick="window.app.switchTab('crypto')" style="cursor:pointer;background:linear-gradient(135deg,${cryptoPL.pl >= 0 ? '#0d180d' : '#18100f'} 0%,var(--bg-card) 100%);border-color:${cryptoPL.pl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'}">
                        <h3>Crypto P/L</h3>
                        <p class="stat-value ${cryptoPL.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(cryptoPL.pl)}</p>
                        <p class="stat-change">${cryptoPL.plPercent}%</p>
                        <div style="margin-top:14px;height:1px;background:${cryptoPL.pl >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}"></div>
                        <p style="margin-top:10px;font-family:var(--font-mono);font-size:8px;color:var(--muted2);letter-spacing:0.08em;">CRYPTO PORTFOLIO</p>
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

            <div class="breakdown">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h3 style="margin:0;">Net Worth History</h3>
                    <div style="display:flex;gap:6px;">
                        ${['1W', '1M', 'ALL'].map(f => `<button class="chart-filter-pill${f === 'ALL' ? ' active' : ''}" data-filter="${f}" onclick="window._setChartFilter('${f}')" style="background:${f === 'ALL' ? 'rgba(232,255,71,0.08)' : 'transparent'};color:${f === 'ALL' ? '#e8ff47' : 'var(--muted2)'};border:${f === 'ALL' ? '1px solid rgba(232,255,71,0.25)' : '1px solid var(--border)'};border-radius:100px;padding:4px 10px;font-size:9px;font-weight:600;cursor:pointer;font-family:var(--font-mono);transition:all 0.2s;">${f}</button>`).join('')}
                    </div>
                </div>
                <div class="chart-container" style="position:relative;height:220px;width:100%;padding-left:0;">
                    <div id="netWorthChart" style="width:100%;height:100%;overflow:visible;"></div>
                </div>
            </div>


            <div class="last-refreshed">Last Refreshed ${lastRefreshedText}</div>
        `;

        container.innerHTML = html;

        // Live clock update
        const _updateClock = () => {
            const el = document.getElementById('header-clock');
            if (!el) return;
            const now = new Date();
            el.textContent = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        };
        _updateClock();
        const _clockInterval = setInterval(() => {
            if (!document.getElementById('header-clock')) { clearInterval(_clockInterval); return; }
            _updateClock();
        }, 60000);

        // Trigger confetti animation on birthday
        if (isBirthday) {
            setTimeout(() => {
                const canvas = document.getElementById('birthdayConfetti');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;

                    const particles = [];
                    const cs = getComputedStyle(document.documentElement);
                    const colors = [
                        cs.getPropertyValue('--red').trim(),
                        cs.getPropertyValue('--green').trim(),
                        cs.getPropertyValue('--blue').trim(),
                        cs.getPropertyValue('--c-crypto').trim(),
                        cs.getPropertyValue('--c-epf').trim(),
                        cs.getPropertyValue('--accent').trim(),
                        cs.getPropertyValue('--c-stocks').trim(),
                        cs.getPropertyValue('--c-ppf').trim(),
                    ];

                    for (let i = 0; i < 150; i++) {
                        particles.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height - canvas.height,
                            size: Math.random() * 8 + 4,
                            color: colors[Math.floor(Math.random() * colors.length)],
                            speedX: Math.random() * 4 - 2,
                            speedY: Math.random() * 3 + 2,
                            rotation: Math.random() * 360,
                            rotationSpeed: Math.random() * 4 - 2
                        });
                    }

                    let animationId;
                    const animate = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        particles.forEach(p => {
                            p.y += p.speedY;
                            p.x += p.speedX;
                            p.rotation += p.rotationSpeed;

                            if (p.y > canvas.height) {
                                p.y = -20;
                                p.x = Math.random() * canvas.width;
                            }

                            ctx.save();
                            ctx.translate(p.x, p.y);
                            ctx.rotate(p.rotation * Math.PI / 180);
                            ctx.fillStyle = p.color;
                            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                            ctx.restore();
                        });

                        animationId = requestAnimationFrame(animate);
                    };

                    animate();

                    // Stop confetti after 5 seconds
                    setTimeout(() => {
                        cancelAnimationFrame(animationId);
                        if (canvas && canvas.parentNode) {
                            canvas.parentNode.removeChild(canvas);
                        }
                    }, 5000);
                }
            }, 500);
        }

        _cachedPortfolioId = portfolioId;
        _chartFilter = 'ALL';
        await renderNetWorthChart(portfolioId);
        await renderNetWorthSparkline(snapshots);

        window._dashAllocationData = { allocation, portfolioId };

        window._setChartFilter = (filter) => {
            _chartFilter = filter;
            document.querySelectorAll('.chart-filter-pill').forEach(p => {
                const isActive = p.dataset.filter === filter;
                p.classList.toggle('active', isActive);
                p.style.background = isActive ? 'var(--accent)' : 'var(--bg-elevated)';
                p.style.color = isActive ? '#09090b' : 'var(--text-muted)';
            });
            renderNetWorthChart(_cachedPortfolioId);
        };
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
    const cs = getComputedStyle(document.documentElement);
    const sparkIsUp = data.length < 2 || data[data.length - 1] >= data[0];

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
                borderColor: sparkIsUp ? cs.getPropertyValue('--green').trim() : cs.getPropertyValue('--red').trim(),
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
        // Fetch and cache only on first load or explicit portfolio change
        if (portfolioId && portfolioId !== _cachedPortfolioId) {
            _cachedSnapshots = []
            _cachedPortfolioId = portfolioId;
        }
        if (!_cachedSnapshots.length && portfolioId) {
            const resp = await api.dashboard.timeline(portfolioId);
            _cachedSnapshots = resp.data || [];
        }

        const now = Date.now();
        const cutoffs = {
            '1W': now - 7 * 24 * 60 * 60 * 1000,
            '1M': now - 30 * 24 * 60 * 60 * 1000,
            'ALL': 0,
        };
        const cutoff = cutoffs[_chartFilter] ?? 0;

        if (!_cachedSnapshots?.length) {
            return;
        }

        const snapshots = cutoff > 0
            ? _cachedSnapshots.filter(s => new Date(s.snapshot_date).getTime() >= cutoff)
            : _cachedSnapshots;

        const container = document.getElementById('netWorthChart');
        if (!container) return;

        if (snapshots.length === 0) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--font-mono);font-size:12px;color:var(--muted);">No snapshots yet. Click "Take Snapshot" to start tracking.</div>';
            return;
        }

        const data = snapshots.map(s => ({ d: s.snapshot_date, v: parseFloat(s.net_worth) || 0 }));
        const isUp = data.length < 2 || data[data.length - 1].v >= data[0].v;
        const lineColor = isUp ? '#4ade80' : '#f87171';
        const gradColor = isUp ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';

        const W = container.offsetWidth || 0;
        if (W <= 10) return;
        const H = 220;
        const PAD = { top: 20, right: 36, bottom: 40, left: 0 };
        const chartW = W - PAD.left - PAD.right;
        const chartH = H - PAD.top - PAD.bottom;

        const minV = Math.min(...data.map(d => d.v)) * 0.998;
        const maxV = Math.max(...data.map(d => d.v)) * 1.001;

        const xScale = (i) => data.length <= 1 ? PAD.left + chartW / 2 : PAD.left + (i / (data.length - 1)) * chartW;
        const yScale = (v) => PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;

        const pts = data.map((d, i) => ({ x: xScale(i), y: yScale(d.v), ...d }));

        // Catmull-Rom smooth curve
        function catmull(pts) {
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[Math.max(i - 1, 0)];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[Math.min(i + 2, pts.length - 1)];
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
            return d;
        }

        const linePath = catmull(pts);
        const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${H - PAD.bottom} L ${pts[0].x} ${H - PAD.bottom} Z`;

        // Grid lines at 4 intervals
        const yTicks = [];
        const step = (maxV - minV) / 3;
        for (let i = 0; i < 4; i++) {
            yTicks.push(minV + step * i);
        }
        const gridLines = yTicks.map(v => {
            const y = yScale(v);
            return `<line x1="0" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                    <text x="${W - PAD.right - 4}" y="${y + 3}" font-family="var(--font-mono)" font-size="8" fill="#52525b" text-anchor="end">${(v / 100000).toFixed(0)}L</text>`;
        }).join('');

        // X axis labels
        const xLabels = [];
        const labelStep = Math.max(1, Math.floor(data.length / 5));
        for (let i = 0; i < data.length; i += labelStep) {
            xLabels.push(i);
        }
        const xLabelsHTML = xLabels.map(i => {
            const p = pts[i];
            const date = new Date(data[i].d);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `<text x="${p.x}" y="${H - 4}" text-anchor="middle" font-family="var(--font-mono)" font-size="8" fill="#52525b">${dateStr}</text>`;
        }).join('');

        const svgContent = `
            <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible;">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${gradColor}"/>
                        <stop offset="100%" stop-color="rgba(232,255,71,0)"/>
                    </linearGradient>
                </defs>
                ${gridLines}
                <line x1="${W - PAD.right}" y1="${PAD.top}" x2="${W - PAD.right}" y2="${H - PAD.bottom}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                ${xLabelsHTML}
                <path d="${areaPath}" fill="url(#areaGrad)"/>
                <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linecap="round"/>
                <line id="crossV" x1="0" y1="${PAD.top}" x2="0" y2="${H - PAD.bottom}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3 3" style="opacity:0;pointer-events:none;"/>
                ${pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${lineColor}" opacity="0" id="pt${i}" style="pointer-events:none;"/>`).join('')}
            </svg>
            <div id="tooltip" style="position:absolute;pointer-events:none;background:var(--surface3);border:1px solid var(--border2);border-radius:10px;padding:8px 12px;font-family:var(--font-mono);font-size:10px;color:var(--text-primary);white-space:nowrap;opacity:0;transition:opacity 0.15s;z-index:10;"></div>
        `;

        container.style.position = 'relative';
        container.innerHTML = svgContent;
        const svgNode = container.querySelector('svg');
        const crossV = container.querySelector('#crossV');
        const tooltip = container.querySelector('#tooltip');

        svgNode.addEventListener('mousemove', (e) => {
            const rect = svgNode.getBoundingClientRect();
            const mx = e.clientX - rect.left;

            let closest = 0, minDist = Infinity;
            pts.forEach((p, i) => {
                const d = Math.abs(p.x - mx);
                if (d < minDist) { minDist = d; closest = i; }
            });

            const p = pts[closest];
            crossV.setAttribute('x1', p.x);
            crossV.setAttribute('x2', p.x);
            crossV.style.opacity = '1';

            pts.forEach((_, i) => {
                const c = container.querySelector(`#pt${i}`);
                if (c) c.setAttribute('opacity', i === closest ? '1' : '0');
            });

            const date = new Date(data[closest].d);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            tooltip.innerHTML = `<span style="color:var(--muted);margin-right:8px;">${dateStr}</span>${Utilities.formatCurrency(data[closest].v)}`;
            tooltip.style.opacity = '1';

            let tx = p.x + 12;
            if (tx + 160 > W) tx = p.x - 160;
            tooltip.style.left = tx + 'px';
            tooltip.style.top = (p.y - 20) + 'px';
        });

        svgNode.addEventListener('mouseleave', () => {
            crossV.style.opacity = '0';
            tooltip.style.opacity = '0';
            pts.forEach((_, i) => {
                const c = container.querySelector(`#pt${i}`);
                if (c) c.setAttribute('opacity', '0');
            });
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

    const cs = getComputedStyle(document.documentElement);
    const accentColor = cs.getPropertyValue('--accent').trim();
    const goalColor = cs.getPropertyValue('--green').trim();
    const textColor = cs.getPropertyValue('--muted').trim();
    const gridColor = cs.getPropertyValue('--border').trim();

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
                    backgroundColor: cs.getPropertyValue('--accent-dim').trim(),
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
