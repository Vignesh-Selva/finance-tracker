import Utilities from '../utils/utils.js';
import { DatabaseManager } from '../data/dbManager.js';
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
import { INITIAL_DATA } from '../utils/initialData.js';

class PersonalFinanceApp {
    constructor() {
        this.dbManager = new DatabaseManager();
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
            await this.dbManager.init();

            this.formHandler = new FormHandler(this.dbManager);

            this.formHandler.app = this;

            this.loadTheme();
            this.loadSidebarState();
            await this.initializeDefaultData();
            this.setupEventListeners();
            await this.switchTab('dashboard');

        } catch (error) {
            console.error('App initialization error:', error);
            Utilities.showNotification('Failed to initialize app. Please refresh the page.', 'error');
        }
    }

    async refreshStocksLive() {
        try {
            const holdings = await this.dbManager.getAll('stocks');
            const goldHoldings = holdings.filter(h => {
                const ticker = (h.ticker || '').toString().trim().toUpperCase();
                const name = (h.stockName || '').toString().trim().toUpperCase();
                return ticker === 'GOLDBEES' || name === 'GOLDBEES';
            });

            if (goldHoldings.length === 0) {
                Utilities.showNotification('No GOLDBEES holdings to refresh', 'error');
                return;
            }

            // NSE GOLDBEES price via Yahoo Finance public quote (proxied to avoid CORS)
            const yahooUrl = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=GOLDBEES.NS';
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`);
            if (!response.ok) {
                throw new Error('Price fetch failed');
            }
            const data = await response.json();
            const price = data?.quoteResponse?.result?.[0]?.regularMarketPrice;

            if (!price || isNaN(price)) {
                throw new Error('Invalid price data');
            }

            for (const holding of goldHoldings) {
                const qty = parseFloat(holding.quantity) || 0;
                const current = qty * price;
                await this.dbManager.save('stocks', { ...holding, current });
            }

            Utilities.showNotification('GOLDBEES price refreshed');
            await this.renderCurrentTab();
        } catch (error) {
            console.error('Stocks refresh error:', error);
            Utilities.showNotification('Failed to refresh GOLDBEES price', 'error');
        }
    }

    async refreshMutualFundsLive() {
        try {
            const funds = await this.dbManager.getAll('mutualFunds');
            if (!funds.length) {
                Utilities.showNotification('No mutual funds to refresh', 'error');
                return;
            }

            const updated = [];
            let missingCodes = 0;

            for (const fund of funds) {
                const schemeCode = (fund.schemeCode || '').toString().trim();
                if (!schemeCode) {
                    missingCodes += 1;
                    continue;
                }

                const navUrl = `https://api.mfapi.in/mf/${schemeCode}/latest`;
                const navResp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(navUrl)}`);
                if (!navResp.ok) continue;
                const navData = await navResp.json();
                const latestNav = navData?.data?.[0]?.nav;
                const navValue = parseFloat(latestNav);
                if (!navValue || isNaN(navValue)) continue;

                const units = parseFloat(fund.units) || 0;
                const current = units * navValue;
                updated.push({ ...fund, current });
            }

            for (const record of updated) {
                await this.dbManager.save('mutualFunds', record);
            }

            if (updated.length === 0) {
                Utilities.showNotification('No mutual fund prices updated', 'error');
            } else {
                Utilities.showNotification('Mutual fund prices refreshed');
            }

            if (missingCodes > 0) {
                Utilities.showNotification(`${missingCodes} fund(s) missing scheme code; please edit to refresh`, 'error');
            }

            await this.renderCurrentTab();
        } catch (error) {
            console.error('Mutual fund refresh error:', error);
            Utilities.showNotification('Failed to refresh mutual fund prices', 'error');
        }
    }

    async initializeDefaultData() {
        try {
            const settings = await this.dbManager.getAll('settings');
            if (settings.length === 0) {
                await this.dbManager.save('settings', {
                    id: 1,
                    currency: 'INR',
                    goal: 15000000,
                    epf: 0,
                    ppf: 0,
                    theme: 'light',
                    lastSync: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Default data initialization error:', error);
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
        try {
            this.setSidebarCollapsed(!this.sidebarCollapsed, true);
        } catch (error) {
            console.error('Sidebar toggle error:', error);
        }
    }

    setSidebarCollapsed(collapsed, persist = false) {
        this.sidebarCollapsed = collapsed;

        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (sidebar) {
            if (collapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }

        if (mainContent) {
            if (collapsed) {
                mainContent.classList.add('expanded');
            } else {
                mainContent.classList.remove('expanded');
            }
        }

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

        const shouldCollapse = isMobile
            ? true
            : (this.userSidebarPref ?? false);

        this.setSidebarCollapsed(shouldCollapse, false);
    }

    setupEventListeners() {
        try {
            const closeBtn = document.querySelector('.close');
            if (closeBtn) {
                closeBtn.onclick = () => this.closeModal();
            }

            window.onclick = (event) => {
                const modal = document.getElementById('dataModal');
                if (event.target === modal) {
                    this.closeModal();
                }
            };

            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) {
                themeBtn.onclick = () => {
                    Utilities.toggleTheme();
                    this.loadTheme();
                };
            }

            const sidebarToggle = document.getElementById('sidebarToggle');
            if (sidebarToggle) {
                sidebarToggle.onclick = () => this.toggleSidebar();
            }

            window.addEventListener('resize', () => {
                this.updateResponsiveLayout();
            });

            const sidebarItems = document.querySelectorAll('.sidebar-item');
            sidebarItems.forEach(item => {
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                const tabName = item.getAttribute('data-tab');
                const handler = () => {
                    if (tabName) {
                        this.switchTab(tabName);
                        if (window.innerWidth <= 900) {
                            this.setSidebarCollapsed(true, false);
                        }
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
        } catch (error) {
            console.error('Event listeners setup error:', error);
        }
    }

    async switchTab(tabName) {
        try {
            this.currentTab = tabName;

            document.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.classList.remove('active');
            });

            const contentDiv = document.getElementById(`content-${tabName}`);
            if (contentDiv) contentDiv.classList.add('active');

            document.querySelectorAll('.sidebar-item').forEach(item => {
                const itemTab = item.getAttribute('data-tab');
                if (itemTab === tabName) {
                    item.classList.add('active');
                }
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
            if (renderFn) {
                await renderFn(this.dbManager);
            }
        } catch (error) {
            console.error('Render error:', error);
            Utilities.showNotification('Failed to render content', 'error');
        }
    }

    async refreshCurrentTab() {
        await this.renderCurrentTab();
    }

    async refreshCryptoLive() {
        try {
            const holdings = await this.dbManager.getAll('crypto');
            const idMap = {
                BTC: 'bitcoin',
                BITCOIN: 'bitcoin',
                ETH: 'ethereum',
                ETHEREUM: 'ethereum',
                SOL: 'solana',
                SOLANA: 'solana',
                ADA: 'cardano',
                CARDANO: 'cardano',
                MATIC: 'matic-network',
                POLYGON: 'matic-network',
                DOGE: 'dogecoin',
                DOGECOIN: 'dogecoin',
                XRP: 'ripple',
                RIPPLE: 'ripple'
            };

            const coinIds = new Set();
            const holdingsWithId = holdings.map(h => {
                const name = (h.coinName || '').toString().trim();
                const upper = name.toUpperCase();
                const mapped = idMap[upper] || name.toLowerCase().replace(/\s+/g, '-');
                if (mapped) {
                    coinIds.add(mapped);
                }
                return { holding: h, id: mapped };
            }).filter(item => item.id);

            if (coinIds.size === 0) {
                Utilities.showNotification('No recognizable coins to refresh', 'error');
                return;
            }

            const idsParam = Array.from(coinIds).join(',');
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=inr`);
            if (!response.ok) {
                throw new Error('Price fetch failed');
            }

            const prices = await response.json();
            const updated = [];

            for (const { holding, id } of holdingsWithId) {
                const price = prices?.[id]?.inr;
                if (!price || isNaN(price)) continue;
                const qty = parseFloat(holding.quantity) || 0;
                const current = qty * price;
                updated.push({ ...holding, current });
            }

            for (const record of updated) {
                await this.dbManager.save('crypto', record);
            }

            if (updated.length === 0) {
                Utilities.showNotification('No prices updated (unmatched coins)', 'error');
            } else {
                Utilities.showNotification('Crypto prices refreshed');
            }

            await this.renderCurrentTab();
        } catch (error) {
            console.error('Crypto refresh error:', error);
            Utilities.showNotification('Failed to refresh BTC price', 'error');
        }
    }

    async refreshAllLive() {
        try {
            await Promise.all([
                this.refreshCryptoLive(),
                this.refreshStocksLive(),
                this.refreshMutualFundsLive()
            ]);
            await this.renderCurrentTab();
        } catch (error) {
            console.error('All live refresh error:', error);
            Utilities.showNotification('Failed to refresh all prices', 'error');
        }
    }

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
        if (confirmed) {
            try {
                await this.dbManager.delete(type, id);
                Utilities.showNotification('Entry deleted successfully');
                await this.refreshCurrentTab();
            } catch (error) {
                console.error('Delete error:', error);
                Utilities.showNotification('Failed to delete entry', 'error');
            }
        }
    }

    async deleteTransaction(id) {
        await this.deleteEntry('transactions', id);
    }

    async deleteItem(storeName, id) {
        await this.dbManager.delete(storeName, id);
        if (window.syncAdapter) {
            await window.syncAdapter.softDeleteEntry(id);
        }
        await this.refreshCurrentTab();
    }

    async saveModalData() {
        if (!this.formHandler) return;
        const saved = await this.formHandler.saveCurrentForm();
        if (saved) {
            if (window.syncAdapter) {
                await window.syncAdapter.saveEntry({
                    id: saved.id,
                    type: saved.type || saved.category || 'entry',
                    amount: saved.amount || saved.value || 0,
                    createdAt: saved.createdAt,
                });
            }
        }
        await this.refreshCurrentTab();
    }

    closeModal() {
        const modal = document.getElementById('dataModal');
        modal.style.display = 'none';
        this.isSettingsModal = false;
        if (this.formHandler) {
            this.formHandler.closeModal();
        }
    }

    async showSettings() {
        try {
            this.isSettingsModal = true;
            const settings = await Utilities.getSettings(this.dbManager);

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
                <div class="form-actions">
                    <button type="button" id="setting-reset" class="btn btn-secondary">Reset settings</button>
                    <button type="button" id="data-reset" class="btn btn-danger">Reset all data</button>
                </div>
            `;

            const modal = document.getElementById('dataModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

            modalTitle.textContent = 'Settings';
            modalBody.innerHTML = formHTML;
            modal.style.display = 'block';

            const resetBtn = document.getElementById('setting-reset');
            if (resetBtn) {
                resetBtn.onclick = () => this.resetSettings();
            }

            const dataResetBtn = document.getElementById('data-reset');
            if (dataResetBtn) {
                dataResetBtn.onclick = () => this.resetAllData();
            }
        } catch (error) {
            console.error('Show settings error:', error);
            Utilities.showNotification('Failed to load settings', 'error');
        }
    }

    async saveSettings() {
        try {
            const settings = await Utilities.getSettings(this.dbManager);

            const goal = parseFloat(document.getElementById('setting-goal').value);
            const epf = parseFloat(document.getElementById('setting-epf').value);
            const ppf = parseFloat(document.getElementById('setting-ppf').value);

            if (goal < 0 || epf < 0 || ppf < 0) {
                Utilities.showNotification('Values cannot be negative', 'error');
                return;
            }

            settings.currency = document.getElementById('setting-currency').value;
            settings.goal = goal;
            settings.epf = epf;
            settings.ppf = ppf;
            settings.lastSync = new Date().toISOString();

            await this.dbManager.save('settings', settings);
            if (window.syncAdapter) {
                await window.syncAdapter.saveEntry({
                    id: 'settings',
                    type: 'settings',
                    amount: 0,
                    createdAt: settings.lastSync,
                });
            }
            Utilities.showNotification('Settings saved successfully');
            this.closeModal();
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Save settings error:', error);
            Utilities.showNotification('Failed to save settings', 'error');
        }
    }

    async resetSettings() {
        try {
            const confirmed = await Utilities.showConfirm('Reset settings to defaults? This will overwrite your current values.');
            if (!confirmed) return;

            const defaults = {
                ...INITIAL_DATA.settings,
                lastSync: new Date().toISOString()
            };

            await this.dbManager.save('settings', defaults);
            if (window.syncAdapter) {
                await window.syncAdapter.saveEntry({
                    id: 'settings',
                    type: 'settings',
                    amount: 0,
                    createdAt: defaults.lastSync,
                });
            }
            Utilities.showNotification('Settings reset to defaults');
            this.closeModal();
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Reset settings error:', error);
            Utilities.showNotification('Failed to reset settings', 'error');
        }
    }

    async resetAllData() {
        try {
            const confirmed = await Utilities.showConfirm('This will erase ALL data (transactions, assets, liabilities, settings). Proceed?');
            if (!confirmed) return;

            for (const store of this.dbManager.stores) {
                await this.dbManager.clear(store);
            }

            // Re-seed default settings
            await this.dbManager.save('settings', {
                ...INITIAL_DATA.settings,
                lastSync: new Date().toISOString()
            });

            Utilities.showNotification('All data reset to defaults');
            this.closeModal();
            await this.switchTab('dashboard');
        } catch (error) {
            console.error('Reset all data error:', error);
            Utilities.showNotification('Failed to reset all data', 'error');
        }
    }

    async exportAllData() {
        try {
            const data = {};
            for (const store of this.dbManager.stores) {
                data[store] = await this.dbManager.getAll(store);
            }
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
                const data = await Utilities.importData(file, this.dbManager);

                const overwrite = await Utilities.showConfirm('Importing will replace existing data. Continue?');
                if (!overwrite) return;

                // Clear all stores to avoid duplication on repeated imports
                for (const store of this.dbManager.stores) {
                    await this.dbManager.clear(store);
                }

                const fieldMappings = {
                    'savings': {
                        'bank': 'bankName',
                        'type': 'accountType'
                    },
                    'fixedDeposits': {
                        'bank': 'bankName',
                        'rate': 'interestRate'
                    },
                    'mutualFunds': {
                        'name': 'fundName',
                        'code': 'schemeCode',
                        'scheme_code': 'schemeCode'
                    },
                    'stocks': {
                        'name': 'stockName'
                    },
                    'crypto': {
                        'coin': 'coinName'
                    },
                    'liabilities': {
                        'rate': 'interestRate'
                    }
                };

                for (const store of this.dbManager.stores) {
                    if (data[store]) {
                        const items = Array.isArray(data[store]) ? data[store] : [data[store]];

                        for (const item of items) {
                            if (fieldMappings[store]) {
                                const mapping = fieldMappings[store];
                                for (const [oldField, newField] of Object.entries(mapping)) {
                                    if (item[oldField] !== undefined && item[newField] === undefined) {
                                        item[newField] = item[oldField];
                                    }
                                }
                            }

                            const itemToSave = { ...item };
                            if (store !== 'settings') {
                                delete itemToSave.id;
                            }

                            await this.dbManager.save(store, itemToSave);
                        }
                    }
                }

                // If no settings were present in import, seed defaults to keep app consistent
                const hasSettings = Array.isArray(data.settings) ? data.settings.length > 0 : !!data.settings;
                if (!hasSettings) {
                    await this.dbManager.save('settings', {
                        ...INITIAL_DATA.settings,
                        lastSync: new Date().toISOString()
                    });
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
