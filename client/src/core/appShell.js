import Utilities from '../utils/utils.js';
import { FormHandler } from '../ui/forms/formHandler.js';
import { renderDashboard } from '../ui/features/dashboard.js';
import { renderExpenses } from '../ui/features/expenses.js';
import { renderSavings } from '../ui/features/savings.js';
import { renderFixedDeposits } from '../ui/features/fixedDeposits.js';
import { renderMutualFunds } from '../ui/features/mutualFunds.js';
import { renderStocks } from '../ui/features/stocks.js';
import { renderCrypto } from '../ui/features/crypto.js';
import { renderLiabilities } from '../ui/features/liabilities.js';
import { renderBudgets } from '../ui/features/budgets.js';
import api from '../services/api.js';
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
            budgets: renderBudgets,
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
            await this.switchTab('dashboard');
        } catch (error) {
            console.error('App initialization error:', error);
            Utilities.showNotification('Failed to initialize app. Is the server running?', 'error');
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
            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) {
                themeBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
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
        this.setSidebarCollapsed(!this.sidebarCollapsed, true);
    }

    setSidebarCollapsed(collapsed, persist = false) {
        this.sidebarCollapsed = collapsed;

        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
        if (mainContent) mainContent.classList.toggle('expanded', collapsed);
        if (toggleBtn) {
            toggleBtn.textContent = collapsed ? '☰' : '✕';
            toggleBtn.setAttribute('aria-expanded', (!collapsed).toString());
        }

        if (persist) {
            this.userSidebarPref = collapsed;
            localStorage.setItem('sidebarCollapsed', collapsed);
        }
    }

    updateResponsiveLayout() {
        const isMobile = window.innerWidth <= 900;
        const appContainer = document.querySelector('.app-container');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (appContainer) appContainer.classList.toggle('mobile', isMobile);
        if (sidebar) sidebar.classList.toggle('mobile', isMobile);
        if (mainContent) mainContent.classList.toggle('mobile', isMobile);
        if (toggleBtn) toggleBtn.classList.toggle('mobile', isMobile);

        const shouldCollapse = isMobile ? true : (this.userSidebarPref ?? false);
        this.setSidebarCollapsed(shouldCollapse, false);
    }

    setupEventListeners() {
        const closeBtn = document.querySelector('.close');
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

    // ─── Live Price Refresh ──────────────────────────────────

    async refreshStocksLive() {
        await this.refreshAllLive();
    }

    async refreshMutualFundsLive() {
        await this.refreshAllLive();
    }

    async refreshCryptoLive() {
        await this.refreshAllLive();
    }

    async refreshAllLive() {
        try {
            Utilities.showNotification('Refreshing live prices...', 'info');
            const { results, errors, refreshedAt } = await refreshAllPrices(this.portfolioId);

            const updated = results.mutualFunds.length + results.stocks.length + results.crypto.length;
            if (errors.length > 0) {
                console.warn('Price refresh errors:', errors);
                Utilities.showNotification(`Updated ${updated} holdings. ${errors.length} error(s).`, 'warning');
            } else {
                Utilities.showNotification(`All ${updated} holdings updated!`, 'success');
            }

            // Auto-snapshot after price refresh
            try {
                await api.dashboard.takeSnapshot(this.portfolioId);
            } catch (e) {
                console.warn('Auto-snapshot failed:', e);
            }

            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Live refresh error:', error);
            Utilities.showNotification('Failed to refresh prices: ' + error.message, 'error');
        }
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
        const confirmed = await Utilities.showConfirm('Are you sure you want to delete this entry?');
        if (!confirmed) return;

        try {
            const resourceMap = {
                savings: api.savings,
                fixedDeposits: api.fixedDeposits,
                mutualFunds: api.mutualFunds,
                stocks: api.stocks,
                crypto: api.crypto,
                liabilities: api.liabilities,
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

    async deleteTransaction(id) {
        await this.deleteEntry('transactions', id);
    }

    async saveModalData() {
        if (!this.formHandler) return;

        if (this.isSettingsModal) {
            await this.saveSettings();
            return;
        }

        await this.formHandler.saveCurrentForm();
        await this.refreshCurrentTab();
    }

    closeModal() {
        const modal = document.getElementById('dataModal');
        modal.style.display = 'none';
        this.isSettingsModal = false;
        if (this.formHandler) this.formHandler.closeModal();
    }

    // ─── Settings ────────────────────────────────────────────

    async showSettings() {
        try {
            this.isSettingsModal = true;

            const resp = await api.settings.list(this.portfolioId);
            const settingsArr = resp?.data || [];
            const settings = settingsArr[0] || { currency: 'INR', goal: 15000000, epf: 0, ppf: 0 };

            const formHTML = `
                <div class="form-group">
                    <label>Currency:</label>
                    <input type="text" id="setting-currency" value="${settings.currency}" class="form-input" />
                </div>
                <div class="form-group">
                    <label>Financial Goal:</label>
                    <input type="number" id="setting-goal" value="${settings.goal}" class="form-input" step="1000" min="0" />
                </div>
                <div class="form-group">
                    <label>EPF Balance:</label>
                    <input type="number" id="setting-epf" value="${settings.epf}" class="form-input" step="0.01" min="0" />
                </div>
                <div class="form-group">
                    <label>PPF Balance:</label>
                    <input type="number" id="setting-ppf" value="${settings.ppf}" class="form-input" step="0.01" min="0" />
                </div>
            `;

            const modal = document.getElementById('dataModal');
            document.getElementById('modalTitle').textContent = 'Settings';
            document.getElementById('modalBody').innerHTML = formHTML;
            modal.style.display = 'block';
        } catch (error) {
            console.error('Show settings error:', error);
            Utilities.showNotification('Failed to load settings', 'error');
        }
    }

    async saveSettings() {
        try {
            const resp = await api.settings.list(this.portfolioId);
            const settingsArr = resp?.data || [];
            const existing = settingsArr[0];

            const goal = parseFloat(document.getElementById('setting-goal').value);
            const epf = parseFloat(document.getElementById('setting-epf').value);
            const ppf = parseFloat(document.getElementById('setting-ppf').value);

            if (goal < 0 || epf < 0 || ppf < 0) {
                Utilities.showNotification('Values cannot be negative', 'error');
                return;
            }

            const data = {
                currency: document.getElementById('setting-currency').value,
                goal,
                epf,
                ppf,
            };

            if (existing?.id) {
                await api.settings.update(existing.id, data);
            } else {
                await api.settings.create({ ...data, portfolio_id: this.portfolioId });
            }

            Utilities.showNotification('Settings saved successfully');
            this.closeModal();
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Save settings error:', error);
            Utilities.showNotification('Failed to save settings', 'error');
        }
    }

    // ─── Import / Export ─────────────────────────────────────

    async exportAllData() {
        try {
            const [savingsR, fdsR, mfsR, stocksR, cryptoR, liabR, txR, budgR, settR] = await Promise.all([
                api.savings.list(this.portfolioId),
                api.fixedDeposits.list(this.portfolioId),
                api.mutualFunds.list(this.portfolioId),
                api.stocks.list(this.portfolioId),
                api.crypto.list(this.portfolioId),
                api.liabilities.list(this.portfolioId),
                api.transactions.list(this.portfolioId),
                api.budgets.list(this.portfolioId),
                api.settings.list(this.portfolioId),
            ]);

            const data = {
                savings: savingsR?.data || [],
                fixedDeposits: fdsR?.data || [],
                mutualFunds: mfsR?.data || [],
                stocks: stocksR?.data || [],
                crypto: cryptoR?.data || [],
                liabilities: liabR?.data || [],
                transactions: txR?.data || [],
                budgets: budgR?.data || [],
                settings: settR?.data || [],
            };

            Utilities.exportData(data);
            Utilities.showNotification('Data exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            Utilities.showNotification('Failed to export data', 'error');
        }
    }

    async importAllData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                const data = await Utilities.importData(file);

                const overwrite = await Utilities.showConfirm('Importing will add data to your portfolio. Continue?');
                if (!overwrite) return;

                const importMap = {
                    savings: api.savings,
                    fixedDeposits: api.fixedDeposits,
                    mutualFunds: api.mutualFunds,
                    stocks: api.stocks,
                    crypto: api.crypto,
                    liabilities: api.liabilities,
                    transactions: api.transactions,
                    budgets: api.budgets,
                };

                for (const [key, resource] of Object.entries(importMap)) {
                    if (data[key] && Array.isArray(data[key])) {
                        for (const item of data[key]) {
                            const { id, created_at, updated_at, ...rest } = item;
                            await resource.create({ ...rest, portfolio_id: this.portfolioId });
                        }
                    }
                }

                Utilities.showNotification('Data imported successfully');
                await this.refreshCurrentTab();
            } catch (error) {
                console.error('Import error:', error);
                Utilities.showNotification('Failed to import data: ' + error.message, 'error');
            }
        };

        input.click();
    }
}

export default PersonalFinanceApp;
