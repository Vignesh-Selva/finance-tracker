export const INITIAL_DATA = {
    savings: [],
    fixedDeposits: [],
    mutualFunds: [],
    stocks: [],
    crypto: [],
    liabilities: [],
    transactions: [],
    budgets: [],
    settings: {
        id: 1,
        currency: 'INR',
        goal: 15000000,
        epf: 0,
        ppf: 0,
        theme: 'light',
        lastSync: new Date().toISOString()
    }
};

export default INITIAL_DATA;
