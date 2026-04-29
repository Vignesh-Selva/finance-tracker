import Utilities from '../utils/utils.js';
import { setDisplayCurrency } from '../utils/formatUtils.js';
import { fetchFXRates, COMMON_CURRENCIES } from '../services/fxRates.js';
import { FormHandler } from '../ui/forms/formHandler.js';
import { renderDashboard } from '../ui/features/dashboard.js';
import { renderExpenses } from '../ui/features/expenses.js';
import { renderSavings } from '../ui/features/savings.js';
import { renderFixedDeposits } from '../ui/features/fixedDeposits.js';
import { renderMutualFunds } from '../ui/features/mutualFunds.js';
import { renderStocks } from '../ui/features/stocks.js';
import { renderCrypto } from '../ui/features/crypto.js';
import { renderLiabilities } from '../ui/features/liabilities.js';
import { renderCreditCards } from '../ui/features/creditCards.js';
import { renderBudgets } from '../ui/features/budgets.js';
import { renderRebalancing } from '../ui/features/rebalancing.js';
import api from '../services/api.js';
import { signOut as authSignOut, updateUser, getCurrentUser, extractUsernameFromEmail } from '../services/authService.js';
import { refreshAllPrices } from '../services/priceFetcher.js';

class PersonalFinanceApp {
    constructor() {
        this.portfolioId = null;
        this.formHandler = null;
        this.currentTab = 'dashboard';
        this.sidebarCollapsed = false;
        this.userSidebarPref = null;
        this.isSettingsModal = false;

        this.renderers = {
            dashboard: renderDashboard,
            expenses: renderExpenses,
            savings: renderSavings,
            fixedDeposits: renderFixedDeposits,
            mutualFunds: renderMutualFunds,
            stocks: renderStocks,
            crypto: renderCrypto,
            liabilities: renderLiabilities,
            creditCards: renderCreditCards,
            budgets: renderBudgets,
            rebalancing: renderRebalancing,
        };
    }

    async init() {
        try {
            // Load or create default portfolio
            await this.ensurePortfolio();

            this.formHandler = new FormHandler(this.portfolioId);
            this.formHandler.app = this;

            this.loadTheme();
            this.loadSidebarState();
            this.setupEventListeners();
            await this.initFXRates();
            await this.switchTab('dashboard');
        } catch (error) {
            console.error('App initialization error:', error);
            Utilities.showNotification('Failed to initialize app. Is the server running?', 'error');
        }
    }

    async initFXRates() {
        try {
            const resp = await api.settings.list(this.portfolioId);
            const settings = (resp?.data || [])[0] || {};
            const baseCurrency = settings.currency || 'INR';
            const displayCurrency = settings.display_currency || baseCurrency;
            const rates = await fetchFXRates('INR').catch(() => ({}));
            setDisplayCurrency(displayCurrency, rates, 'INR');
        } catch {
            setDisplayCurrency('INR', {}, 'INR');
        }
    }

    async ensurePortfolio() {
        try {
            const resp = await api.portfolios.list();
            const portfolios = resp?.data || [];

            if (portfolios.length > 0) {
                this.portfolioId = portfolios[0].id;
            } else {
                const created = await api.portfolios.create({
                    name: 'Default Portfolio',
                    description: 'Primary investment portfolio',
                    currency: 'INR',
                });
                this.portfolioId = created.data.id;
            }
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            throw error;
        }
    }

    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const themeIcon = document.getElementById('themeIcon');
            if (themeIcon) {
                themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';
            }
        } catch (error) {
            console.error('Theme load error:', error);
        }
    }

    loadSidebarState() {
        try {
            const stored = localStorage.getItem('sidebarCollapsed');
            this.userSidebarPref = stored === null ? null : stored === 'true';
            this.updateResponsiveLayout();
        } catch (error) {
            console.error('Sidebar state load error:', error);
        }
    }

    toggleSidebar() {
        this.setSidebarCollapsed(!this.sidebarCollapsed, false);
    }

    setSidebarCollapsed(collapsed, _persist = false) {
        this.sidebarCollapsed = collapsed;
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const backdrop = document.getElementById('sidebarBackdrop');
        const mainContent = document.querySelector('.main-content');

        if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
        if (mainContent) mainContent.classList.toggle('expanded', collapsed);
        if (toggleBtn) {
            toggleBtn.textContent = collapsed ? '☰' : '✕';
            toggleBtn.setAttribute('aria-expanded', (!collapsed).toString());
        }
        if (backdrop) {
            backdrop.style.display = (!collapsed && window.innerWidth <= 900) ? 'block' : 'none';
        }
    }

    updateResponsiveLayout() {
        this.setSidebarCollapsed(true, false);
    }

    setupEventListeners() {
        const closeBtn = document.querySelector('#dataModal .close');
        if (closeBtn) closeBtn.onclick = () => this.closeModal();

        window.onclick = (event) => {
            const modal = document.getElementById('dataModal');
            if (event.target === modal) this.closeModal();
        };

        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.onclick = () => {
                Utilities.toggleTheme();
                this.loadTheme();
            };
        }

        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) sidebarToggle.onclick = () => this.toggleSidebar();

        const backdrop = document.getElementById('sidebarBackdrop');
        if (backdrop) backdrop.onclick = () => this.setSidebarCollapsed(true, false);

        window.addEventListener('resize', () => this.updateResponsiveLayout());

        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            const tabName = item.getAttribute('data-tab');
            const handler = () => {
                if (tabName) {
                    this.switchTab(tabName);
                    if (window.innerWidth <= 900) this.setSidebarCollapsed(true, false);
                }
            };
            item.addEventListener('click', handler);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler();
                }
            });
        });
    }

    async switchTab(tabName) {
        try {
            this.currentTab = tabName;

            document.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
            document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

            const contentDiv = document.getElementById(`content-${tabName}`);
            if (contentDiv) contentDiv.classList.add('active');

            document.querySelectorAll('.sidebar-item').forEach(item => {
                if (item.getAttribute('data-tab') === tabName) item.classList.add('active');
            });

            await this.renderCurrentTab();
        } catch (error) {
            console.error('Tab switch error:', error);
            Utilities.showNotification('Failed to switch tab', 'error');
        }
    }

    async renderCurrentTab() {
        try {
            const renderFn = this.renderers[this.currentTab];
            if (renderFn) await renderFn(this.portfolioId);
        } catch (error) {
            console.error('Render error:', error);
            Utilities.showNotification('Failed to render content', 'error');
        }
    }

    async refreshCurrentTab() {
        await this.renderCurrentTab();
    }

    async takeSnapshot() {
        try {
            Utilities.showNotification('Taking snapshot...', 'info');
            await api.dashboard.takeSnapshot(this.portfolioId);
            Utilities.showNotification('Snapshot saved!', 'success');
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Snapshot error:', error);
            Utilities.showNotification('Failed to take snapshot: ' + error.message, 'error');
        }
    }

    async handlePriceRefresh(settings) {
        const statusEl = document.getElementById('price-refresh-status');
        const lastSync = settings.last_sync ? new Date(settings.last_sync) : null;
        const now = new Date();
        
        // Check if 24 hours have passed since last refresh
        if (lastSync) {
            const hoursSinceRefresh = (now - lastSync) / (1000 * 60 * 60);
            if (hoursSinceRefresh < 24) {
                const hoursLeft = Math.ceil(24 - hoursSinceRefresh);
                statusEl.textContent = `⏳ Next refresh available in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;
                statusEl.style.color = 'var(--text-muted)';
                Utilities.showNotification('Price refresh limited to once per day', 'warning');
                return;
            }
        }

        // Disable button and show loading state
        const btn = document.getElementById('settings-refresh-prices-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Refreshing...';
        statusEl.textContent = 'Fetching prices from APIs...';
        statusEl.style.color = 'var(--text-muted)';

        try {
            const { results, errors } = await refreshAllPrices(this.portfolioId);
            const updated = results.mutualFunds.length + results.stocks.length + results.crypto.length;
            
            if (errors.length > 0) {
                statusEl.textContent = `⚠️ Refreshed ${updated} holdings with ${errors.length} error${errors.length > 1 ? 's' : ''}`;
                statusEl.style.color = 'var(--danger)';
                console.warn('Price refresh errors:', errors);
            } else {
                statusEl.textContent = `✅ Successfully refreshed ${updated} holdings`;
                statusEl.style.color = '#10b981';
            }

            // Auto-snapshot after price refresh
            try {
                await api.dashboard.takeSnapshot(this.portfolioId);
            } catch (e) {
                console.warn('Auto-snapshot failed:', e);
            }

            await this.refreshCurrentTab();
            Utilities.showNotification(`Prices refreshed for ${updated} holdings`, 'success');
        } catch (error) {
            console.error('Price refresh error:', error);
            statusEl.textContent = '❌ Refresh failed. Please try again later.';
            statusEl.style.color = 'var(--danger)';
            Utilities.showNotification('Failed to refresh prices: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Refresh Prices';
        }
    }

    // ─── CRUD helpers ────────────────────────────────────────

    showAddForm(type) {
        this.isSettingsModal = false;
        this.formHandler.showAddForm(type);
    }

    showAddTransactionForm() {
        this.isSettingsModal = false;
        this.formHandler.showAddForm('transactions');
    }

    async editEntry(type, id) {
        this.isSettingsModal = false;
        await this.formHandler.showEditForm(type, id);
    }

    async editTransaction(id) {
        this.isSettingsModal = false;
        await this.formHandler.showEditForm('transactions', id);
    }

    async deleteEntry(type, id) {
        const holdingTypes = ['mutualFunds', 'stocks', 'crypto'];
        if (holdingTypes.includes(type)) {
            const hasOrders = await this._checkHoldingHasOrders(type, id);
            if (hasOrders) {
                const confirmed = await Utilities.showConfirm(
                    'This holding has order history. Deleting it will permanently remove all associated orders and cannot be undone. Continue?'
                );
                if (!confirmed) return;
            } else {
                const confirmed = await Utilities.showConfirm('Are you sure you want to delete this entry?');
                if (!confirmed) return;
            }
        } else {
            const confirmed = await Utilities.showConfirm('Are you sure you want to delete this entry?');
            if (!confirmed) return;
        }

        try {
            const resourceMap = {
                savings: api.savings,
                fixedDeposits: api.fixedDeposits,
                mutualFunds: api.mutualFunds,
                stocks: api.stocks,
                crypto: api.crypto,
                liabilities: api.liabilities,
                creditCards: api.creditCards,
                transactions: api.transactions,
                budgets: api.budgets,
            };
            const resource = resourceMap[type];
            if (!resource) throw new Error('Unknown type');

            await resource.delete(id);
            Utilities.showNotification('Entry deleted successfully');
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Delete error:', error);
            Utilities.showNotification('Failed to delete entry', 'error');
        }
    }

    async _checkHoldingHasOrders(type, holdingId) {
        try {
            const orderApiMap = {
                mutualFunds: { api: api.mfOrders, holdingIdField: 'mf_id' },
                stocks: { api: api.stockOrders, holdingIdField: 'stock_id' },
                crypto: { api: api.cryptoOrders, holdingIdField: 'crypto_id' },
            };
            const cfg = orderApiMap[type];
            if (!cfg) return false;
            const resp = await cfg.api.listByHolding(holdingId);
            return (resp?.data?.length || 0) > 0;
        } catch {
            return false;
        }
    }

    async deleteTransaction(id) {
        await this.deleteEntry('transactions', id);
    }

    async saveModalData() {
        if (!this.formHandler) return;

        if (this.isSettingsModal) {
            await this.saveSettings();
            return;
        }

        if (this._orderSaveHandler) {
            await this._orderSaveHandler();
            return;
        }

        await this.formHandler.saveCurrentForm();
        await this.refreshCurrentTab();
    }

    closeModal() {
        this._orderSaveHandler = null;
        const modal = document.getElementById('dataModal');
        modal.style.display = 'none';
        this.isSettingsModal = false;
        if (this.formHandler) this.formHandler.closeModal();
    }

    // ─── Settings ────────────────────────────────────────────

    async showSettings() {
        try {
            this.isSettingsModal = true;

            const [resp, user] = await Promise.all([
                api.settings.list(this.portfolioId),
                getCurrentUser().catch(() => null),
            ]);
            const settingsArr = resp?.data || [];
            const settings = settingsArr[0] || { currency: 'INR', goal: 15000000, epf: 0, ppf: 0 };
            const currentUsername = user?.user_metadata?.username || extractUsernameFromEmail(user?.email) || '';

            const formHTML = `
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="profile">👤 Profile</button>
                    <button class="settings-tab" data-tab="financial">💼 Financial</button>
                    <button class="settings-tab" data-tab="goals">🎯 Goals</button>
                    <button class="settings-tab" data-tab="data">💾 Data</button>
                </div>

                <div class="settings-tab-content active" id="tab-profile">
                    <div class="form-group">
                        <label>Username:</label>
                        <input type="text" id="setting-username" value="${settings.username || currentUsername}" class="form-input" placeholder="Your display name" />
                    </div>
                    <div class="form-group">
                        <label>Gender:</label>
                        <select id="setting-gender" class="form-input">
                            <option value="">Select...</option>
                            <option value="male" ${settings.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${settings.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="non-binary" ${settings.gender === 'non-binary' ? 'selected' : ''}>Non-binary</option>
                            <option value="prefer-not-to-say" ${settings.gender === 'prefer-not-to-say' ? 'selected' : ''}>Prefer not to say</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Profession:</label>
                        <input type="text" id="setting-profession" value="${settings.profession || ''}" class="form-input" placeholder="e.g., Software Engineer" />
                    </div>
                    <div class="form-group">
                        <label>Age:</label>
                        <input type="number" id="setting-age" value="${settings.age || ''}" class="form-input" min="0" max="120" placeholder="Your age" />
                    </div>
                    <div class="form-group">
                        <label>Location:</label>
                        <input type="text" id="setting-location" value="${settings.location || ''}" class="form-input" placeholder="City, Country" />
                    </div>
                    <div class="form-group">
                        <label>Marital Status:</label>
                        <select id="setting-marital-status" class="form-input">
                            <option value="">Select...</option>
                            <option value="single" ${settings.marital_status === 'single' ? 'selected' : ''}>Single</option>
                            <option value="married" ${settings.marital_status === 'married' ? 'selected' : ''}>Married</option>
                            <option value="divorced" ${settings.marital_status === 'divorced' ? 'selected' : ''}>Divorced</option>
                            <option value="widowed" ${settings.marital_status === 'widowed' ? 'selected' : ''}>Widowed</option>
                            <option value="prefer-not-to-say" ${settings.marital_status === 'prefer-not-to-say' ? 'selected' : ''}>Prefer not to say</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dependents:</label>
                        <input type="number" id="setting-dependents" value="${settings.dependents ?? 0}" class="form-input" min="0" placeholder="Number of dependents" />
                    </div>
                    <div class="form-group">
                        <label>Risk Tolerance:</label>
                        <select id="setting-risk-tolerance" class="form-input">
                            <option value="">Select...</option>
                            <option value="conservative" ${settings.risk_tolerance === 'conservative' ? 'selected' : ''}>Conservative (Low risk)</option>
                            <option value="moderate" ${settings.risk_tolerance === 'moderate' ? 'selected' : ''}>Moderate (Balanced)</option>
                            <option value="aggressive" ${settings.risk_tolerance === 'aggressive' ? 'selected' : ''}>Aggressive (High risk)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Base Currency (stored amounts):</label>
                        <select id="setting-currency" class="form-input">
                            ${COMMON_CURRENCIES.map(c => `<option value="${c}" ${settings.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Display Currency (visual conversion):</label>
                        <select id="setting-display-currency" class="form-input">
                            ${COMMON_CURRENCIES.map(c => `<option value="${c}" ${(settings.display_currency || settings.currency) === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="settings-tab-content" id="tab-financial">
                    <div class="form-group">
                        <label>Monthly Take-home Salary (₹):</label>
                        <input type="number" id="setting-salary" value="${settings.salary || ''}" class="form-input" min="0" step="1000" placeholder="e.g. 150000" />
                    </div>
                    <div class="form-group">
                        <label>Estimated Monthly Expenses (₹):</label>
                        <input type="number" id="setting-expenses" value="${settings.expenses || ''}" class="form-input" min="0" step="1000" placeholder="e.g. 60000" />
                    </div>
                    <div class="form-group">
                        <label>Tax Regime:</label>
                        <select id="setting-tax-regime" class="form-input">
                            <option value="">Select...</option>
                            <option value="New Regime" ${settings.tax_regime === 'New Regime' ? 'selected' : ''}>New Regime</option>
                            <option value="Old Regime" ${settings.tax_regime === 'Old Regime' ? 'selected' : ''}>Old Regime</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Retirement Horizon (years):</label>
                        <input type="number" id="setting-retirement-years" value="${settings.retirement_years || ''}" class="form-input" min="0" max="50" placeholder="e.g. 15" />
                    </div>
                    <div class="form-group">
                        <label>Emergency Fund Amount (₹):</label>
                        <small class="form-hint">Critical safety net — aim for your target months of expenses. Keep this in a liquid account (savings, liquid funds, or FD).</small>
                        <input type="number" id="setting-emergency-fund" value="${settings.emergency_fund || ''}" class="form-input" min="0" step="10000" placeholder="e.g. 500000" />
                    </div>
                    <div class="form-group">
                        <label>Emergency Fund Target (months of expenses):</label>
                        <select id="setting-emergency-fund-months" class="form-input">
                            <option value="6" ${(settings.emergency_fund_months ?? 6) === 6 ? 'selected' : ''}>6 months</option>
                            <option value="12" ${(settings.emergency_fund_months ?? 6) === 12 ? 'selected' : ''}>12 months</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Insurance Coverage:</label>
                        <small class="form-hint">Protect yourself and your dependents from financial shocks.</small>
                        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="checkbox" id="setting-life-insurance" ${settings.life_insurance ? 'checked' : ''} style="width:16px;height:16px;" />
                                <span>Life Insurance (term plan)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="checkbox" id="setting-health-insurance" ${settings.health_insurance ? 'checked' : ''} style="width:16px;height:16px;" />
                                <span>Health Insurance (self)</span>
                            </label>
                            ${settings.marital_status === 'married' ? `
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="checkbox" id="setting-health-insurance-spouse" ${settings.health_insurance_for_spouse ? 'checked' : ''} style="width:16px;height:16px;" />
                                <span>Health Insurance (spouse)</span>
                            </label>` : ''}
                            ${settings.dependents > 0 ? `
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="checkbox" id="setting-health-insurance-dependents" ${settings.health_insurance_for_dependents ? 'checked' : ''} style="width:16px;height:16px;" />
                                <span>Health Insurance (dependents)</span>
                            </label>` : ''}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Crypto Cap (% of portfolio):</label>
                        <small class="form-hint">Advisor warns if crypto exceeds this threshold</small>
                        <input type="number" id="setting-btc-cap" value="${settings.btc_cap ?? 10}" class="form-input" min="0" max="100" step="1" placeholder="10" />
                    </div>
                    <div class="form-group">
                        <label>Personal Context / Notes:</label>
                        <textarea id="setting-context-note" class="form-input" rows="3" placeholder="Any context about your financial situation...">${settings.context_note || ''}</textarea>
                    </div>
                </div>

                <div class="settings-tab-content" id="tab-goals">
                    <div class="form-group">
                        <label>Financial Goal:</label>
                        <input type="number" id="setting-goal" value="${settings.goal}" class="form-input" step="1000" min="0" placeholder="Your target net worth" />
                    </div>
                    <div class="form-group">
                        <label>EPF Balance:</label>
                        <input type="number" id="setting-epf" value="${settings.epf}" class="form-input" step="0.01" min="0" placeholder="Employee Provident Fund" />
                    </div>
                    <div class="form-group">
                        <label>PPF Balance:</label>
                        <input type="number" id="setting-ppf" value="${settings.ppf}" class="form-input" step="0.01" min="0" placeholder="Public Provident Fund" />
                    </div>
                </div>

                <div class="settings-tab-content" id="tab-data">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
                        <button type="button" class="btn btn-secondary" id="settings-export-btn">💾 Export Data</button>
                        <button type="button" class="btn btn-ghost" id="settings-template-btn" style="font-size: 0.9rem;">📋 Download Template</button>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
                        New user? Download the template to see the Excel structure with sample data.
                    </p>
                    <div style="border-top: 1px solid var(--border); padding-top: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.95rem;">Price Refresh</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                            Refresh prices for all mutual funds, stocks, and crypto. Limited to once per day.
                        </p>
                        <button type="button" class="btn btn-secondary" id="settings-refresh-prices-btn">🔄 Refresh Prices</button>
                        <p id="price-refresh-status" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;"></p>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.95rem;">Import Notes</h4>
                        <ul style="font-size: 0.85rem; color: var(--text-muted); margin: 0; padding-left: 20px;">
                            <li>Importing adds data — it does not delete your existing records</li>
                            <li>Orders with missing holding_id will be skipped</li>
                            <li>Leave Investments id blank for new entries</li>
                        </ul>
                    </div>
                    <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 20px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; color: var(--danger);">Danger Zone</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                            Permanently delete all your data. This action cannot be undone.
                        </p>
                        <button type="button" class="btn" id="settings-delete-all-btn" style="background-color: var(--danger); color: white; border: none;">
                            🗑️ Delete All Data
                        </button>
                    </div>
                </div>

                <style>
                    .settings-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
                    .settings-tab { background: var(--bg-elevated); border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: var(--text-primary); }
                    .settings-tab:hover { background: var(--accent); color: white; }
                    .settings-tab.active { background: var(--accent); color: white; border-color: var(--accent); }
                    .settings-tab-content { display: none; }
                    .settings-tab-content.active { display: block; }
                </style>
            `;

            const modal = document.getElementById('dataModal');
            document.getElementById('modalTitle').textContent = 'Settings';
            document.getElementById('modalBody').innerHTML = formHTML;
            modal.style.display = 'block';

            const tabs = document.querySelectorAll('.settings-tab');
            const contents = document.querySelectorAll('.settings-tab-content');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
                });
            });

            const exportBtn = document.getElementById('settings-export-btn');
            if (exportBtn) exportBtn.addEventListener('click', () => this.exportAllData());
            const importBtn = document.getElementById('settings-import-btn');
            if (importBtn) importBtn.addEventListener('click', () => this.importAllData());
            const templateBtn = document.getElementById('settings-template-btn');
            if (templateBtn) templateBtn.addEventListener('click', () => Utilities.createTemplate());
            const deleteAllBtn = document.getElementById('settings-delete-all-btn');
            if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => this.deleteAllData());
            const refreshPricesBtn = document.getElementById('settings-refresh-prices-btn');
            if (refreshPricesBtn) refreshPricesBtn.addEventListener('click', () => this.handlePriceRefresh(settings));
        } catch {
            Utilities.showNotification('Failed to load settings', 'error');
        }
    }

    async saveSettings() {
        try {
            const resp = await api.settings.list(this.portfolioId);
            const settingsArr = resp?.data || [];
            const existing = settingsArr[0];

            const goal = parseFloat(document.getElementById('setting-goal').value) || 0;
            const epf = parseFloat(document.getElementById('setting-epf').value) || 0;
            const ppf = parseFloat(document.getElementById('setting-ppf').value) || 0;
            const username = document.getElementById('setting-username')?.value?.trim() || '';
            const gender = document.getElementById('setting-gender')?.value || null;
            const profession = document.getElementById('setting-profession')?.value?.trim() || null;
            const age = parseInt(document.getElementById('setting-age')?.value) || null;
            const location = document.getElementById('setting-location')?.value?.trim() || null;
            const maritalStatus = document.getElementById('setting-marital-status')?.value || null;
            const dependents = parseInt(document.getElementById('setting-dependents')?.value) || 0;
            const riskTolerance = document.getElementById('setting-risk-tolerance')?.value || null;
            const salary = parseFloat(document.getElementById('setting-salary')?.value) || null;
            const expenses = parseFloat(document.getElementById('setting-expenses')?.value) || null;
            const taxRegime = document.getElementById('setting-tax-regime')?.value || null;
            const retirementYears = parseInt(document.getElementById('setting-retirement-years')?.value) || null;
            const emergencyFund = parseFloat(document.getElementById('setting-emergency-fund')?.value) || null;
            const emergencyFundMonths = parseInt(document.getElementById('setting-emergency-fund-months')?.value) || 6;
            const lifeInsurance = document.getElementById('setting-life-insurance')?.checked || false;
            const healthInsurance = document.getElementById('setting-health-insurance')?.checked || false;
            const healthInsuranceSpouse = document.getElementById('setting-health-insurance-spouse')?.checked || false;
            const healthInsuranceDependents = document.getElementById('setting-health-insurance-dependents')?.checked || false;
            const btcCap = parseFloat(document.getElementById('setting-btc-cap')?.value) ?? 10;
            const contextNote = document.getElementById('setting-context-note')?.value?.trim() || null;

            if (goal < 0 || epf < 0 || ppf < 0) {
                Utilities.showNotification('Values cannot be negative', 'error');
                return;
            }

            const displayCurrency = document.getElementById('setting-display-currency')?.value || document.getElementById('setting-currency').value;
            const data = {
                currency: document.getElementById('setting-currency').value,
                display_currency: displayCurrency,
                goal,
                epf,
                ppf,
                username,
                gender,
                profession,
                age,
                location,
                marital_status: maritalStatus,
                dependents,
                risk_tolerance: riskTolerance,
                salary,
                expenses,
                tax_regime: taxRegime,
                retirement_years: retirementYears,
                emergency_fund: emergencyFund,
                emergency_fund_months: emergencyFundMonths,
                life_insurance: lifeInsurance,
                health_insurance: healthInsurance,
                health_insurance_for_spouse: healthInsuranceSpouse,
                health_insurance_for_dependents: healthInsuranceDependents,
                btc_cap: btcCap,
                context_note: contextNote,
            };

            const saves = [existing?.id
                ? api.settings.update(existing.id, data)
                : api.settings.create({ ...data, portfolio_id: this.portfolioId }),
            ];
            if (username) saves.push(updateUser({ username }));
            await Promise.all(saves);

            Utilities.showNotification('Settings saved successfully');
            this.closeModal();
            await this.initFXRates();
        } catch (error) {
            console.error('Save settings error:', error);
            Utilities.showNotification('Failed to save settings', 'error');
        }
    }

    // ─── Import / Export ─────────────────────────────────────

    async exportAllData() {
        try {
            const [
                savingsR, fdsR, mfsR, stocksR, cryptoR,
                liabR, ccR, txR, budgR, settR,
                mfOrdersR, stockOrdersR, cryptoOrdersR,
            ] = await Promise.all([
                api.savings.list(this.portfolioId),
                api.fixedDeposits.list(this.portfolioId),
                api.mutualFunds.list(this.portfolioId),
                api.stocks.list(this.portfolioId),
                api.crypto.list(this.portfolioId),
                api.liabilities.list(this.portfolioId),
                api.creditCards.list(this.portfolioId),
                api.transactions.list(this.portfolioId),
                api.budgets.list(this.portfolioId),
                api.settings.list(this.portfolioId),
                api.mfOrders.list(this.portfolioId),
                api.stockOrders.list(this.portfolioId),
                api.cryptoOrders.list(this.portfolioId),
            ]);

            const data = {
                savings: savingsR?.data || [],
                fixedDeposits: fdsR?.data || [],
                mutualFunds: mfsR?.data || [],
                stocks: stocksR?.data || [],
                crypto: cryptoR?.data || [],
                liabilities: liabR?.data || [],
                creditCards: ccR?.data || [],
                transactions: txR?.data || [],
                budgets: budgR?.data || [],
                settings: settR?.data || [],
                mfOrders: mfOrdersR?.data || [],
                stockOrders: stockOrdersR?.data || [],
                cryptoOrders: cryptoOrdersR?.data || [],
            };

            Utilities.exportToExcel(data, 'finance-backup.xlsx');
            Utilities.showNotification('Data exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            Utilities.showNotification('Failed to export data', 'error');
        }
    }

    _sortStates = {};

    setSortState(module, col) {
        if (!this._sortStates[module]) this._sortStates[module] = { col: null, dir: 'asc' };
        const s = this._sortStates[module];
        if (s.col === col) {
            s.dir = s.dir === 'asc' ? 'desc' : 'asc';
        } else {
            s.col = col;
            s.dir = 'asc';
        }
        this.renderCurrentTab();
    }

    getSortState(module) {
        return this._sortStates[module] || { col: null, dir: 'asc' };
    }

    _dashCCIndex = 0;

    _cycleDashCC(targetIdx) {
        const stack = document.getElementById('cc-dash-stack');
        if (!stack) return;
        const cards = stack.querySelectorAll('.cc-dash-card');
        if (cards.length <= 1) return;
        cards.forEach(c => c.classList.remove('cc-dash-active'));
        this._dashCCIndex = targetIdx !== undefined ? targetIdx : (this._dashCCIndex + 1) % cards.length;
        cards[this._dashCCIndex].classList.add('cc-dash-active');
        document.querySelectorAll('.cc-dash-dot').forEach((d, i) => d.classList.toggle('active', i === this._dashCCIndex));
    }

    navToCreditCard(id) {
        window._ccExpanded = window._ccExpanded || {};
        window._ccExpanded[id] = true;
        this.switchTab('creditCards');
    }

    showDrillDown(assetName) {
        const data = window._dashAllocationData;
        if (!data) return;

        const assetApiMap = {
            'Savings': { api: api.savings, labelField: 'bank_name', valueField: 'balance' },
            'Fixed Deposits': { api: api.fixedDeposits, labelField: 'bank_name', valueField: 'maturity' },
            'Mutual Funds': { api: api.mutualFunds, labelField: 'fund_name', valueField: 'current', investedField: 'invested' },
            'Stocks': { api: api.stocks, labelField: 'stock_name', valueField: 'current', investedField: 'invested' },
            'Crypto': { api: api.crypto, labelField: 'coin_name', valueField: 'current', investedField: 'invested' },
        };

        const config = assetApiMap[assetName];
        if (!config) return;

        const modal = document.getElementById('drillModal');
        const title = document.getElementById('drillModalTitle');
        const body = document.getElementById('drillModalBody');
        if (!modal) return;

        title.textContent = `${assetName} — Holdings`;
        body.innerHTML = '<div class="skeleton-card" style="height:80px;"></div>';
        modal.style.display = 'block';

        config.api.list(this.portfolioId).then(resp => {
            let items = resp?.data || [];
            if (items.length === 0) {
                body.innerHTML = '<p class="empty-state">No holdings found.</p>';
                return;
            }

            if (assetName === 'Crypto') {
                const coinMap = new Map();
                items.forEach(item => {
                    const key = (item[config.labelField] || '—').trim();
                    const prev = coinMap.get(key) || { current: 0, invested: 0 };
                    prev.current += parseFloat(item[config.valueField]) || 0;
                    prev.invested += parseFloat(item[config.investedField]) || 0;
                    coinMap.set(key, prev);
                });
                items = [...coinMap.entries()].map(([coin_name, v]) => ({ coin_name, current: v.current, invested: v.invested }));
            }

            items = [...items].sort((a, b) =>
                (parseFloat(b[config.valueField]) || 0) - (parseFloat(a[config.valueField]) || 0)
            );

            const total = items.reduce((s, i) => s + (parseFloat(i[config.valueField]) || 0), 0);
            body.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${items.map(item => {
                const val = parseFloat(item[config.valueField]) || 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                return `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-elevated);border-radius:8px;gap:10px;">
                                <span style="font-size:14px;flex:1;">${item[config.labelField] || '—'}</span>
                                <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;">${Utilities.formatCurrency(val)}</span>
                                <span style="font-size:12px;color:var(--text-muted);min-width:40px;text-align:right;">${pct}%</span>
                                <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
                                    <div style="height:100%;background:var(--accent);width:${pct}%;"></div>
                                </div>
                            </div>`;
            }).join('')}
                    <div style="display:flex;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--border);margin-top:4px;font-weight:700;">
                        <span>Total</span>
                        <span style="font-family:var(--font-mono);">${Utilities.formatCurrency(total)}</span>
                    </div>
                </div>`;
        }).catch(() => {
            body.innerHTML = '<p class="empty-state">Failed to load holdings.</p>';
        });
    }

    showHealthBreakdown() {
        const health = window._dashHealthData;
        if (!health) return;

        const modal = document.getElementById('drillModal');
        const title = document.getElementById('drillModalTitle');
        const body = document.getElementById('drillModalBody');
        if (!modal) return;

        const items = [
            { label: 'Diversification', score: health.breakdown.diversification, max: 25, hint: 'Asset classes with >5% allocation' },
            { label: 'Credit Utilization', score: health.breakdown.creditUtil, max: 20, hint: `${health.utilPct?.toFixed(1) || 0}% overall utilization` },
            { label: 'Emergency Fund', score: health.breakdown.emergencyFund, max: 20, hint: `${health.emergencyMonths?.toFixed(1) || 0} months of expenses covered` },
            { label: 'Liability Ratio', score: health.breakdown.liabilityRatio, max: 20, hint: `${health.liabRatio?.toFixed(1) || 0}% of gross assets` },
            { label: 'Goal Progress', score: health.breakdown.goalProgress, max: 15, hint: 'Progress toward financial goal' },
        ];

        const gradeColor = health.score >= 85 ? 'var(--green)' : health.score >= 70 ? 'var(--accent)' : health.score >= 50 ? 'var(--yellow)' : 'var(--red)';

        title.textContent = `Portfolio Health — ${health.grade}`;
        body.innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:2.5rem;font-weight:700;color:${gradeColor};">${health.score}<span style="font-size:1rem;color:var(--text-muted);"> / 100</span></div>
                <div style="font-size:13px;color:var(--text-muted);">Higher is better · Max score per category shown in brackets</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                ${items.map(item => {
            const pct = (item.score / item.max) * 100;
            const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
            return `
                        <div style="padding:12px 14px;background:var(--bg-elevated);border-radius:10px;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                                <span style="font-size:13px;font-weight:600;">${item.label}</span>
                                <span style="font-size:13px;font-weight:700;color:${color};">${item.score} / ${item.max}</span>
                            </div>
                            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:4px;">
                                <div style="height:100%;background:${color};width:${pct}%;transition:width .4s ease;"></div>
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);">${item.hint}</div>
                        </div>`;
        }).join('')}
            </div>`;
        modal.style.display = 'block';
    }

    closeDrillModal() {
        const modal = document.getElementById('drillModal');
        if (modal) modal.style.display = 'none';
    }

    async signOut() {
        try {
            await authSignOut();
        } catch {
            Utilities.showNotification('Sign out failed', 'error');
        }
    }

    _sanitizeOrderData(orderData, _cfg) {
        const sanitized = { ...orderData };
        // Ensure charges is non-negative (database constraint)
        if (sanitized.charges !== undefined) {
            sanitized.charges = Math.max(0, parseFloat(sanitized.charges) || 0);
        }
        // Ensure amount is positive
        if (sanitized.amount !== undefined) {
            sanitized.amount = Math.max(0.01, parseFloat(sanitized.amount) || 0.01);
        }
        // Ensure units/quantity is positive
        if (sanitized.units !== undefined) {
            sanitized.units = Math.max(0.00000001, parseFloat(sanitized.units) || 0.00000001);
        }
        if (sanitized.quantity !== undefined) {
            sanitized.quantity = Math.max(0.00000001, parseFloat(sanitized.quantity) || 0.00000001);
        }
        // Ensure price/nav is positive
        if (sanitized.nav !== undefined) {
            sanitized.nav = Math.max(0.0001, parseFloat(sanitized.nav) || 0.0001);
        }
        if (sanitized.price !== undefined) {
            sanitized.price = Math.max(0.0001, parseFloat(sanitized.price) || 0.0001);
        }
        return sanitized;
    }

    async importAllData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx';

        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                const data = await Utilities.importFromExcel(file);

                const overwrite = await Utilities.showConfirm('Importing will add data to your portfolio. Continue?');
                if (!overwrite) return;

                const importMap = {
                    savings: api.savings,
                    fixedDeposits: api.fixedDeposits,
                    mutualFunds: api.mutualFunds,
                    stocks: api.stocks,
                    crypto: api.crypto,
                    liabilities: api.liabilities,
                    creditCards: api.creditCards,
                    transactions: api.transactions,
                    budgets: api.budgets,
                    settings: api.settings,
                };

                const idMaps = { mutualFunds: {}, stocks: {}, crypto: {} };

                for (const [key, resource] of Object.entries(importMap)) {
                    if (data[key] && Array.isArray(data[key])) {
                        for (const item of data[key]) {
                            const { id: oldId, created_at: _ca, updated_at: _ua, ...rest } = item;
                            const resp = await resource.create({ ...rest, portfolio_id: this.portfolioId });
                            if (idMaps[key] && oldId && resp?.data?.id) {
                                idMaps[key][oldId] = resp.data.id;
                            }
                        }
                    }
                }

                const orderImports = [
                    { key: 'mfOrders', api: api.mfOrders, holdingKey: 'mutualFunds', holdingIdField: 'mf_id' },
                    { key: 'stockOrders', api: api.stockOrders, holdingKey: 'stocks', holdingIdField: 'stock_id' },
                    { key: 'cryptoOrders', api: api.cryptoOrders, holdingKey: 'crypto', holdingIdField: 'crypto_id' },
                ];

                let skippedOrders = 0;
                let importedOrders = 0;
                for (const cfg of orderImports) {
                    if (data[cfg.key] && Array.isArray(data[cfg.key])) {
                        console.log(`Processing ${cfg.key}: ${data[cfg.key].length} orders`);
                        for (const order of data[cfg.key]) {
                            const { id: _oid, created_at: _ca, updated_at: _ua, ...rest } = order;
                            const existingHoldingId = rest[cfg.holdingIdField];
                            const newHoldingId = idMaps[cfg.holdingKey][existingHoldingId];

                            // If order has a holding_id that was remapped from Excel, use the new ID
                            if (newHoldingId) {
                                try {
                                    const orderData = this._sanitizeOrderData(rest, cfg);
                                    await cfg.api.create({ ...orderData, [cfg.holdingIdField]: newHoldingId, portfolio_id: this.portfolioId });
                                    importedOrders++;
                                } catch (e) {
                                    console.error(`Failed to create order:`, e, rest);
                                    skippedOrders++;
                                }
                            } else if (existingHoldingId) {
                                // Order has a holding_id but it wasn't remapped
                                // Try to match by name first, then by ID lookup
                                const holdingName = rest.name;
                                let matchedHolding = null;

                                if (holdingName) {
                                    const holdings = await api[cfg.holdingKey].list(this.portfolioId);
                                    const nameField = cfg.holdingKey === 'mutualFunds' ? 'fund_name' :
                                        cfg.holdingKey === 'stocks' ? 'stock_name' : 'coin_name';
                                    matchedHolding = holdings.data?.find(h => h[nameField]?.toLowerCase() === holdingName.toLowerCase());
                                }

                                if (matchedHolding) {
                                    try {
                                        const orderData = this._sanitizeOrderData(rest, cfg);
                                        await cfg.api.create({ ...orderData, [cfg.holdingIdField]: matchedHolding.id, portfolio_id: this.portfolioId });
                                        importedOrders++;
                                    } catch (e) {
                                        console.error(`Failed to create order:`, e, rest);
                                        skippedOrders++;
                                    }
                                } else {
                                    // Try to look up the holding by ID directly in the database
                                    try {
                                        const holding = await api[cfg.holdingKey].get(existingHoldingId);
                                        if (holding?.data && holding.data.portfolio_id === this.portfolioId) {
                                            // Transform field names for MF orders: units/nav instead of quantity/price
                                            const orderData = this._sanitizeOrderData(rest, cfg);
                                            if (cfg.holdingKey === 'mutualFunds') {
                                                orderData.units = orderData.units || orderData.quantity;
                                                orderData.nav = orderData.nav || orderData.price;
                                                delete orderData.quantity;
                                                delete orderData.price;
                                            }
                                            await cfg.api.create({ ...orderData, [cfg.holdingIdField]: existingHoldingId, portfolio_id: this.portfolioId });
                                            importedOrders++;
                                        } else {
                                            console.log(`Skipped order with holding_id ${existingHoldingId} - not found in current portfolio`);
                                            skippedOrders++;
                                        }
                                    } catch (e) {
                                        console.error(`Failed to create order:`, e, rest);
                                        console.log(`Skipped order with holding_id ${existingHoldingId} - lookup failed`);
                                        skippedOrders++;
                                    }
                                }
                            } else {
                                // Order has no holding_id at all - skip it
                                console.log(`Skipped order with no holding_id`);
                                skippedOrders++;
                            }
                        }
                    }
                }

                if (skippedOrders > 0) {
                    Utilities.showNotification(`Import complete. ${importedOrders} order(s) imported. ${skippedOrders} order(s) skipped (no matching holding).`, 'warning');
                } else if (importedOrders > 0) {
                    Utilities.showNotification(`Import complete. ${importedOrders} order(s) imported.`, 'success');
                }

                Utilities.showNotification('Data imported successfully');
                await this.refreshCurrentTab();
            } catch (error) {
                console.error('Import error:', error);
                Utilities.showNotification('Failed to import Excel file: ' + error.message, 'error');
            }
        };

        input.click();
    }

    async deleteAllData() {
        const firstConfirm = await Utilities.showConfirm(
            '⚠️ WARNING: This will permanently delete ALL your data including:\n\n' +
            '• Savings & Fixed Deposits\n' +
            '• Mutual Funds, Stocks, Crypto\n' +
            '• Liabilities & Credit Cards\n' +
            '• Transactions & Budgets\n' +
            '• Order History\n' +
            '• Settings & Snapshots\n\n' +
            'This action CANNOT be undone.\n\n' +
            'Are you sure you want to continue?'
        );
        if (!firstConfirm) return;

        const secondConfirm = await Utilities.showConfirm(
            '🚨 FINAL WARNING: You are about to delete all your data permanently.\n\n' +
            'Type confirmation will be required next.\n\n' +
            'Continue?'
        );
        if (!secondConfirm) return;

        const typedConfirm = prompt(
            'To confirm deletion, type "DELETE" (all caps):\n\n' +
            'This is your last chance to cancel.'
        );

        if (typedConfirm !== 'DELETE') {
            Utilities.showNotification('Deletion cancelled. Confirmation did not match.', 'info');
            return;
        }

        try {
            Utilities.showNotification('Deleting all data...', 'info');
            await api.deleteAllData(this.portfolioId);
            Utilities.showNotification('All data deleted successfully', 'success');
            this.closeModal();

            // Reinitialize portfolio with default settings
            await this.ensurePortfolio();
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Delete all data error:', error);
            Utilities.showNotification('Failed to delete data: ' + error.message, 'error');
        }
    }
}

export default PersonalFinanceApp;
