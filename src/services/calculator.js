import Utilities from '../utils/utils.js';



export class Calculator {



    static async calculateNetWorthTotals(dbManager) {

        try {

            const savings = await dbManager.getAll('savings');

            const fixedDeposits = await dbManager.getAll('fixedDeposits');

            const mutualFunds = await dbManager.getAll('mutualFunds');

            const stocks = await dbManager.getAll('stocks');

            const crypto = await dbManager.getAll('crypto');

            const liabilities = await dbManager.getAll('liabilities');

            const settings = await Utilities.getSettings(dbManager);



            // Safely calculate totals with fallback to 0

            const savingsTotal = savings.reduce((sum, item) => {

                const value = parseFloat(item.balance) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const fixedDepositsTotal = fixedDeposits.reduce((sum, item) => {

                const value = parseFloat(item.invested) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const mutualFundsTotal = mutualFunds.reduce((sum, item) => {

                const value = parseFloat(item.current) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const stocksTotal = stocks.reduce((sum, item) => {

                const value = parseFloat(item.current) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const cryptoTotal = crypto.reduce((sum, item) => {

                const value = parseFloat(item.current) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const liabilitiesTotal = liabilities.reduce((sum, item) => {

                const value = parseFloat(item.outstanding) || 0;

                return sum + (isNaN(value) ? 0 : value);

            }, 0);



            const epf = parseFloat(settings.epf) || 0;

            const ppf = parseFloat(settings.ppf) || 0;



            const total = savingsTotal + fixedDepositsTotal + mutualFundsTotal +

                stocksTotal + cryptoTotal + epf + ppf - liabilitiesTotal;



            return {

                savings: savingsTotal,

                fixedDeposits: fixedDepositsTotal,

                mutualFunds: mutualFundsTotal,

                stocks: stocksTotal,

                crypto: cryptoTotal,

                liabilities: liabilitiesTotal,

                epf: epf,

                ppf: ppf,

                total: total

            };

        } catch (error) {

            console.error('Net worth calculation error:', error);

            Utilities.showNotification('Failed to calculate net worth totals', 'error');

            return {

                savings: 0,

                fixedDeposits: 0,

                mutualFunds: 0,

                stocks: 0,

                crypto: 0,

                liabilities: 0,

                epf: 0,

                ppf: 0,

                total: 0

            };

        }

    }



    static async calculateExpenseTotals(dbManager) {

        try {

            const transactions = await dbManager.getAll('transactions');

            const currentMonth = new Date().getMonth();

            const currentYear = new Date().getFullYear();



            const monthlyTransactions = transactions.filter(t => {

                try {

                    const tDate = new Date(t.date);

                    return !isNaN(tDate.getTime()) &&

                        tDate.getMonth() === currentMonth &&

                        tDate.getFullYear() === currentYear;

                } catch (e) {

                    console.warn('Invalid transaction date:', t.date);

                    return false;

                }

            });



            const totalIncome = monthlyTransactions

                .filter(t => t.type === 'income')

                .reduce((sum, t) => {

                    const amount = parseFloat(t.amount) || 0;

                    return sum + (isNaN(amount) ? 0 : amount);

                }, 0);



            const totalExpenses = monthlyTransactions

                .filter(t => t.type === 'expense')

                .reduce((sum, t) => {

                    const amount = parseFloat(t.amount) || 0;

                    return sum + (isNaN(amount) ? 0 : amount);

                }, 0);



            return {

                income: totalIncome,

                expenses: totalExpenses,

                balance: totalIncome - totalExpenses,

                transactionCount: monthlyTransactions.length

            };

        } catch (error) {

            console.error('Expense totals calculation error:', error);

            Utilities.showNotification('Failed to calculate expense totals', 'error');

            return {

                income: 0,

                expenses: 0,

                balance: 0,

                transactionCount: 0

            };

        }

    }



    static calculateCategoryExpenses(transactions) {

        try {

            const categoryTotals = {};



            transactions

                .filter(t => t.type === 'expense')

                .forEach(t => {

                    const category = t.category || 'Uncategorized';

                    const amount = parseFloat(t.amount) || 0;



                    if (!isNaN(amount)) {

                        categoryTotals[category] = (categoryTotals[category] || 0) + amount;

                    }

                });



            return categoryTotals;

        } catch (error) {

            console.error('Category expenses calculation error:', error);

            return {};

        }

    }



    /**

     * Calculate compound annual growth rate (CAGR)

     * @param {number} initialValue - Starting value

     * @param {number} finalValue - Ending value

     * @param {number} years - Number of years

     * @returns {number} CAGR percentage

     */

    static calculateCAGR(initialValue, finalValue, years) {

        if (!initialValue || initialValue <= 0 || !finalValue || finalValue <= 0 || !years || years <= 0) {

            return 0;

        }



        try {

            const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;

            return isNaN(cagr) || !isFinite(cagr) ? 0 : cagr;

        } catch (error) {

            console.error('CAGR calculation error:', error);

            return 0;

        }

    }



    /**

     * Calculate Expected Maturity for Fixed Deposit

     * @param {number} principal - Principal amount

     * @param {number} rate - Annual interest rate (as percentage)

     * @param {number} years - Number of years

     * @param {number} compoundingFrequency - Times compounded per year (default: 4 for quarterly)

     * @returns {number} Maturity amount

     */

    static calculateFDMaturity(principal, rate, years, compoundingFrequency = 4) {

        if (!principal || principal <= 0 || !rate || rate < 0 || !years || years <= 0) {

            return principal || 0;

        }



        try {

            const r = rate / 100;

            const n = compoundingFrequency;

            const maturity = principal * Math.pow((1 + r / n), n * years);



            return isNaN(maturity) || !isFinite(maturity) ? principal : maturity;

        } catch (error) {

            console.error('FD maturity calculation error:', error);

            return principal || 0;

        }

    }

}