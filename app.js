class PersonalFinanceApp {
    constructor() {
        this.dbManager = new DatabaseManager();
        this.renderer = null;
        this.formHandler = null;
        this.currentTab = 'dashboard';
        this.sidebarCollapsed = false;
        this.isSettingsModal = false;
    }

    async init() {
        try {
            await this.dbManager.init();

            this.renderer = new UIRenderer(this.dbManager);
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
            const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (collapsed) {
                this.toggleSidebar();
            }
        } catch (error) {
            console.error('Sidebar state load error:', error);
        }
    }

    toggleSidebar() {
        try {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            const toggleBtn = document.getElementById('sidebarToggle');

            if (this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
                if (toggleBtn) toggleBtn.textContent = '☰';
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
                if (toggleBtn) toggleBtn.textContent = '✕';
            }

            localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
        } catch (error) {
            console.error('Sidebar toggle error:', error);
        }
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
                const onclick = item.getAttribute('onclick');
                if (onclick && onclick.includes(`'${tabName}'`)) {
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
            switch (this.currentTab) {
                case 'dashboard':
                    await this.renderer.renderDashboard();
                    break;
                case 'expenses':
                    await this.renderer.renderExpenses();
                    break;
                case 'savings':
                    await this.renderer.renderSavings();
                    break;
                case 'fixedDeposits':
                    await this.renderer.renderFixedDeposits();
                    break;
                case 'mutualFunds':
                    await this.renderer.renderMutualFunds();
                    break;
                case 'stocks':
                    await this.renderer.renderStocks();
                    break;
                case 'crypto':
                    await this.renderer.renderCrypto();
                    break;
                case 'liabilities':
                    await this.renderer.renderLiabilities();
                    break;
            }
        } catch (error) {
            console.error('Render error:', error);
            Utilities.showNotification('Failed to render content', 'error');
        }
    }

    async refreshCurrentTab() {
        await this.renderCurrentTab();
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

    async saveModalData() {
        if (this.isSettingsModal) {
            await this.saveSettings();
        } else {
            await this.formHandler.saveForm();
        }
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
            `;

            const modal = document.getElementById('dataModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

            modalTitle.textContent = 'Settings';
            modalBody.innerHTML = formHTML;
            modal.style.display = 'block';
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
            Utilities.showNotification('Settings saved successfully');
            this.closeModal();
            await this.refreshCurrentTab();
        } catch (error) {
            console.error('Save settings error:', error);
            Utilities.showNotification('Failed to save settings', 'error');
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
                        'name': 'fundName'
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
                            if (store != 'settings'){
                                delete itemToSave.id;
                            }

                            await this.dbManager.save(store, itemToSave);
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

let app;
window.addEventListener('DOMContentLoaded', async () => {
    app = new PersonalFinanceApp();
    await app.init();
});