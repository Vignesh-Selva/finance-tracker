class Calculator {
    static async calculateNetWorthTotals(dbManager) {
        try {
            const savings = await dbManager.getAll('savings');
            const fixedDeposits = await dbManager.getAll('fixedDeposits');
            const mutualFunds = await dbManager.getAll('mutualFunds');
            const stocks = await dbManager.getAll('stocks');
            const crypto = await dbManager.getAll('crypto');
            const liabilities = await dbManager.getAll('liabilities');
            const settings = await Utilities.getSettings(dbManager);

            const savingsTotal = savings.reduce((sum, item) => sum + (item.balance || 0), 0);
            const fixedDepositsTotal = fixedDeposits.reduce((sum, item) => sum + (item.invested || 0), 0);
            const mutualFundsTotal = mutualFunds.reduce((sum, item) => sum + (item.current || 0), 0);
            const stocksTotal = stocks.reduce((sum, item) => sum + (item.current || 0), 0);
            const cryptoTotal = crypto.reduce((sum, item) => sum + (item.current || 0), 0);
            const liabilitiesTotal = liabilities.reduce((sum, item) => sum + (item.outstanding || 0), 0);

            const epf = settings.epf || 0;
            const ppf = settings.ppf || 0;

            return {
                savings: savingsTotal,
                fixedDeposits: fixedDepositsTotal,
                mutualFunds: mutualFundsTotal,
                stocks: stocksTotal,
                crypto: cryptoTotal,
                liabilities: liabilitiesTotal,
                epf: epf,
                ppf: ppf,
                total: savingsTotal + fixedDepositsTotal + mutualFundsTotal + stocksTotal + cryptoTotal + epf + ppf - liabilitiesTotal
            };
        } catch (error) {
            Utilities.showNotification('Failed to calculate net worth totals', 'error');
            return {
                savings: 0, fixedDeposits: 0, mutualFunds: 0, stocks: 0, crypto: 0,
                liabilities: 0, epf: 0, ppf: 0, total: 0
            };
        }
    }

    static async calculateExpenseTotals(dbManager) {
        try {
            const transactions = await dbManager.getAll('transactions');
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const monthlyTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            });

            const totalIncome = monthlyTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalExpenses = monthlyTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                income: totalIncome,
                expenses: totalExpenses,
                balance: totalIncome - totalExpenses,
                transactionCount: monthlyTransactions.length
            };
        } catch (error) {
            Utilities.showNotification('Failed to calculate expense totals', 'error');
            return { income: 0, expenses: 0, balance: 0, transactionCount: 0 };
        }
    }

    static calculateCategoryExpenses(transactions) {
        const categoryTotals = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });
        return categoryTotals;
    }
}