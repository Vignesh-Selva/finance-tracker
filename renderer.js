class UIRenderer {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    async renderDashboard() {
        try {
            const netWorthTotals = await Calculator.calculateNetWorthTotals(this.dbManager);
            const settings = await Utilities.getSettings(this.dbManager);

            const netWorth = netWorthTotals.total;
            const goal = settings.goal;
            const progress = Math.min((netWorth / goal * 100), 100).toFixed(2);
            const changePercent = '+12.5';

            // Total assets (exclude liabilities explicitly)
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

            // Mutual funds P/L
            const mutualFunds = await this.dbManager.getAll('mutualFunds');
            const mfInvested = mutualFunds.reduce((s, i) => s + (i.invested || 0), 0);
            const mfCurrent = mutualFunds.reduce((s, i) => s + (i.current || 0), 0);
            const mutualFundsTotalPL = mfCurrent - mfInvested;
            const mutualFundsTotalPLPercent =
                mfInvested > 0 ? ((mutualFundsTotalPL / mfInvested) * 100).toFixed(2) : 0;

            // Stocks P/L
            const stocks = await this.dbManager.getAll('stocks');
            const stocksInvested = stocks.reduce((s, i) => s + (i.invested || 0), 0);
            const stocksCurrent = stocks.reduce((s, i) => s + (i.current || 0), 0);
            const stocksTotalPL = stocksCurrent - stocksInvested;
            const stocksTotalPLPercent =
                stocksInvested > 0 ? ((stocksTotalPL / stocksInvested) * 100).toFixed(2) : 0;

            // Crypto P/L
            const crypto = await this.dbManager.getAll('crypto');
            const cryptoInvested = crypto.reduce((s, i) => s + (i.invested || 0), 0);
            const cryptoCurrent = crypto.reduce((s, i) => s + (i.current || 0), 0);
            const cryptoTotalPL = cryptoCurrent - cryptoInvested;
            const cryptoTotalPLPercent =
                cryptoInvested > 0 ? ((cryptoTotalPL / cryptoInvested) * 100).toFixed(2) : 0;

            // Calculate overall investment P/L (weighted average)
            const totalInvested = mfInvested + stocksInvested + cryptoInvested;
            const totalCurrentValue = mfCurrent + stocksCurrent + cryptoCurrent;
            const totalPL = totalCurrentValue - totalInvested;
            const overallInvestmentPLPercent = totalInvested > 0
                ? ((totalPL / totalInvested) * 100).toFixed(2)
                : '0.00';

            // Allocation bar
            let allocationHTML = '<div class="allocation-bar">';
            assetData.forEach(a => {
                const pct = totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : 0;
                allocationHTML += `
                    <div class="allocation-segment"
                        style="width:${pct}%;background:${a.color}"
                        title="${a.name}: ${pct}%"></div>`;
            });
            allocationHTML += '</div>';

            // Allocation legend
            let legendHTML = '<div class="allocation-legend">';
            assetData.forEach(a => {
                const pct = totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : 0;
                legendHTML += `
                    <div class="legend-item">
                        <span class="legend-color" style="background:${a.color}"></span>
                        <span class="legend-label">${a.name}</span>
                        <span class="legend-value">${pct}%</span>
                    </div>`;
            });
            legendHTML += '</div>';

            const html = `
                <div class="section-header"><h2>Dashboard</h2></div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Net Worth</h3>
                        <p class="stat-value">${Utilities.formatCurrency(netWorth)}</p>
                        <p class="stat-change positive">${changePercent}% this month</p>
                    </div>
                    <div class="stat-card">
                        <h3>Investments</h3>
                        <p class="stat-value">
                            ${Utilities.formatCurrency(
                netWorthTotals.mutualFunds +
                netWorthTotals.stocks +
                netWorthTotals.crypto
            )}
                        </p>
                    </div>
                    <div class="stat-card">
                        <h3>EPF & PPF</h3>
                        <p class="stat-value">
                            ${Utilities.formatCurrency(netWorthTotals.epf + netWorthTotals.ppf)}
                        </p>
                    </div>
                    <div class="stat-card">
                        <h3>Liabilities</h3>
                        <p class="stat-value">
                            ${Utilities.formatCurrency(netWorthTotals.liabilities)}
                        </p>
                    </div>
                    <div class="stat-card">
                        <h3>Goal Progress</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${progress}%"></div>
                        </div>
                        <p>${progress}% of ${Utilities.formatCurrency(goal)}</p>
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
                            <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">
                                ${Utilities.formatCurrency(totalPL)}
                            </p>
                            <p class="stat-change">${overallInvestmentPLPercent}%</p>
                        </div>
                        <div class="stat-card">
                            <h3>Mutual Funds P/L</h3>
                            <p class="stat-value ${mutualFundsTotalPL >= 0 ? 'positive' : 'negative'}">
                                ${Utilities.formatCurrency(mutualFundsTotalPL)}
                            </p>
                            <p class="stat-change">${mutualFundsTotalPLPercent}%</p>
                        </div>
                        <div class="stat-card">
                            <h3>Stocks & ETF P/L</h3>
                            <p class="stat-value ${stocksTotalPL >= 0 ? 'positive' : 'negative'}">
                                ${Utilities.formatCurrency(stocksTotalPL)}
                            </p>
                            <p class="stat-change">${stocksTotalPLPercent}%</p>
                        </div>
                        <div class="stat-card">
                            <h3>Crypto P/L</h3>
                            <p class="stat-value ${cryptoTotalPL >= 0 ? 'positive' : 'negative'}">
                                ${Utilities.formatCurrency(cryptoTotalPL)}
                            </p>
                            <p class="stat-change">${cryptoTotalPLPercent}%</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('content-dashboard').innerHTML = html;
        } catch (e) {
            console.error('Dashboard render error:', e);
            Utilities.showNotification('Failed to render dashboard', 'error');
        }
    }


    async renderExpenses() {
        try {
            const transactions = await this.dbManager.getAll('transactions');
            const expenseTotals = await Calculator.calculateExpenseTotals(this.dbManager);

            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const monthlyTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            }).sort((a, b) => new Date(b.date) - new Date(a.date));

            let html = `
                <div class="section-header">
                    <h2>Monthly Expenses</h2>
                    <button class="btn btn-primary" onclick="app.showAddTransactionForm()">➕ Add Transaction</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Income</h3>
                        <p class="stat-value positive">${Utilities.formatCurrency(expenseTotals.income)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Expenses</h3>
                        <p class="stat-value negative">${Utilities.formatCurrency(expenseTotals.expenses)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Balance</h3>
                        <p class="stat-value ${expenseTotals.balance >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(expenseTotals.balance)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Transactions</h3>
                        <p class="stat-value">${expenseTotals.transactionCount}</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
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
                        <tbody>
            `;

            if (monthlyTransactions.length === 0) {
                html += '<tr><td colspan="6" style="text-align: center;">No transactions yet</td></tr>';
            } else {
                monthlyTransactions.forEach(t => {
                    html += `
                        <tr>
                            <td>${Utilities.formatDate(t.date)}</td>
                            <td><span class="badge badge-${t.type}">${t.type}</span></td>
                            <td>${t.category}</td>
                            <td>${t.description || '-'}</td>
                            <td class="${t.type === 'income' ? 'positive' : 'negative'}">${Utilities.formatCurrency(t.amount)}</td>
                            <td>
                                <button class="btn-icon" onclick="app.editTransaction(${t.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteTransaction(${t.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-expenses').innerHTML = html;
        } catch (error) {
            console.error('Expenses render error:', error);
            Utilities.showNotification('Failed to render expenses', 'error');
        }
    }

    async renderSavings() {
        try {
            const savings = await this.dbManager.getAll('savings');
            const total = savings.reduce((sum, item) => sum + (item.balance || 0), 0);

            let html = `
                <div class="section-header">
                    <h2>Savings Accounts</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('savings')">➕ Add Account</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Savings</h3>
                        <p class="stat-value">${Utilities.formatCurrency(total)}</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Bank Name</th>
                                <th>Account Type</th>
                                <th>Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (savings.length === 0) {
                html += '<tr><td colspan="4" style="text-align: center;">No savings accounts yet</td></tr>';
            } else {
                savings.forEach(s => {
                    html += `
                        <tr>
                            <td>${s.bankName || ''}</td>
                            <td>${s.accountType || ''}</td>
                            <td>${Utilities.formatCurrency(s.balance || 0)}</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('savings', ${s.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('savings', ${s.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-savings').innerHTML = html;
        } catch (error) {
            console.error('Savings render error:', error);
            Utilities.showNotification('Failed to render savings', 'error');
        }
    }

    async renderFixedDeposits() {
        try {
            const fixedDeposits = await this.dbManager.getAll('fixedDeposits');
            const totals = {
                invested: fixedDeposits.reduce((sum, item) => sum + (item.invested || 0), 0),
                maturity: fixedDeposits.reduce((sum, item) => sum + (item.maturity || 0), 0)
            };

            let html = `
                <div class="section-header">
                    <h2>Fixed Deposits</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('fixedDeposits')">➕ Add FD</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Invested</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Maturity Value</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.maturity)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Expected Gain</h3>
                        <p class="stat-value positive">${Utilities.formatCurrency(totals.maturity - totals.invested)}</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Bank Name</th>
                                <th>Invested</th>
                                <th>Maturity</th>
                                <th>Interest Rate</th>
                                <th>Maturity Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (fixedDeposits.length === 0) {
                html += '<tr><td colspan="6" style="text-align: center;">No fixed deposits yet</td></tr>';
            } else {
                fixedDeposits.forEach(fd => {
                    html += `
                        <tr>
                            <td>${fd.bankName || ''}</td>
                            <td>${Utilities.formatCurrency(fd.invested || 0)}</td>
                            <td>${Utilities.formatCurrency(fd.maturity || 0)}</td>
                            <td>${fd.interestRate || 0}%</td>
                            <td>${Utilities.formatDate(fd.maturityDate)}</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('fixedDeposits', ${fd.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('fixedDeposits', ${fd.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-fixedDeposits').innerHTML = html;
        } catch (error) {
            console.error('Fixed deposits render error:', error);
            Utilities.showNotification('Failed to render fixed deposits', 'error');
        }
    }

    async renderMutualFunds() {
        try {
            const mutualFunds = await this.dbManager.getAll('mutualFunds');
            const totals = {
                invested: mutualFunds.reduce((sum, item) => sum + (item.invested || 0), 0),
                current: mutualFunds.reduce((sum, item) => sum + (item.current || 0), 0)
            };

            const totalPL = totals.current - totals.invested;
            const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

            let html = `
                <div class="section-header">
                    <h2>Mutual Funds</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('mutualFunds')">➕ Add Fund</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Invested</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Current Value</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.current)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total P/L</h3>
                        <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)}</p>
                        <p class="stat-change">${totalPLPercent}%</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fund Name</th>
                                <th>Type</th>
                                <th>Invested</th>
                                <th>Current</th>
                                <th>P/L</th>
                                <th>P/L %</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (mutualFunds.length === 0) {
                html += '<tr><td colspan="7" style="text-align: center;">No mutual funds yet</td></tr>';
            } else {
                mutualFunds.forEach(mf => {
                    const plData = Utilities.calculatePL(mf.invested || 0, mf.current || 0);
                    html += `
                        <tr>
                            <td>${mf.fundName || ''}</td>
                            <td>${mf.type || ''}</td>
                            <td>${Utilities.formatCurrency(mf.invested || 0)}</td>
                            <td>${Utilities.formatCurrency(mf.current || 0)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('mutualFunds', ${mf.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('mutualFunds', ${mf.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-mutualFunds').innerHTML = html;
        } catch (error) {
            console.error('Mutual funds render error:', error);
            Utilities.showNotification('Failed to render mutual funds', 'error');
        }
    }

    async renderStocks() {
        try {
            const stocks = await this.dbManager.getAll('stocks');
            const totals = {
                invested: stocks.reduce((sum, item) => sum + (item.invested || 0), 0),
                current: stocks.reduce((sum, item) => sum + (item.current || 0), 0)
            };

            const totalPL = totals.current - totals.invested;
            const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

            let html = `
                <div class="section-header">
                    <h2>Stocks</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('stocks')">➕ Add Stock</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Invested</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Current Value</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.current)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total P/L</h3>
                        <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)}</p>
                        <p class="stat-change">${totalPLPercent}%</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Stock Name</th>
                                <th>Ticker</th>
                                <th>Quantity</th>
                                <th>Invested</th>
                                <th>Current</th>
                                <th>P/L</th>
                                <th>P/L %</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (stocks.length === 0) {
                html += '<tr><td colspan="8" style="text-align: center;">No stocks yet</td></tr>';
            } else {
                stocks.forEach(stock => {
                    const plData = Utilities.calculatePL(stock.invested || 0, stock.current || 0);
                    html += `
                        <tr>
                            <td>${stock.stockName || ''}</td>
                            <td>${stock.ticker || ''}</td>
                            <td>${stock.quantity || 0}</td>
                            <td>${Utilities.formatCurrency(stock.invested || 0)}</td>
                            <td>${Utilities.formatCurrency(stock.current || 0)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('stocks', ${stock.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('stocks', ${stock.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-stocks').innerHTML = html;
        } catch (error) {
            console.error('Stocks render error:', error);
            Utilities.showNotification('Failed to render stocks', 'error');
        }
    }

    async renderCrypto() {
        try {
            const crypto = await this.dbManager.getAll('crypto');
            const totals = {
                invested: crypto.reduce((sum, item) => sum + (item.invested || 0), 0),
                current: crypto.reduce((sum, item) => sum + (item.current || 0), 0)
            };

            const totalPL = totals.current - totals.invested;
            const totalPLPercent = totals.invested > 0 ? ((totalPL / totals.invested) * 100).toFixed(2) : 0;

            let html = `
                <div class="section-header">
                    <h2>Cryptocurrency</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('crypto')">➕ Add Crypto</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Invested</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.invested)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Current Value</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.current)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total P/L</h3>
                        <p class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(totalPL)}</p>
                        <p class="stat-change">${totalPLPercent}%</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Coin Name</th>
                                <th>Platform</th>
                                <th>Quantity</th>
                                <th>Invested</th>
                                <th>Current</th>
                                <th>P/L</th>
                                <th>P/L %</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (crypto.length === 0) {
                html += '<tr><td colspan="8" style="text-align: center;">No crypto holdings yet</td></tr>';
            } else {
                crypto.forEach(c => {
                    const plData = Utilities.calculatePL(c.invested || 0, c.current || 0);
                    html += `
                        <tr>
                            <td>${c.coinName || ''}</td>
                            <td>${c.platform || ''}</td>
                            <td>${c.quantity || 0}</td>
                            <td>${Utilities.formatCurrency(c.invested || 0)}</td>
                            <td>${Utilities.formatCurrency(c.current || 0)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${Utilities.formatCurrency(plData.pl)}</td>
                            <td class="${plData.pl >= 0 ? 'positive' : 'negative'}">${plData.plPercent}%</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('crypto', ${c.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('crypto', ${c.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-crypto').innerHTML = html;
        } catch (error) {
            console.error('Crypto render error:', error);
            Utilities.showNotification('Failed to render crypto', 'error');
        }
    }

    async renderLiabilities() {
        try {
            const liabilities = await this.dbManager.getAll('liabilities');
            const totals = {
                loanAmount: liabilities.reduce((sum, item) => sum + (item.loanAmount || 0), 0),
                outstanding: liabilities.reduce((sum, item) => sum + (item.outstanding || 0), 0)
            };

            const totalPaid = totals.loanAmount - totals.outstanding;

            let html = `
                <div class="section-header">
                    <h2>Liabilities</h2>
                    <button class="btn btn-primary" onclick="app.showAddForm('liabilities')">➕ Add Liability</button>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Total Outstanding</h3>
                        <p class="stat-value negative">${Utilities.formatCurrency(totals.outstanding)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Original Amount</h3>
                        <p class="stat-value">${Utilities.formatCurrency(totals.loanAmount)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Amount Paid</h3>
                        <p class="stat-value positive">${Utilities.formatCurrency(totalPaid)}</p>
                    </div>
                </div>

                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Lender</th>
                                <th>Original Amount</th>
                                <th>Outstanding</th>
                                <th>Interest Rate</th>
                                <th>EMI</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (liabilities.length === 0) {
                html += '<tr><td colspan="7" style="text-align: center;">No liabilities yet</td></tr>';
            } else {
                liabilities.forEach(l => {
                    html += `
                        <tr>
                            <td>${l.type || ''}</td>
                            <td>${l.lender || ''}</td>
                            <td>${Utilities.formatCurrency(l.loanAmount || 0)}</td>
                            <td>${Utilities.formatCurrency(l.outstanding || 0)}</td>
                            <td>${l.interestRate || 0}%</td>
                            <td>${l.emi ? Utilities.formatCurrency(l.emi) : 'N/A'}</td>
                            <td>
                                <button class="btn-icon" onclick="app.editEntry('liabilities', ${l.id})" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="app.deleteEntry('liabilities', ${l.id})" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `;
                });
            }

            html += '</tbody></table></div>';

            document.getElementById('content-liabilities').innerHTML = html;
        } catch (error) {
            console.error('Liabilities render error:', error);
            Utilities.showNotification('Failed to render liabilities', 'error');
        }
    }
}