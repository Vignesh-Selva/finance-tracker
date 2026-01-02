// Initial Data
const INITIAL_DATA = {
    // Net Worth Data
    savings: [],
    fixedDeposits: [],
    mutualFunds: [],
    stocks: [],
    crypto: [],
    liabilities: [],

    // Expense Tracker Data
    transactions: [],
    budgets: [],

    settings: {
        id: 1,
        currency: 'INR',
        goal: 15000000,
        epf: 681593,
        ppf: 13000,
        theme: 'light',
        lastSync: new Date().toISOString()
    }
};

// Global Variables
let db;
let currentTab = 'dashboard';
let editingEntry = null;
let currentFormType = '';
const DB_NAME = 'PersonalFinanceDB';
const DB_VERSION = 1;

// IndexedDB Setup
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const stores = [
                'savings', 'fixedDeposits', 'mutualFunds', 'stocks', 'crypto',
                'liabilities', 'transactions', 'budgets', 'settings'
            ];

            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    if (storeName === 'transactions') {
                        store.createIndex('date', 'date', { unique: false });
                        store.createIndex('category', 'category', { unique: false });
                    } else if (storeName !== 'settings' && storeName !== 'budgets') {
                        store.createIndex('updated', 'updated', { unique: false });
                    }
                }
            });
        };
    });
}

// Data Operations
function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getSingleData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get Settings Helper
async function getSettings() {
    const settings = await getData('settings');
    return settings[0] || INITIAL_DATA.settings;
}

// Format Currency
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format Date
function formatDate(dateString) {
    if (!dateString || dateString === 'NA') return 'NA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Calculate Net Worth Totals
async function calculateNetWorthTotals() {
    try {
        const savings = await getData('savings');
        const fd = await getData('fixedDeposits');
        const mf = await getData('mutualFunds');
        const stocks = await getData('stocks');
        const crypto = await getData('crypto');
        const liabilities = await getData('liabilities');
        const settings = await getSettings();

        const savingsTotal = savings.reduce((sum, item) => sum + (item.balance || 0), 0);
        const fdTotal = fd.reduce((sum, item) => sum + (item.invested || 0), 0);
        const mfTotal = mf.reduce((sum, item) => sum + (item.current || 0), 0);
        const stocksTotal = stocks.reduce((sum, item) => sum + (item.current || 0), 0);
        const cryptoTotal = crypto.reduce((sum, item) => sum + (item.current || 0), 0);
        const liabilitiesTotal = liabilities.reduce((sum, item) => sum + (item.outstanding || 0), 0);

        // Get EPF and PPF from settings
        const epf = settings.epf || 0;
        const ppf = settings.ppf || 0;

        return {
            savings: savingsTotal,
            fd: fdTotal,
            mf: mfTotal,
            stocks: stocksTotal,
            crypto: cryptoTotal,
            liabilities: liabilitiesTotal,
            epf: epf,
            ppf: ppf,
            total: savingsTotal + fdTotal + mfTotal + stocksTotal + cryptoTotal + epf + ppf - liabilitiesTotal
        };
    } catch (error) {
        console.error('Error calculating totals:', error);
        return { savings: 0, fd: 0, mf: 0, stocks: 0, crypto: 0, liabilities: 0, epf: 0, ppf: 0, total: 0 };
    }
}

// Calculate Expense Totals
async function calculateExpenseTotals() {
    try {
        const transactions = await getData('transactions');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        });

        const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        return {
            income: totalIncome,
            expenses: totalExpenses,
            balance: totalIncome - totalExpenses,
            transactionCount: monthlyTransactions.length
        };
    } catch (error) {
        console.error('Error calculating expense totals:', error);
        return { income: 0, expenses: 0, balance: 0, transactionCount: 0 };
    }
}

// Toggle Theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Tab Switching
function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));

    const contentDiv = document.getElementById(`content-${tabName}`);
    if (contentDiv) contentDiv.classList.add('active');

    document.querySelectorAll('.tab').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tabName) || btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });

    switch (tabName) {
        case 'dashboard': renderDashboard(); break;
        case 'expenses': renderExpenses(); break;
        case 'savings': renderSavings(); break;
        case 'fd': renderFD(); break;
        case 'mf': renderMF(); break;
        case 'stocks': renderStocks(); break;
        case 'crypto': renderCrypto(); break;
        case 'liabilities': renderLiabilities(); break;
    }
}

// Render Dashboard
async function renderDashboard() {
    try {
        const netWorthTotals = await calculateNetWorthTotals();
        const settings = await getSettings();

        const netWorth = netWorthTotals.total;
        const goal = settings.goal;
        const progress = Math.min((netWorth / goal * 100), 100).toFixed(2);

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Net Worth</div>
                    <div class="stat-value">${formatCurrency(netWorth)}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="stat-change positive">${progress}% of Goal Reached</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Asset Allocation</h3>
                <div id="allocation-container"></div>
            </div>
        `;

        document.getElementById('content-dashboard').innerHTML = html;
        renderAllocation(netWorthTotals);
    } catch (error) {
        console.error('Error rendering dashboard:', error);
    }
}

// Render Asset Allocation
function renderAllocation(totals) {
    const totalAssets = totals.total + totals.liabilities;
    const allocation = [
        { name: 'Savings', value: totals.savings, color: '#3b82f6' },
        { name: 'EPF', value: totals.epf, color: '#8b5cf6' },
        { name: 'Mutual Funds', value: totals.mf, color: '#10b981' },
        { name: 'Fixed Deposits', value: totals.fd, color: '#f59e0b' },
        { name: 'Stocks & ETFs', value: totals.stocks, color: '#ef4444' },
        { name: 'Crypto', value: totals.crypto, color: '#ec4899' },
        { name: 'PPF', value: totals.ppf, color: '#06b6d4' }
    ].sort((a, b) => b.value - a.value);

    const html = allocation.map(item => {
        const percent = totalAssets > 0 ? (item.value / totalAssets * 100).toFixed(2) : 0;
        return `
            <div class="allocation-card">
                <div class="allocation-color-bar" style="background: ${item.color}"></div>
                <div class="allocation-card-content">
                    <div class="allocation-name">${item.name}</div>
                    <div class="allocation-value">${formatCurrency(item.value)}</div>
                    <div class="allocation-percent">${percent}%</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('allocation-container').innerHTML = html;
}

// Render Expenses
async function renderExpenses() {
    try {
        const transactions = await getData('transactions');
        const budgets = await getData('budgets');
        const expenseTotals = await calculateExpenseTotals();

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Monthly Income</div>
                    <div class="stat-value text-success">${formatCurrency(expenseTotals.income)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Monthly Expenses</div>
                    <div class="stat-value text-danger">${formatCurrency(expenseTotals.expenses)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Monthly Balance</div>
                    <div class="stat-value ${expenseTotals.balance >= 0 ? 'text-success' : 'text-danger'}">
                        ${formatCurrency(expenseTotals.balance)}
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Add Transaction</h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" id="expenseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Type</label>
                        <select id="expenseType" class="form-control">
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="expenseCategory" class="form-control">
                            <option value="Food">Food</option>
                            <option value="Transport">Transport</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Bills">Bills</option>
                            <option value="Salary">Salary</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Amount (₹)</label>
                        <input type="number" id="expenseAmount" class="form-control" placeholder="0.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <input type="text" id="expenseDescription" class="form-control" placeholder="Description">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button class="btn btn-primary" style="width: 100%;" onclick="addTransaction()">Add Transaction</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Recent Transactions</h3>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="transactions-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-expenses').innerHTML = html;
        renderTransactions(transactions);
        renderBudgetOverview(budgets, transactions);
    } catch (error) {
        console.error('Error rendering expenses:', error);
    }
}

// Add Transaction
async function addTransaction() {
    const date = document.getElementById('expenseDate').value;
    const type = document.getElementById('expenseType').value;
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value;

    if (!date || !amount || amount <= 0) {
        alert('Please fill in all required fields');
        return;
    }

    const transaction = { date, type, category, amount, description, created: new Date().toISOString() };

    try {
        await saveData('transactions', transaction);
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDescription').value = '';
        await renderExpenses();
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to add transaction');
    }
}

// Render Transactions
function renderTransactions(transactions) {
    const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

    const html = sorted.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><span class="${t.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">${t.type.toUpperCase()}</span></td>
            <td>${t.category}</td>
            <td>${t.description}</td>
            <td class="fw-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(t.amount)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteTransaction(${t.id})">Delete</button></td>
        </tr>
    `).join('');

    document.getElementById('transactions-tbody').innerHTML = html || '<tr><td colspan="6" class="text-center text-muted">No transactions found</td></tr>';
}

// Delete Transaction
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
        await deleteData('transactions', id);
        await renderExpenses();
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
}

// Render Budget Overview
async function renderBudgetOverview(budgets, transactions) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = transactions.filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'expense' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const categorySpending = {};
    monthlyExpenses.forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    if (budgets.length === 0) {
        budgets = INITIAL_DATA.budgets;
        for (const budget of budgets) {
            await saveData('budgets', budget);
        }
    }

    const html = budgets.map(budget => {
        const spent = categorySpending[budget.category] || 0;
        const percent = budget.limit > 0 ? (spent / budget.limit * 100) : 0;
        const isOverBudget = spent > budget.limit;
        const remaining = budget.limit - spent;

        return `
            <div class="allocation-card">
                <div class="allocation-color-bar" style="background: ${isOverBudget ? '#ef4444' : '#10b981'}"></div>
                <div class="allocation-card-content">
                    <div class="allocation-name">${budget.category}</div>
                    <div class="allocation-value ${isOverBudget ? 'text-danger' : 'text-success'}">
                        ${formatCurrency(remaining)}
                    </div>
                    <div class="allocation-percent">
                        ${formatCurrency(spent)} / ${formatCurrency(budget.limit)} (${percent.toFixed(1)}%)
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('budget-overview').innerHTML = html;
}

// Manage Budgets
async function manageBudgets() {
    const budgets = await getData('budgets');

    const formHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${budgets.map(b => `
                <div class="form-group">
                    <label class="form-label">${b.category}</label>
                    <input type="number" id="budget-${b.id}" class="form-control" value="${b.limit}" step="100">
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('modalTitle').textContent = 'Manage Monthly Budgets';
    document.getElementById('modalBody').innerHTML = formHTML;
    document.getElementById('modal').classList.add('active');

    // Override save function temporarily
    window.tempSaveFunction = async function () {
        try {
            for (const budget of budgets) {
                const newLimit = parseFloat(document.getElementById(`budget-${budget.id}`).value) || 0;
                budget.limit = newLimit;
                await saveData('budgets', budget);
            }
            closeModal();
            await renderExpenses();
        } catch (error) {
            console.error('Error saving budgets:', error);
            alert('Failed to save budgets');
        }
    };
}

// Render Savings
async function renderSavings() {
    try {
        const savings = await getData('savings');
        const total = savings.reduce((sum, item) => sum + (item.balance || 0), 0);

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Savings Accounts</h3>
                    <button class="btn btn-primary" onclick="openAddModal('savings')">+ Add Account</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Bank Name</th>
                                <th>Account Type</th>
                                <th>Balance</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${savings.map(s => `
                                <tr>
                                    <td class="fw-bold">${s.bank}</td>
                                    <td>${s.type}</td>
                                    <td class="fw-bold">${formatCurrency(s.balance)}</td>
                                    <td>${formatDate(s.updated)}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('savings', ${s.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('savings', ${s.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td colspan="2">Total Value</td>
                                <td colspan="3">${formatCurrency(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-savings').innerHTML = html;
    } catch (error) {
        console.error('Error rendering savings:', error);
    }
}

// Render Fixed Deposits
async function renderFD() {
    try {
        const fd = await getData('fixedDeposits');
        const totalInvested = fd.reduce((sum, item) => sum + (item.invested || 0), 0);
        const totalMaturity = fd.reduce((sum, item) => sum + (item.maturity || 0), 0);

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Fixed Deposits</h3>
                    <button class="btn btn-primary" onclick="openAddModal('fixedDeposits')">+ Add FD</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Bank</th>
                                <th>Invested Amount</th>
                                <th>Interest Rate</th>
                                <th>Duration (Days)</th>
                                <th>Maturity Amount</th>
                                <th>Maturity Date</th>
                                <th>Owner</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fd.map(f => `
                                <tr>
                                    <td class="fw-bold">${f.bank}</td>
                                    <td>${formatCurrency(f.invested)}</td>
                                    <td>${f.rate}%</td>
                                    <td>${f.duration}</td>
                                    <td class="fw-bold">${formatCurrency(f.maturity)}</td>
                                    <td>${formatDate(f.maturityDate)}</td>
                                    <td>${f.owner}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('fixedDeposits', ${f.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('fixedDeposits', ${f.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td>Total</td>
                                <td>${formatCurrency(totalInvested)}</td>
                                <td colspan="2">
                                <td colspan="3">${formatCurrency(totalMaturity)}</td>
                                <td colspan="3"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-fd').innerHTML = html;
    } catch (error) {
        console.error('Error rendering FD:', error);
    }
}

// Render Mutual Funds
async function renderMF() {
    try {
        const mf = await getData('mutualFunds');
        const totalInvested = mf.reduce((sum, item) => sum + (item.invested || 0), 0);
        const totalCurrent = mf.reduce((sum, item) => sum + (item.current || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const totalPLPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : 0;

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Mutual Fund Portfoilio</h3>
                    <button class="btn btn-primary" onclick="openAddModal('mutualFunds')">+ Add Fund</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Fund Name</th>
                                <th>Type</th>
                                <th>Units</th>
                                <th>Invested</th>
                                <th>Current Value</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>XIRR %</th>
                                <th>Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mf.map(m => {
            const pl = (m.current || 0) - (m.invested || 0);
            return `
                                <tr>
                                    <td class="fw-bold">${m.name}</td>
                                    <td>${m.type}</td>
                                    <td>${m.units}</td>
                                    <td>${formatCurrency(m.invested)}</td>
                                    <td class="fw-bold">${formatCurrency(m.current)}</td>
                                    <td class="${pl >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(pl)}</td>
                                    <td class="${m.plPercent >= 0 ? 'text-success' : 'text-danger'}">${m.plPercent}%</td>
                                    <td class="${m.xirr >= 0 ? 'text-success' : 'text-danger'}">${m.xirr}%</td>
                                    <td>${formatDate(m.updated)}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('mutualFunds', ${m.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('mutualFunds', ${m.id})">Delete</button>
                                    </td>
                                </tr>
                            `}).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td colspan="3">Total</td>
                                <td>${formatCurrency(totalInvested)}</td>
                                <td>${formatCurrency(totalCurrent)}</td>
                                <td class="${totalPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalPL)}</td>
                                <td class="${totalPLPercent >= 0 ? 'text-success' : 'text-danger'}">${totalPLPercent}%</td>
                                <td colspan="3"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <!-- Add Transaction -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Add Transaction</h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Fund Name</label>
                        <input type="text" id="mfFundName" class="form-control" placeholder="Fund Name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Type</label>
                        <select id="mfType" class="form-control">
                            <option value="Equity">Equity</option>
                            <option value="Debt">Debt</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Index">Index</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Units</label>
                        <input type="number" id="mfUnits" class="form-control" placeholder="0.000" step="0.001">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SIP Amount (INR)</label>
                        <input type="number" id="mfSipAmount" class="form-control" placeholder="0.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" id="mfDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button class="btn btn-primary" style="width: 100%;" onclick="addMFTransaction()">Add Transaction</button>
                    </div>
                </div>
            </div>
            <!-- Recent Transactions -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Recent Transactions</h3>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Fund Name</th>
                                <th>Platform</th>
                                <th>Type</th>
                                <th>Units</th>
                                <th>SIP Amount</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="mf-transactions-tbody"></tbody>
                    </table>
                </div>
            </div>
            `;

        document.getElementById('content-mf').innerHTML = html;
    } catch (error) {
        console.error('Error rendering MF:', error);
    }
}

// Add MF Transaction
async function addMFTransaction() {
    const fundName = document.getElementById('mfFundName').value.trim();
    const type = document.getElementById('mfType').value;
    const units = parseFloat(document.getElementById('mfUnits').value);
    const sipAmount = parseFloat(document.getElementById('mfSipAmount').value);
    const date = document.getElementById('mfDate').value;

    if (!fundName || !units || !sipAmount || !date || units <= 0 || sipAmount <= 0) {
        alert('Please fill in all required fields with valid values');
        return;
    }

    const transaction = {
        fundName,
        type,
        units,
        sipAmount,
        date,
        created: new Date().toISOString()
    };

    try {
        await saveData('mutualFunds', transaction);

        // Clear form
        document.getElementById('mfFundName').value = '';
        document.getElementById('mfUnits').value = '';
        document.getElementById('mfSipAmount').value = '';

        await renderMF();
    } catch (error) {
        console.error('Error adding MF transaction:', error);
        alert('Failed to add transaction');
    }
}

// Render MF Transactions
function renderMFTransactions(transactions) {
    const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const html = sorted.map(t => `
        <tr>
            <td class="fw-bold">${t.fundName}</td>
            <td>${t.platform}</td>
            <td>${t.type}</td>
            <td>${t.units.toFixed(3)}</td>
            <td>${formatCurrency(t.sipAmount)}</td>
            <td>${formatDate(t.date)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteMFTransaction(${t.id})">Delete</button></td>
        </tr>
    `).join('');

    document.getElementById('mf-transactions-tbody').innerHTML = html || '<tr><td colspan="7" class="text-center text-muted">No transactions found</td></tr>';
}

// Delete MF Transaction
async function deleteMFTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
        await deleteData('mutualFunds', id);
        await renderMF();
    } catch (error) {
        console.error('Error deleting MF transaction:', error);
    }
}

// Render Stocks
async function renderStocks() {
    try {
        const stocks = await getData('stocks');
        const totalInvested = stocks.reduce((sum, item) => sum + (item.invested || 0), 0);
        const totalCurrent = stocks.reduce((sum, item) => sum + (item.current || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const totalPLPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : 0;

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Stocks & ETFs</h3>
                    <button class="btn btn-primary" onclick="openAddModal('stocks')">+ Add Stock</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Ticker</th>
                                <th>Quantity</th>
                                <th>Avg Buy Price</th>
                                <th>Invested Amount</th>
                                <th>Current Value</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stocks.map(s => {
            const pl = (s.current || 0) - (s.invested || 0);
            const plPercent = s.invested > 0 ? ((pl / s.invested) * 100).toFixed(2) : 0;
            return `
                                <tr>
                                    <td class="fw-bold">${s.name}</td>
                                    <td>${s.ticker}</td>
                                    <td>${s.quantity}</td>
                                    <td>${formatCurrency(s.avgPrice)}</td>
                                    <td>${formatCurrency(s.invested)}</td>
                                    <td class="fw-bold">${formatCurrency(s.current)}</td>
                                    <td class="${pl >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(pl)}</td>
                                    <td class="${plPercent >= 0 ? 'text-success' : 'text-danger'}">${plPercent}%</td>
                                    <td>${formatDate(s.updated)}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('stocks', ${s.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('stocks', ${s.id})">Delete</button>
                                    </td>
                                </tr>
                            `}).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td colspan="4">Total</td>
                                <td>${formatCurrency(totalInvested)}</td>
                                <td>${formatCurrency(totalCurrent)}</td>
                                <td class="${totalPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalPL)}</td>
                                <td class="${totalPLPercent >= 0 ? 'text-success' : 'text-danger'}">${totalPLPercent}%</td>
                                <td colspan="2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-stocks').innerHTML = html;
    } catch (error) {
        console.error('Error rendering stocks:', error);
    }
}

// Render Crypto
async function renderCrypto() {
    try {
        const crypto = await getData('crypto');
        const totalInvested = crypto.reduce((sum, item) => sum + (item.invested || 0), 0);
        const totalCurrent = crypto.reduce((sum, item) => sum + (item.current || 0), 0);
        const totalPL = totalCurrent - totalInvested;
        const totalPLPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : 0;

        const btcQuantity = crypto.filter(item => item.coin === "BTC").reduce((sum, item) => sum + (item.quantity || 0), 0);
        const btcPercentage = (btcQuantity * 100).toFixed(2);

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Cryptocurrency</h3>
                    <button class="btn btn-primary" onclick="openAddModal('crypto')">+ Add Crypto</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Coin</th>
                                <th>Platform</th>
                                <th>Quantity</th>
                                <th>Invested</th>
                                <th>Fees + GST</th>
                                <th>Current Value</th>
                                <th>P&L</th>
                                <th>P&L %</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${crypto.map(c => {
            const fees = (c.fees || 0) + (c.gst || 0);
            return `
                                <tr>
                                    <td class="fw-bold">${c.coin}</td>
                                    <td>${c.platform}</td>
                                    <td>${c.quantity}</td>
                                    <td>${formatCurrency(c.invested)}</td>
                                    <td>${formatCurrency(fees)}</td>
                                    <td class="fw-bold">${formatCurrency(c.current)}</td>
                                    <td class="${c.pl >= 0 ? 'text-success' : 'text-danger'} fw-bold">${formatCurrency(c.pl)}</td>
                                    <td class="${c.plPercent >= 0 ? 'text-success' : 'text-danger'}">${c.plPercent}%</td>
                                    <td>${c.type}</td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('crypto', ${c.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('crypto', ${c.id})">Delete</button>
                                    </td>
                                </tr>
                                `}).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td colspan="3">Total</td>
                                <td>${formatCurrency(totalInvested)}</td>
                                <td></td>
                                <td>${formatCurrency(totalCurrent)}</td>
                                <td class="${totalPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalPL)}</td>
                                <td class="${totalPLPercent >= 0 ? 'text-success' : 'text-danger'}">${totalPLPercent}%</td>
                                <td colspan="2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            ${btcQuantity > 0 ? `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">BTC Progress to 1 BTC</h3>
                </div>
                <div style="background: var(--bg-primary); padding: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Owned: ${btcQuantity} BTC</span>
                        <span style="font-weight: bold; color: #f7931a;">${btcPercentage}%</span>
                    </div>
                    <div style="width: 100%; height: 20px; background: #353b41ff; border-radius: 20px; overflow: hidden;">
                        <div style="height: 100%; background: linear-gradient(90deg, #f7931a, #ff9900); 
                        width: ${btcPercentage}%; display: flex; align-items: center; justify-content: center; 
                        color: white; font-weight: bold; transition: width 0.5s ease;">
                            ${btcPercentage > 10 ? btcPercentage + '%' : ''}
                        </div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); text-align: right;">
                        <span>Remaining: ${(1 - btcQuantity).toFixed(8)} BTC</span>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        document.getElementById('content-crypto').innerHTML = html;
    } catch (error) {
        console.error('Error rendering crypto:', error);
    }
}


// Render Liabilities
async function renderLiabilities() {
    try {
        const liabilities = await getData('liabilities');
        const totalOutstanding = liabilities.reduce((sum, item) => sum + (item.outstanding || 0), 0);
        const totalLoanAmount = liabilities.reduce((sum, item) => sum + (item.loanAmount || 0), 0);

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Liabilities</h3>
                    <button class="btn btn-primary" onclick="openAddModal('liabilities')">+ Add Liability</button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Lender</th>
                                <th>Outstanding</th>
                                <th>Interest Rate</th>
                                <th>EMI</th>
                                <th>Loan Amount</th>
                                <th>Remaining Months</th>
                                <th>End Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${liabilities.map(l => `
                                <tr>
                                    <td class="fw-bold">${l.type}</td>
                                    <td>${l.lender}</td>
                                    <td class="fw-bold text-danger">${formatCurrency(l.outstanding)}</td>
                                    <td>${l.rate}%</td>
                                    <td>${formatCurrency(l.emi)}</td>
                                    <td>${formatCurrency(l.loanAmount)}</td>
                                    <td>${l.remaining}</td>
                                    <td>${formatDate(l.endDate)}</td>
                                    <td><span class="${l.status === 'Completed' ? 'text-success' : 'text-warning'} fw-bold">${l.status}</span></td>
                                    <td>
                                        <button class="btn btn-secondary btn-sm" onclick="editEntry('liabilities', ${l.id})">Edit</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteEntry('liabilities', ${l.id})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                            <tr style="background: var(--bg-primary); font-weight: bold;">
                                <td>Total</td>
                                <td></td>
                                <td class="text-danger">${formatCurrency(totalOutstanding)}</td>
                                <td colspan="2"></td>
                                <td>${formatCurrency(totalLoanAmount)}</td>
                                <td colspan="4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('content-liabilities').innerHTML = html;
    } catch (error) {
        console.error('Error rendering liabilities:', error);
    }
}

// Modal Functions
function openAddModal(type) {
    currentFormType = type;
    editingEntry = null;
    window.tempSaveFunction = null;

    const titles = {
        savings: 'Add Savings Account',
        fixedDeposits: 'Add Fixed Deposit',
        mutualFunds: 'Add Mutual Fund',
        stocks: 'Add Stock/ETF',
        crypto: 'Add Cryptocurrency',
        liabilities: 'Add Liability'
    };

    document.getElementById('modalTitle').textContent = titles[type];
    document.getElementById('modalBody').innerHTML = generateForm(type);
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    editingEntry = null;
    currentFormType = '';
    window.tempSaveFunction = null;
}

async function editEntry(storeName, id) {
    try {
        const entry = await getSingleData(storeName, id);
        if (!entry) {
            alert('Entry not found');
            return;
        }

        editingEntry = { storeName, id, data: entry };
        currentFormType = storeName;
        window.tempSaveFunction = null;

        const titles = {
            savings: 'Edit Savings Account',
            fixedDeposits: 'Edit Fixed Deposit',
            mutualFunds: 'Edit Mutual Fund',
            stocks: 'Edit Stock/ETF',
            crypto: 'Edit Cryptocurrency',
            liabilities: 'Edit Liability'
        };

        document.getElementById('modalTitle').textContent = titles[storeName];
        document.getElementById('modalBody').innerHTML = generateForm(storeName, entry);
        document.getElementById('modal').classList.add('active');
    } catch (error) {
        console.error('Error editing entry:', error);
        alert('Failed to load entry');
    }
}

async function deleteEntry(storeName, id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
        await deleteData(storeName, id);
        switchTab(currentTab);
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry');
    }
}

function generateForm(type, data = {}) {
    const forms = {
        savings: `
            <div class="form-group">
                <label class="form-label">Bank Name</label>
                <input type="text" id="bank" class="form-control" value="${data.bank || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Account Type</label>
                <input type="text" id="type" class="form-control" value="${data.type || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Balance</label>
                <input type="number" id="balance" class="form-control" value="${data.balance || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Last Updated</label>
                <input type="date" id="updated" class="form-control" value="${data.updated || new Date().toISOString().split('T')[0]}" required>
            </div>
        `,
        fixedDeposits: `
            <div class="form-group">
                <label class="form-label">Bank</label>
                <input type="text" id="bank" class="form-control" value="${data.bank || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Invested Amount</label>
                <input type="number" id="invested" class="form-control" value="${data.invested || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Interest Rate (%)</label>
                <input type="number" id="rate" class="form-control" value="${data.rate || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Duration (Days)</label>
                <input type="number" id="duration" class="form-control" value="${data.duration || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Maturity Amount</label>
                <input type="number" id="maturity" class="form-control" value="${data.maturity || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Maturity Date</label>
                <input type="date" id="maturityDate" class="form-control" value="${data.maturityDate || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Owner</label>
                <input type="text" id="owner" class="form-control" value="${data.owner || ''}" required>
            </div>
        `,
        mutualFunds: `
            <div class="form-group">
                <label class="form-label">Fund Name</label>
                <input type="text" id="name" class="form-control" value="${data.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <input type="text" id="type" class="form-control" value="${data.type || 'Equity'}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Units</label>
                <input type="number" id="units" class="form-control" value="${data.units || ''}" step="0.001" required>
            </div>
            <div class="form-group">
                <label class="form-label">Invested Amount</label>
                <input type="number" id="invested" class="form-control" value="${data.invested || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Current Value</label>
                <input type="number" id="current" class="form-control" value="${data.current || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Last Updated</label>
                <input type="date" id="updated" class="form-control" value="${data.updated || new Date().toISOString().split('T')[0]}" required>
            </div>
        `,
        stocks: `
            <div class="form-group">
                <label class="form-label">Stock Name</label>
                <input type="text" id="name" class="form-control" value="${data.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Ticker Symbol</label>
                <input type="text" id="ticker" class="form-control" value="${data.ticker || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" id="quantity" class="form-control" value="${data.quantity || ''}" step="0.001" required>
            </div>
            <div class="form-group">
                <label class="form-label">Average Buy Price</label>
                <input type="number" id="avgPrice" class="form-control" value="${data.avgPrice || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Invested Amount</label>
                <input type="number" id="invested" class="form-control" value="${data.invested || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Current Value</label>
                <input type="number" id="current" class="form-control" value="${data.current || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Last Updated</label>
                <input type="date" id="updated" class="form-control" value="${data.updated || new Date().toISOString().split('T')[0]}" required>
            </div>
        `,
        crypto: `
            <div class="form-group">
                <label class="form-label">Coin</label>
                <input type="text" id="coin" class="form-control" value="${data.coin || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Platform</label>
                <input type="text" id="platform" class="form-control" value="${data.platform || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" id="quantity" class="form-control" value="${data.quantity || ''}" step="0.00000001" required>
            </div>
            <div class="form-group">
                <label class="form-label">Invested Amount</label>
                <input type="number" id="invested" class="form-control" value="${data.invested || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Fees</label>
                <input type="number" id="fees" class="form-control" value="${data.fees || 0}" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">GST</label>
                <input type="number" id="gst" class="form-control" value="${data.gst || 0}" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">Current Value</label>
                <input type="number" id="current" class="form-control" value="${data.current || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Type/Notes</label>
                <input type="text" id="type" class="form-control" value="${data.type || ''}">
            </div>
        `,
        liabilities: `
            <div class="form-group">
                <label class="form-label">Type</label>
                <input type="text" id="type" class="form-control" value="${data.type || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Lender</label>
                <input type="text" id="lender" class="form-control" value="${data.lender || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Outstanding Amount</label>
                <input type="number" id="outstanding" class="form-control" value="${data.outstanding || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Interest Rate (%)</label>
                <input type="number" id="rate" class="form-control" value="${data.rate || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">EMI Amount</label>
                <input type="number" id="emi" class="form-control" value="${data.emi || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Loan Amount</label>
                <input type="number" id="loanAmount" class="form-control" value="${data.loanAmount || ''}" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">Remaining Months</label>
                <input type="number" id="remaining" class="form-control" value="${data.remaining || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" id="endDate" class="form-control" value="${data.endDate || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="status" class="form-control" required>
                    <option value="Active" ${data.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Completed" ${data.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
        `
    };

    return forms[type] || '<p>Form not available</p>';
}

async function saveModalData() {
    // Check if there's a temporary save function (for budgets)
    if (window.tempSaveFunction) {
        await window.tempSaveFunction();
        return;
    }

    const type = currentFormType;

    try {
        let data = {};
        const form = document.getElementById('modalBody');
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const id = input.id;
            let value = input.value;
            if (input.type === 'number') {
                value = parseFloat(value) || 0;
            }
            data[id] = value;
        });

        // Handle Mutual Funds - check for duplicates
        if (type === 'mutualFunds') {
            const existingMF = await getData('mutualFunds');
            const existingEntry = existingMF.find(m =>
                m.name === data.name &&
                (!editingEntry || m.id !== editingEntry.id)
            );

            if (existingEntry) {
                // Merge with existing entry
                data.units = (existingEntry.units || 0) + (data.units || 0);
                data.invested = (existingEntry.invested || 0) + (data.invested || 0);
                data.current = (existingEntry.current || 0) + (data.current || 0);

                // Calculate new P&L
                const pl = data.current - data.invested;
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;
                data.xirr = data.xirr || 0;

                // KEEP THE EXISTING ID
                data.id = existingEntry.id;

            } else {
                // New entry - calculate P&L
                const pl = (data.current || 0) - (data.invested || 0);
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;
                if (!data.xirr) data.xirr = 0;
            }
        }

        // Handle Stocks - check for duplicates
        if (type === 'stocks') {
            const existingStocks = await getData('stocks');
            const existingEntry = existingStocks.find(s =>
                s.ticker === data.ticker &&
                (!editingEntry || s.id !== editingEntry.id)
            );

            if (existingEntry) {
                // Merge with existing entry
                const totalQuantity = (existingEntry.quantity || 0) + (data.quantity || 0);
                const totalInvested = (existingEntry.invested || 0) + (data.invested || 0);

                // Recalculate average price
                data.avgPrice = totalQuantity > 0 ? (totalInvested / totalQuantity) : 0;
                data.quantity = totalQuantity;
                data.invested = totalInvested;
                data.current = (existingEntry.current || 0) + (data.current || 0);

                // Calculate new P&L
                const pl = data.current - data.invested;
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;

                // KEEP THE EXISTING ID
                data.id = existingEntry.id;
            } else {
                // New entry - calculate P&L
                const pl = (data.current || 0) - (data.invested || 0);
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;
            }
        }

        // Handle Crypto - check for duplicates
        if (type === 'crypto') {
            const existingCrypto = await getData('crypto');
            const existingEntry = existingCrypto.find(c =>
                c.coin === data.coin &&
                c.platform === data.platform &&
                (!editingEntry || c.id !== editingEntry.id)
            );

            if (existingEntry) {
                // Merge with existing entry
                data.quantity = (existingEntry.quantity || 0) + (data.quantity || 0);
                data.invested = (existingEntry.invested || 0) + (data.invested || 0);
                data.fees = (existingEntry.fees || 0) + (data.fees || 0);
                data.gst = (existingEntry.gst || 0) + (data.gst || 0);
                data.current = (existingEntry.current || 0) + (data.current || 0);

                // Calculate new P&L
                const pl = data.current - data.invested;
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;

                // KEEP THE EXISTING ID
                data.id = existingEntry.id;
            } else {
                // New entry - calculate P&L
                const pl = (data.current || 0) - (data.invested || 0);
                data.pl = pl;
                data.plPercent = data.invested > 0 ? ((pl / data.invested) * 100).toFixed(2) : 0;
            }
        }

        if (editingEntry) {
            data.id = editingEntry.id;
        }

        await saveData(type, data);
        closeModal();
        switchTab(currentTab);

    } catch (error) {
        console.error('Error saving data:', error);
        alert('Failed to save data');
    }
}


// Settings Function - NEW IMPLEMENTATION
async function showSettings() {
    const settings = await getSettings();

    const formHTML = `
        <div class="form-group">
            <label class="form-label">Currency</label>
            <input type="text" id="settings-currency" class="form-control" value="${settings.currency}" readonly>
            <small class="text-muted">Currently only INR is supported</small>
        </div>
        <div class="form-group">
            <label class="form-label">Net Worth Goal (₹)</label>
            <input type="number" id="settings-goal" class="form-control" value="${settings.goal}" step="100000">
        </div>
        <div class="form-group">
            <label class="form-label">EPF Balance (₹)</label>
            <input type="number" id="settings-epf" class="form-control" value="${settings.epf}" step="1000">
            <small class="text-muted">Your Employees' Provident Fund balance</small>
        </div>
        <div class="form-group">
            <label class="form-label">PPF Balance (₹)</label>
            <input type="number" id="settings-ppf" class="form-control" value="${settings.ppf}" step="1000">
            <small class="text-muted">Your Public Provident Fund balance</small>
        </div>
    `;

    document.getElementById('modalTitle').textContent = 'App Settings';
    document.getElementById('modalBody').innerHTML = formHTML;
    document.getElementById('modal').classList.add('active');

    // Override save function for settings
    window.tempSaveFunction = async function () {
        try {
            const newSettings = {
                id: 1,
                currency: document.getElementById('settings-currency').value,
                goal: parseFloat(document.getElementById('settings-goal').value) || 0,
                epf: parseFloat(document.getElementById('settings-epf').value) || 0,
                ppf: parseFloat(document.getElementById('settings-ppf').value) || 0,
                theme: settings.theme,
                lastSync: new Date().toISOString()
            };

            await saveData('settings', newSettings);
            closeModal();
            await renderDashboard();
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        }
    };
}

// ==================== IMPORT/EXPORT FUNCTIONALITY ====================

// Export Data to JSON File
async function exportData() {
    try {
        // Show loading message
        const originalContent = document.body.innerHTML;

        // Collect all data from IndexedDB
        const allData = {
            version: 1,
            exportDate: new Date().toISOString(),
            appName: 'Personal Finance Manager',
            settings: await getData('settings'),
            savings: await getData('savings'),
            fixedDeposits: await getData('fixedDeposits'),
            mutualFunds: await getData('mutualFunds'),
            stocks: await getData('stocks'),
            crypto: await getData('crypto'),
            liabilities: await getData('liabilities'),
            transactions: await getData('transactions'),
            budgets: await getData('budgets')
        };

        // Calculate statistics for summary
        const stats = {
            totalRecords: 0,
            savings: allData.savings.length,
            fixedDeposits: allData.fixedDeposits.length,
            mutualFunds: allData.mutualFunds.length,
            stocks: allData.stocks.length,
            crypto: allData.crypto.length,
            liabilities: allData.liabilities.length,
            transactions: allData.transactions.length,
            budgets: allData.budgets.length
        };

        stats.totalRecords = Object.values(stats).reduce((a, b) => a + b, 0) - stats.totalRecords;
        allData.stats = stats;

        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(allData, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `finance-backup-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show success message
        alert(`✅ Data exported successfully!\n\nFile: ${filename}\nTotal Records: ${stats.totalRecords}\n\nCheck your downloads folder.`);

    } catch (error) {
        console.error('Error exporting data:', error);
        alert('❌ Failed to export data. Please try again.\n\nError: ' + error.message);
    }
}

// Import Data from JSON File
function importData() {
    // Create modal for import
    const modalHTML = `
        <div style="text-align: center;">
            <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                Select a backup file to restore your data.
            </p>
            <div style="padding: 2rem; background: var(--bg-primary); border-radius: 0.5rem; margin-bottom: 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
                <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                    Choose Backup File
                </button>
                <input type="file" id="fileInput" accept=".json" style="display: none;">
            </div>
            <div style="padding: 1rem; background: #fff3cd; border-radius: 0.5rem; border-left: 4px solid #ffc107;">
                <strong style="color: #856404;">⚠️ Warning:</strong>
                <p style="margin: 0.5rem 0 0 0; color: #856404; font-size: 0.9rem;">
                    Importing will replace all your current data. Make sure to export a backup first!
                </p>
            </div>
        </div>
    `;

    document.getElementById('modalTitle').textContent = 'Import Data';
    document.getElementById('modalBody').innerHTML = modalHTML;
    document.getElementById('modal').classList.add('active');

    // Hide save button, show close only
    const modalFooter = document.querySelector('.modal-footer');
    modalFooter.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>';

    // Handle file selection
    document.getElementById('fileInput').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Show processing message
            document.getElementById('modalBody').innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                    <p>Processing backup file...</p>
                </div>
            `;

            // Read file
            const text = await file.text();
            const importedData = JSON.parse(text);

            // Validate data structure
            if (!importedData.version || !importedData.exportDate) {
                throw new Error('Invalid backup file format. Please select a valid backup file.');
            }

            // Show preview
            const previewHTML = `
                <div style="text-align: left;">
                    <h4 style="margin-bottom: 1rem;">Backup File Preview</h4>
                    <div style="background: var(--bg-primary); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <p><strong>Export Date:</strong> ${formatDate(importedData.exportDate)}</p>
                        <p><strong>App Version:</strong> ${importedData.version}</p>
                        <p><strong>Total Records:</strong> ${importedData.stats?.totalRecords || 'N/A'}</p>
                    </div>
                    <h4 style="margin: 1.5rem 0 1rem 0;">Data Summary</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                        <div>📊 Savings: ${importedData.savings?.length || 0}</div>
                        <div>🏦 Fixed Deposits: ${importedData.fixedDeposits?.length || 0}</div>
                        <div>📈 Mutual Funds: ${importedData.mutualFunds?.length || 0}</div>
                        <div>📊 Stocks: ${importedData.stocks?.length || 0}</div>
                        <div>₿ Crypto: ${importedData.crypto?.length || 0}</div>
                        <div>📉 Liabilities: ${importedData.liabilities?.length || 0}</div>
                        <div>💸 Transactions: ${importedData.transactions?.length || 0}</div>
                    </div>
                    <div style="padding: 1rem; background: #f8d7da; border-radius: 0.5rem; border-left: 4px solid #dc3545; margin-top: 1.5rem;">
                        <strong style="color: #721c24;">⚠️ Final Warning:</strong>
                        <p style="margin: 0.5rem 0 0 0; color: #721c24; font-size: 0.9rem;">
                            This will permanently delete all current data and replace it with the backup data shown above.
                        </p>
                    </div>
                </div>
            `;

            document.getElementById('modalBody').innerHTML = previewHTML;
            modalFooter.innerHTML = `
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-danger" onclick="confirmImport()">Import & Replace All Data</button>
            `;

            // Store data temporarily for import
            window.tempImportData = importedData;

        } catch (error) {
            console.error('Error reading file:', error);
            document.getElementById('modalBody').innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--danger);">❌</div>
                    <p style="color: var(--danger); font-weight: 600;">Failed to read backup file</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                </div>
            `;
            modalFooter.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
        }
    };
}

// Confirm and execute import
async function confirmImport() {
    if (!window.tempImportData) {
        alert('No data to import');
        return;
    }

    try {
        document.getElementById('modalBody').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                <p>Importing data... Please wait.</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Do not close this window.</p>
            </div>
        `;
        document.querySelector('.modal-footer').innerHTML = '';

        const importedData = window.tempImportData;

        // Clear existing data and import new data
        const stores = ['settings', 'savings', 'fixedDeposits', 'mutualFunds', 'stocks',
            'crypto', 'liabilities', 'transactions', 'budgets'];

        for (const store of stores) {
            // Clear existing data
            const existingData = await getData(store);
            for (const item of existingData) {
                await deleteData(store, item.id);
            }

            // Import new data
            if (importedData[store] && Array.isArray(importedData[store])) {
                for (const item of importedData[store]) {
                    await saveData(store, item);
                }
            }
        }

        // Clean up
        delete window.tempImportData;

        // Show success and reload
        document.getElementById('modalBody').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--accent-secondary);">✅</div>
                <p style="color: var(--accent-secondary); font-weight: 600;">Data imported successfully!</p>
                <p style="color: var(--text-secondary);">The page will reload in 2 seconds...</p>
            </div>
        `;

        setTimeout(() => {
            location.reload();
        }, 2000);

    } catch (error) {
        console.error('Error importing data:', error);
        document.getElementById('modalBody').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--danger);">❌</div>
                <p style="color: var(--danger); font-weight: 600;">Import failed</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
            </div>
        `;
        document.querySelector('.modal-footer').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
        delete window.tempImportData;
    }
}

async function initApp() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        await initDB();

        const settings = await getData('settings');
        if (settings.length === 0) {
            await saveData('settings', INITIAL_DATA.settings);

            for (const saving of INITIAL_DATA.savings) {
                await saveData('savings', saving);
            }

            for (const fd of INITIAL_DATA.fixedDeposits) {
                await saveData('fixedDeposits', fd);
            }

            for (const budget of INITIAL_DATA.budgets) {
                await saveData('budgets', budget);
            }
        }

        await renderDashboard();

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to initialize app. Please refresh the page.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
