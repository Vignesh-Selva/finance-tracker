import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

// ─── Constants ────────────────────────────────────────────
const TARGET_KEY = 'rebalancing_targets_v1';
const _LOCKED_IN_KEYS = new Set(['epfPpf']);
const BUCKETS = ['Equity', 'Debt', 'Cash', 'Gold', 'Crypto', 'Other'];

const ASSET_CLASSES = [
    { key: 'savings',       label: 'Savings' },
    { key: 'fixedDeposits', label: 'Fixed Deposits' },
    { key: 'mutualFunds',   label: 'Mutual Funds' },
    { key: 'stocks',        label: 'Stocks' },
    { key: 'crypto',        label: 'Crypto' },
    { key: 'epfPpf',        label: 'EPF / PPF' },
];

// ─── Module state ─────────────────────────────────────────
let _activeTab = 'plan';

// ─── LocalStorage helpers ─────────────────────────────────
function _loadTargets() {
    try { return JSON.parse(localStorage.getItem(TARGET_KEY) || '{}'); } catch { return {}; }
}
function _saveTargets(t) { localStorage.setItem(TARGET_KEY, JSON.stringify(t)); }
function _totalTargets(t) { return ASSET_CLASSES.reduce((s, a) => s + (parseFloat(t[a.key]) || 0), 0); }

function planKey(pid) { return `fin_plan_v1_${pid}`; }
function watchKey(pid) { return `fin_watch_v1_${pid}`; }
function rulesKey(pid) { return `fin_rules_v1_${pid}`; }

function loadPlan(pid) {
    try { return JSON.parse(localStorage.getItem(planKey(pid)) || 'null') || { sips: [], ppf: 0, varMin: 0, varExpected: 0 }; } catch { return { sips: [], ppf: 0, varMin: 0, varExpected: 0 }; }
}
function savePlan(pid, p) { localStorage.setItem(planKey(pid), JSON.stringify(p)); }

function loadWatchList(pid) {
    try { return JSON.parse(localStorage.getItem(watchKey(pid)) || '[]'); } catch { return []; }
}
function saveWatchList(pid, l) { localStorage.setItem(watchKey(pid), JSON.stringify(l)); }

function loadRules(pid) {
    try { return JSON.parse(localStorage.getItem(rulesKey(pid)) || '[]'); } catch { return []; }
}
function saveRules(pid, r) { localStorage.setItem(rulesKey(pid), JSON.stringify(r)); }

// ─── Main render ──────────────────────────────────────────
export async function renderRebalancing(portfolioId) {
    const container = document.getElementById('content-rebalancing');
    if (!container) return;
    container.innerHTML = '<div class="skeleton-card"></div>';

    try {
        const resp = await api.dashboard.get(portfolioId);
        const { netWorth, allocation, settings } = resp.data;

        container.innerHTML = buildShell();
        attachTabEvents(container, portfolioId, { netWorth, allocation, settings });
        await renderActiveTab(container, portfolioId, { netWorth, allocation, settings });
    } catch {
        container.innerHTML = '<div class="error-state"><p>Failed to load rebalancing data.</p><button class="btn btn-primary" onclick="window.app.refreshCurrentTab()">Retry</button></div>';
    }
}

function buildShell() {
    return `
        <div>
            <div class="section-header">
                <h2>Financial Planning</h2>
                <button class="btn btn-ghost" onclick="window.app.renderCurrentTab()">↺ Refresh</button>
            </div>
            <div class="mft-tab-bar" id="rebal-tab-bar">
                <button class="mft-tab ${_activeTab === 'plan' ? 'active' : ''}" data-tab="plan">💰 Cash Flow & Plan</button>
                <button class="mft-tab ${_activeTab === 'watch' ? 'active' : ''}" data-tab="watch">👁 Watch List</button>
                <button class="mft-tab ${_activeTab === 'rules' ? 'active' : ''}" data-tab="rules">📋 Rules</button>
            </div>
            <div id="rebal-tab-content"></div>
        </div>`;
}

function attachTabEvents(container, portfolioId, data) {
    container.querySelectorAll('#rebal-tab-bar [data-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            _activeTab = btn.dataset.tab;
            container.querySelectorAll('#rebal-tab-bar [data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await renderActiveTab(container, portfolioId, data);
        });
    });
}

async function renderActiveTab(container, portfolioId, data) {
    const content = container.querySelector('#rebal-tab-content');
    if (!content) return;
    content.innerHTML = '';
    if (_activeTab === 'plan') renderPlanTab(content, portfolioId, data);
    else if (_activeTab === 'watch') renderWatchTab(content, portfolioId, data);
    else if (_activeTab === 'rules') renderRulesTab(content, portfolioId);
}

// ─── Tab 1: Cash Flow & Plan ──────────────────────────────
function renderPlanTab(content, portfolioId, { netWorth, settings }) {
    const plan = loadPlan(portfolioId);
    const salary = parseFloat(settings?.salary) || 0;
    const expenses = parseFloat(settings?.expenses) || 0;
    const efAmt = parseFloat(settings?.emergency_fund) || 0;
    const _efLocation = settings?.emergency_fund_location || '';
    const taxRegime = settings?.tax_regime || '';
    const retYears = parseFloat(settings?.retirement_years) || 0;
    const lifeIns = settings?.life_insurance || false;
    const healthIns = settings?.health_insurance || false;
    const healthInsSpouse = settings?.health_insurance_for_spouse || false;
    const healthInsDep = settings?.health_insurance_for_dependents || false;
    const dependents = settings?.dependents || 0;
    const maritalStatus = settings?.marital_status || '';
    const efTargetMonths = parseInt(settings?.emergency_fund_months) || 6;

    const totalOutflow = plan.sips.reduce((s, sip) => s + (parseFloat(sip.outflow) || 0), 0);
    const totalInvested = plan.sips.reduce((s, sip) => s + (parseFloat(sip.amount) || 0), 0);
    const ppfContrib = parseFloat(plan.ppf) || 0;
    const surplus = salary - expenses - totalOutflow - ppfContrib;
    const varMin = parseFloat(plan.varMin) || 0;

    const noProfilePrompt = salary === 0
        ? `<div class="cc-warning-banner" style="margin-bottom:16px;">ℹ️ Set your salary and expenses in <strong>Settings → Financial Profile</strong> to unlock the cash flow summary.</div>`
        : '';
    const deficitAlert = surplus < 0 && salary > 0
        ? `<div class="cc-warning-banner" style="border-color:var(--red);background:rgba(239,68,68,0.08);margin-bottom:16px;">🚨 Deficit: your monthly commitments exceed take-home by ${Utilities.formatCurrency(Math.abs(surplus))}.</div>`
        : '';
    const surplusWarn = surplus >= 0 && surplus < varMin && salary > 0
        ? `<div class="cc-warning-banner" style="border-color:var(--yellow);background:rgba(245,158,11,0.08);margin-bottom:16px;">⚠️ Available surplus (${Utilities.formatCurrency(surplus)}) is below your minimum variable deployment (${Utilities.formatCurrency(varMin)}).</div>`
        : '';

    // Emergency fund
    const efMonths = expenses > 0 ? efAmt / expenses : 0;
    const efThreshold = expenses * efTargetMonths;
    const efExcess = Math.max(0, efAmt - efThreshold);
    const efClass = efMonths >= efTargetMonths ? 'value-positive' : efMonths >= (efTargetMonths / 2) ? 'value-neutral' : 'value-negative';
    const efLabel = efExcess > 0 ? '✓ Above target' : efMonths >= efTargetMonths ? '✓ Adequate' : efMonths >= (efTargetMonths / 2) ? '⚠ Partial' : '✗ Insufficient';
    const efBarColor = efMonths >= efTargetMonths ? (efExcess > 0 ? 'var(--accent)' : 'var(--green)') : efMonths >= (efTargetMonths / 2) ? 'var(--yellow)' : 'var(--red)';
    const efBarWidth = Math.min(100, (efMonths / efTargetMonths) * 100).toFixed(0);

    // Insurance and emergency fund recommendations
    let recommendationBanner = '';
    if (salary > 0) {
        const hasEmergencyFund = efMonths >= efTargetMonths;
        const hasLifeInsurance = lifeIns;
        const hasHealthInsurance = healthIns;
        const hasSpouseHealthInsurance = maritalStatus === 'married' ? healthInsSpouse : true;
        const hasDependentHealthInsurance = dependents > 0 ? healthInsDep : true;
        const hasInsurance = hasLifeInsurance && hasHealthInsurance && hasSpouseHealthInsurance && hasDependentHealthInsurance;

        if (!hasEmergencyFund) {
            recommendationBanner = `
                <div class="cc-warning-banner" style="margin-bottom:16px;border-color:var(--red);background:rgba(239,68,68,0.08);">
                    <strong>🚨 Priority: Build Emergency Fund First</strong>
                    <p style="margin:4px 0 0 0;font-size:13px;">You have only ${efMonths.toFixed(1)} months of expenses saved. Aim for ${efTargetMonths} months before investing.</p>
                    <p style="margin:4px 0 0 0;font-size:13px;">💡 Suggestion: Park savings in FD or RD for safety and liquidity.</p>
                </div>`;
        } else if (hasEmergencyFund && efExcess > 0) {
            recommendationBanner = `
                <div class="cc-warning-banner" style="margin-bottom:16px;border-color:var(--accent);background:rgba(217,119,87,0.08);">
                    <strong>💡 Consider Moving Excess Emergency Fund</strong>
                    <p style="margin:4px 0 0 0;font-size:13px;">You have ${Utilities.formatCurrency(efExcess)} above your ${efTargetMonths}-month target (${Utilities.formatCurrency(efThreshold)}).</p>
                    <p style="margin:4px 0 0 0;font-size:13px;">💡 Suggestion: Deploy excess into investments for better returns.</p>
                </div>`;
        } else if (hasEmergencyFund && !hasInsurance) {
            recommendationBanner = `
                <div class="cc-warning-banner" style="margin-bottom:16px;border-color:var(--yellow);background:rgba(245,158,11,0.08);">
                    <strong>⚠️ Next Step: Get Insurance Coverage</strong>
                    <p style="margin:4px 0 0 0;font-size:13px;">Emergency fund is adequate (${efMonths.toFixed(1)} months). Now protect yourself with insurance.</p>
                    ${!hasLifeInsurance ? '<p style="margin:4px 0 0 0;font-size:13px;">• Get a term life insurance plan (10-15x annual income)</p>' : ''}
                    ${!hasHealthInsurance ? '<p style="margin:4px 0 0 0;font-size:13px;">• Get health insurance for yourself</p>' : ''}
                    ${maritalStatus === 'married' && !hasSpouseHealthInsurance ? '<p style="margin:4px 0 0 0;font-size:13px;">• Get health insurance for your spouse</p>' : ''}
                    ${dependents > 0 && !hasDependentHealthInsurance ? '<p style="margin:4px 0 0 0;font-size:13px;">• Get health insurance for your dependents</p>' : ''}
                </div>`;
        } else if (hasEmergencyFund && hasInsurance) {
            recommendationBanner = `
                <div class="cc-warning-banner" style="margin-bottom:16px;border-color:var(--green);background:rgba(34,197,94,0.08);">
                    <strong>✓ Ready to Invest</strong>
                    <p style="margin:4px 0 0 0;font-size:13px;">Emergency fund and insurance are in place. You can proceed with investments.</p>
                </div>`;
        }
    }

    const sipRows = plan.sips.map((sip, i) => `
        <tr>
            <td data-label="Instrument">${sip.name}</td>
            <td data-label="Bucket"><span class="badge badge-muted">${sip.bucket || '—'}</span></td>
            <td data-label="Invested/mo" class="mono">${Utilities.formatCurrency(parseFloat(sip.amount) || 0)}</td>
            <td data-label="Actual Outflow" class="mono">${Utilities.formatCurrency(parseFloat(sip.outflow) || 0)}</td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="window._editSip(${i})">✏️</button>
                <button class="btn-ghost" style="padding:4px 8px;font-size:12px;color:var(--red);" onclick="window._deleteSip(${i})">✕</button>
            </td>
        </tr>`).join('');

    content.innerHTML = `
        ${salary > 0 ? `
        <div class="stat-grid" style="margin-top:16px;">
            <div class="stat-card">
                <h3>Take-home Salary</h3>
                <p class="stat-value">${Utilities.formatCurrency(salary)}</p>
                ${taxRegime ? `<p class="stat-change">${taxRegime}</p>` : ''}
                ${retYears > 0 ? `<p class="stat-change">${retYears}yr to retirement</p>` : ''}
            </div>
            <div class="stat-card">
                <h3>Monthly Expenses</h3>
                <p class="stat-value">${Utilities.formatCurrency(expenses)}</p>
            </div>
            <div class="stat-card">
                <h3>Fixed SIP Outflow</h3>
                <p class="stat-value">${Utilities.formatCurrency(totalOutflow + ppfContrib)}</p>
                ${totalOutflow !== totalInvested ? `<p class="stat-change">Invested: ${Utilities.formatCurrency(totalInvested)}</p>` : ''}
                ${ppfContrib > 0 ? `<p class="stat-change">+ PPF: ${Utilities.formatCurrency(ppfContrib)}</p>` : ''}
            </div>
            <div class="stat-card">
                <h3>Available Surplus</h3>
                <p class="stat-value ${surplus < 0 ? 'value-negative' : 'value-positive'}">${Utilities.formatCurrency(surplus)}</p>
                <p class="stat-change">For variable deployment${varMin > 0 ? ` · min ${Utilities.formatCurrency(varMin)}` : ''}</p>
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <h3>Emergency Fund</h3>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <label style="font-size:13px;color:var(--text-muted);">Target (months):</label>
                    <select id="ef-target-months" class="form-input" style="width:100px;padding:4px 8px;font-size:12px;" onchange="window._updateEfTarget(this.value)">
                        <option value="6" ${efTargetMonths === 6 ? 'selected' : ''}>6 months</option>
                        <option value="12" ${efTargetMonths === 12 ? 'selected' : ''}>12 months</option>
                    </select>
                </div>
                ${efAmt > 0 ? `
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div>
                        <p class="stat-value ${efClass}" style="font-size:1.4rem;margin:0;">${Utilities.formatCurrency(efAmt)}</p>
                        <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">${efMonths.toFixed(1)} months · <span class="${efClass}">${efLabel}</span></p>
                    </div>
                    <div style="flex:1;min-width:200px;">
                        <div style="background:var(--bg-elevated);border-radius:6px;height:10px;overflow:hidden;">
                            <div style="background:${efBarColor};height:100%;width:${efBarWidth}%;transition:width .3s;"></div>
                        </div>
                        <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Target: ${efTargetMonths} months = ${Utilities.formatCurrency(efThreshold)}</p>
                        ${efExcess > 0 ? `<p style="font-size:11px;color:var(--accent);margin-top:2px;">Excess: ${Utilities.formatCurrency(efExcess)} — consider deploying into investments</p>` : ''}
                    </div>
                </div>` : `<p style="color:var(--text-muted);font-size:13px;">Add your emergency fund amount in <strong>Settings → Financial Profile</strong>.</p>`}
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <h3>Financial Advice</h3>
                ${noProfilePrompt || deficitAlert || surplusWarn || recommendationBanner || '<p style="color:var(--text-muted);font-size:13px;">No advice at this time. Your financial health looks good!</p>'}
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <h3>Monthly Deployment Targets</h3>
                <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;">
                    <div>
                        <label style="font-size:13px;color:var(--text-muted);display:block;margin-bottom:4px;">PPF monthly (₹)</label>
                        <input type="number" min="0" step="500" value="${plan.ppf || ''}" placeholder="0"
                            class="form-input" style="width:130px;padding:6px 10px;font-size:13px;"
                            onchange="window._updatePlanMeta('ppf', this.value)">
                    </div>
                    <div>
                        <label style="font-size:13px;color:var(--text-muted);display:block;margin-bottom:4px;">Min variable deploy/mo (₹)</label>
                        <input type="number" min="0" step="1000" value="${plan.varMin || ''}" placeholder="0"
                            class="form-input" style="width:130px;padding:6px 10px;font-size:13px;"
                            onchange="window._updatePlanMeta('varMin', this.value)">
                    </div>
                    <div>
                        <label style="font-size:13px;color:var(--text-muted);display:block;margin-bottom:4px;">Expected variable deploy/mo (₹)</label>
                        <input type="number" min="0" step="1000" value="${plan.varExpected || ''}" placeholder="0"
                            class="form-input" style="width:130px;padding:6px 10px;font-size:13px;"
                            onchange="window._updatePlanMeta('varExpected', this.value)">
                    </div>
                </div>
            </div>
        </div>` : ''}

        <div class="breakdown" style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <h3>Fixed Investment Plan</h3>
                <button class="btn btn-primary" style="font-size:13px;padding:7px 14px;" onclick="window._addSip()">+ Add</button>
            </div>
            ${plan.sips.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Instrument</th><th>Bucket</th><th>Invested/mo</th><th>Actual Outflow</th><th></th></tr></thead>
                    <tbody>${sipRows}</tbody>
                </table>
            </div>` : `<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">No fixed SIPs defined. Add instruments you invest in every month.</p>`}
        </div>
    `;

    const showSipModal = (existing = null, idx = null) => {
        const isEdit = idx !== null;
        const s = existing || { name: '', amount: '', outflow: '', bucket: 'Equity' };
        const modal = document.getElementById('dataModal');
        document.getElementById('modalTitle').textContent = isEdit ? 'Edit SIP Entry' : 'Add SIP Entry';
        document.getElementById('modalBody').innerHTML = `
            <form id="sipForm">
                <div class="form-group">
                    <label>Instrument Name:</label>
                    <input type="text" id="sip-name" value="${s.name}" class="form-input" placeholder="e.g. Nifty 50 Index Fund" required />
                </div>
                <div class="form-group">
                    <label>Asset Bucket:</label>
                    <select id="sip-bucket" class="form-input">
                        ${BUCKETS.map(b => `<option value="${b}" ${s.bucket === b ? 'selected' : ''}>${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Invested Amount / month (₹):</label>
                    <input type="number" id="sip-amount" value="${s.amount}" class="form-input" min="0" step="100" placeholder="10000" required />
                </div>
                <div class="form-group">
                    <label>Actual Outflow / month (₹):</label>
                    <small class="form-hint">Include any brokerage, stamp duty or platform charges</small>
                    <input type="number" id="sip-outflow" value="${s.outflow}" class="form-input" min="0" step="100" placeholder="10020" required />
                </div>
            </form>`;
        modal.style.display = 'block';
        window.app.isSettingsModal = false;
        window.app._orderSaveHandler = () => {
            const name = document.getElementById('sip-name')?.value?.trim();
            const bucket = document.getElementById('sip-bucket')?.value;
            const amount = parseFloat(document.getElementById('sip-amount')?.value) || 0;
            const outflow = parseFloat(document.getElementById('sip-outflow')?.value) || 0;
            if (!name) { Utilities.showNotification('Instrument name is required', 'error'); return; }
            const p = loadPlan(portfolioId);
            const entry = { id: isEdit ? s.id : Date.now(), name, bucket, amount, outflow };
            if (isEdit) { p.sips[idx] = entry; } else { p.sips.push(entry); }
            savePlan(portfolioId, p);
            window.app.closeModal();
            renderPlanTab(content, portfolioId, { netWorth, settings });
        };
    };

    window._addSip = () => showSipModal();
    window._editSip = (i) => showSipModal(loadPlan(portfolioId).sips[i], i);
    window._deleteSip = (i) => {
        const p = loadPlan(portfolioId); p.sips.splice(i, 1); savePlan(portfolioId, p);
        renderPlanTab(content, portfolioId, { netWorth, settings });
    };
    window._updatePlanMeta = (key, value) => {
        const p = loadPlan(portfolioId); p[key] = parseFloat(value) || 0; savePlan(portfolioId, p);
    };
    window._updateEfTarget = async (value) => {
        const months = parseInt(value) || 6;
        try {
            const resp = await api.settings.list(portfolioId);
            const settingsArr = resp?.data || [];
            const existing = settingsArr[0];
            const data = { emergency_fund_months: months };
            if (existing?.id) {
                await api.settings.update(existing.id, data);
            } else {
                await api.settings.create({ ...data, portfolio_id: portfolioId });
            }
            renderPlanTab(content, portfolioId, { netWorth, settings: { ...settings, emergency_fund_months: months } });
        } catch {
            Utilities.showNotification('Failed to update target', 'error');
        }
    };
}

// ─── Tab 3: Watch List ────────────────────────────────────
function renderWatchTab(content, portfolioId, { netWorth }) {
    const list = loadWatchList(portfolioId);

    const rows = list.map((e, i) => `
        <tr>
            <td data-label="Holding" style="${e.status === 'dismissed' ? 'opacity:0.5;' : ''}">${e.name}</td>
            <td data-label="Concern" style="${e.status === 'dismissed' ? 'opacity:0.5;' : ''}">${e.note || '—'}</td>
            <td data-label="Status">${e.status === 'dismissed'
            ? '<span class="badge badge-muted">Dismissed</span>'
            : '<span class="badge badge-yellow">Under Review</span>'}</td>
            <td style="white-space:nowrap;">
                ${e.status !== 'dismissed'
            ? `<button class="btn-ghost" style="font-size:12px;padding:4px 8px;" onclick="window._dismissWatch(${i})">✓ Dismiss</button>`
            : `<button class="btn-ghost" style="font-size:12px;padding:4px 8px;" onclick="window._restoreWatch(${i})">↺ Restore</button>`}
                <button class="btn-ghost" style="font-size:12px;padding:4px 8px;color:var(--red);" onclick="window._deleteWatch(${i})">✕</button>
            </td>
        </tr>`).join('');

    content.innerHTML = `
        <div class="breakdown" style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <h3>Watch List</h3>
                <button class="btn btn-primary" style="font-size:13px;padding:7px 14px;" onclick="window._addWatch()">+ Add</button>
            </div>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Holdings that need attention. Advisory only — the system does not execute any trades.</p>
            ${list.length > 0 ? `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr><th>Holding</th><th>Concern</th><th>Status</th><th></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>` : `<p style="color:var(--text-muted);">No holdings on watch list. Add one to track anything needing attention.</p>`}
        </div>`;

    const showWatchModal = (existing = null, idx = null) => {
        const isEdit = idx !== null;
        const e = existing || { name: '', note: '', status: 'active' };
        const modal = document.getElementById('dataModal');
        document.getElementById('modalTitle').textContent = isEdit ? 'Edit Watch Entry' : 'Add to Watch List';
        document.getElementById('modalBody').innerHTML = `
            <form>
                <div class="form-group">
                    <label>Holding Name:</label>
                    <input type="text" id="watch-name" value="${e.name}" class="form-input" placeholder="e.g. HDFC Bank" required />
                </div>
                <div class="form-group">
                    <label>Concern Note:</label>
                    <textarea id="watch-note" class="form-input" rows="3" placeholder="What are you watching for?">${e.note || ''}</textarea>
                </div>
            </form>`;
        modal.style.display = 'block';
        window.app.isSettingsModal = false;
        window.app._orderSaveHandler = () => {
            const name = document.getElementById('watch-name')?.value?.trim();
            const note = document.getElementById('watch-note')?.value?.trim();
            if (!name) { Utilities.showNotification('Holding name is required', 'error'); return; }
            const wl = loadWatchList(portfolioId);
            const entry = { id: isEdit ? e.id : Date.now(), name, note, status: isEdit ? e.status : 'active' };
            if (isEdit) { wl[idx] = entry; } else { wl.push(entry); }
            saveWatchList(portfolioId, wl);
            window.app.closeModal();
            renderWatchTab(content, portfolioId, { netWorth });
        };
    };

    window._addWatch = () => showWatchModal();
    window._dismissWatch = (i) => {
        const wl = loadWatchList(portfolioId); wl[i].status = 'dismissed'; saveWatchList(portfolioId, wl);
        renderWatchTab(content, portfolioId, { netWorth });
    };
    window._restoreWatch = (i) => {
        const wl = loadWatchList(portfolioId); wl[i].status = 'active'; saveWatchList(portfolioId, wl);
        renderWatchTab(content, portfolioId, { netWorth });
    };
    window._deleteWatch = (i) => {
        const wl = loadWatchList(portfolioId); wl.splice(i, 1); saveWatchList(portfolioId, wl);
        renderWatchTab(content, portfolioId, { netWorth });
    };
}

// ─── Tab 4: Rules ─────────────────────────────────────────
function renderRulesTab(content, portfolioId) {
    const rules = loadRules(portfolioId);

    const rulesHTML = rules.map((r, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="color:var(--text-muted);font-size:13px;min-width:22px;">${i + 1}.</span>
            <input type="text" value="${r.replace(/"/g, '&quot;')}" class="form-input" style="flex:1;"
                onchange="window._updateRule(${i}, this.value)" />
            <button class="btn-ghost" style="padding:6px 10px;color:var(--red);" onclick="window._deleteRule(${i})">✕</button>
        </div>`).join('');

    content.innerHTML = `
        <div class="breakdown" style="margin-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <h3>Investment Rules</h3>
                <button class="btn btn-primary" style="font-size:13px;padding:7px 14px;" onclick="window._addRule()">+ Add Rule</button>
            </div>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Your personal investment rules — a reference to guide decisions. Editable at any time.</p>
            ${rules.length > 0 ? rulesHTML : `<p style="color:var(--text-muted);">No rules yet. Add guiding principles for your investments.</p>`}
        </div>`;

    window._addRule = () => {
        const r = loadRules(portfolioId); r.push(''); saveRules(portfolioId, r);
        renderRulesTab(content, portfolioId);
        setTimeout(() => {
            const inputs = content.querySelectorAll('input[type="text"]');
            inputs[inputs.length - 1]?.focus();
        }, 50);
    };
    window._updateRule = (i, value) => { const r = loadRules(portfolioId); r[i] = value; saveRules(portfolioId, r); };
    window._deleteRule = (i) => {
        const r = loadRules(portfolioId); r.splice(i, 1); saveRules(portfolioId, r);
        renderRulesTab(content, portfolioId);
    };
}
