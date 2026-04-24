/**
 * API client service — single source of truth for all data access.
 * Uses Supabase as the backend (PostgreSQL via REST).
 * Maintains the same interface so the rest of the app works unchanged.
 */

import { supabase } from './supabaseClient.js';
import { getSession } from './authService.js';

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper: throw ApiError from a Supabase error response.
 */
function handleError(error) {
  if (error) {
    throw new ApiError(error.message || 'Database error', error.code || 500, error.details);
  }
}

// ─── Generic CRUD factory for Supabase tables ────────────

function createResourceApi(tableName) {
  return {
    list: async (portfolioId) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false });
      handleError(error);
      return { data, count: data.length };
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      handleError(error);
      return { data };
    },

    create: async (body) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(body)
        .select()
        .single();
      handleError(error);
      return { data };
    },

    update: async (id, body) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(body)
        .eq('id', id)
        .select()
        .single();
      handleError(error);
      return { data };
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      handleError(error);
      return null;
    },
  };
}

// ─── Portfolios ──────────────────────────────────────────

export const portfolios = {
  list: async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false });
    handleError(error);
    return { data, count: data.length };
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .single();
    handleError(error);
    return { data };
  },

  create: async (body) => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) throw new ApiError('Not authenticated', 401);

    const { data, error } = await supabase
      .from('portfolios')
      .insert({ ...body, user_id: userId })
      .select()
      .single();
    handleError(error);

    // Auto-create default settings for the new portfolio
    await supabase.from('settings').insert({
      portfolio_id: data.id,
      currency: body.currency || 'INR',
      goal: 15000000,
      epf: 0,
      ppf: 0,
      theme: 'light',
    });

    return { data };
  },

  update: async (id, body) => {
    const { data, error } = await supabase
      .from('portfolios')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return { data };
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id);
    handleError(error);
    return null;
  },
};

// ─── Asset CRUD (same interface as before) ───────────────

export const savings = createResourceApi('savings');
export const fixedDeposits = createResourceApi('fixed_deposits');
export const mutualFunds = createResourceApi('mutual_funds');
export const stocks = createResourceApi('stocks');
export const crypto = createResourceApi('crypto');
export const liabilities = createResourceApi('liabilities');
export const creditCards = createResourceApi('credit_cards');
export const transactions = createResourceApi('transactions');
export const budgets = createResourceApi('budgets');
export const settings = createResourceApi('settings');
export const recurringTransactions = createResourceApi('recurring_transactions');

// ─── Order table API factory ──────────────────────────────

function createOrderApi(tableName, holdingIdField) {
  const base = createResourceApi(tableName);
  return {
    ...base,
    listByHolding: async (holdingId) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(holdingIdField, holdingId)
        .order('execution_date', { ascending: true });
      handleError(error);
      return { data, count: data.length };
    },
  };
}

export const mfOrders = createOrderApi('mf_orders', 'mf_id');
export const stockOrders = createOrderApi('stock_orders', 'stock_id');
export const cryptoOrders = createOrderApi('crypto_orders', 'crypto_id');

// ─── Dashboard & Analytics (computed client-side) ────────

export const dashboard = {
  get: async (portfolioId) => {
    // Fetch all data in parallel
    const [
      savingsRes, fdRes, mfRes, stocksRes, cryptoRes,
      liabilitiesRes, settingsRes, transactionsRes,
    ] = await Promise.all([
      savings.list(portfolioId),
      fixedDeposits.list(portfolioId),
      mutualFunds.list(portfolioId),
      stocks.list(portfolioId),
      crypto.list(portfolioId),
      liabilities.list(portfolioId),
      settings.list(portfolioId),
      transactions.list(portfolioId),
    ]);

    const s = savingsRes.data || [];
    const fd = fdRes.data || [];
    const mf = mfRes.data || [];
    const st = stocksRes.data || [];
    const cr = cryptoRes.data || [];
    const li = liabilitiesRes.data || [];
    const se = settingsRes.data?.[0] || { goal: 15000000, epf: 0, ppf: 0 };
    const tx = transactionsRes.data || [];

    const sum = (arr, field) => arr.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);

    const savingsTotal = sum(s, 'balance');
    const fdTotal = sum(fd, 'invested');
    const mfTotal = sum(mf, 'current');
    const stocksTotal = sum(st, 'current');
    const cryptoTotal = sum(cr, 'current');
    const liabilitiesTotal = sum(li, 'outstanding');
    const epf = parseFloat(se.epf) || 0;
    const ppf = parseFloat(se.ppf) || 0;

    const totalAssets = savingsTotal + fdTotal + mfTotal + stocksTotal + cryptoTotal + epf + ppf;
    const netWorth = {
      savings: savingsTotal,
      fixed_deposits: fdTotal,
      mutual_funds: mfTotal,
      stocks: stocksTotal,
      crypto: cryptoTotal,
      liabilities: liabilitiesTotal,
      epf,
      ppf,
      total: totalAssets - liabilitiesTotal,
    };

    // Allocation — dashboard.js expects: name, value, percentage, color
    const allocationColors = {
      'Savings': '#4CAF50',
      'Fixed Deposits': '#FF9800',
      'Mutual Funds': '#2196F3',
      'Stocks': '#9C27B0',
      'Crypto': '#F44336',
      'EPF': '#00BCD4',
      'PPF': '#795548',
    };
    const rawAllocation = [
      { name: 'Savings', value: savingsTotal },
      { name: 'Fixed Deposits', value: fdTotal },
      { name: 'Mutual Funds', value: mfTotal },
      { name: 'Stocks', value: stocksTotal },
      { name: 'Crypto', value: cryptoTotal },
      { name: 'EPF', value: epf },
      { name: 'PPF', value: ppf },
    ].filter((a) => a.value > 0);
    const allocationTotal = rawAllocation.reduce((s, a) => s + a.value, 0);
    const allocation = rawAllocation.map((a) => ({
      ...a,
      percentage: allocationTotal > 0 ? parseFloat(((a.value / allocationTotal) * 100).toFixed(1)) : 0,
      color: allocationColors[a.name] || '#999',
    }));

    // Investment P&L
    const mfInvested = sum(mf, 'invested');
    const stInvested = sum(st, 'invested');
    const crInvested = sum(cr, 'invested');
    const pct = (current, invested) => invested > 0 ? parseFloat(((current - invested) / invested * 100).toFixed(2)) : 0;
    const investmentPL = {
      total: {
        pl: (mfTotal + stocksTotal + cryptoTotal) - (mfInvested + stInvested + crInvested),
        plPercent: pct(mfTotal + stocksTotal + cryptoTotal, mfInvested + stInvested + crInvested),
      },
      mutualFunds: { pl: mfTotal - mfInvested, plPercent: pct(mfTotal, mfInvested) },
      stocks: { pl: stocksTotal - stInvested, plPercent: pct(stocksTotal, stInvested) },
      crypto: { pl: cryptoTotal - crInvested, plPercent: pct(cryptoTotal, crInvested) },
    };

    // Expense totals
    const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const expenses = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const expenseTotals = { income, expenses, balance: income - expenses, transactionCount: tx.length };

    // Category expenses
    const categoryExpenses = {};
    tx.filter((t) => t.type === 'expense').forEach((t) => {
      const cat = t.category || 'Other';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + (parseFloat(t.amount) || 0);
    });

    // Goal progress — dashboard expects progress as a percentage
    const goalTarget = parseFloat(se.goal) || 15000000;
    const goalCurrent = totalAssets - liabilitiesTotal;
    const goal = {
      target: goalTarget,
      current: goalCurrent,
      progress: goalTarget > 0 ? parseFloat(((goalCurrent / goalTarget) * 100).toFixed(1)) : 0,
    };

    return {
      data: { netWorth, allocation, investmentPL, expenseTotals, categoryExpenses, goal, settings: se },
    };
  },

  timeline: async (portfolioId, params = {}) => {
    let query = supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('snapshot_date', { ascending: true });

    if (params.startDate && params.endDate) {
      query = query.gte('snapshot_date', params.startDate).lte('snapshot_date', params.endDate);
    } else {
      query = query.limit(params.limit || 365);
    }

    const { data, error } = await query;
    handleError(error);
    return { data };
  },

  takeSnapshot: async (portfolioId) => {
    // Compute current snapshot client-side
    const dashData = await dashboard.get(portfolioId);
    const nw = dashData.data.netWorth;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('net_worth_snapshots')
      .upsert({
        portfolio_id: portfolioId,
        snapshot_date: today,
        total_assets: nw.total + nw.liabilities,
        total_liabilities: nw.liabilities,
        net_worth: nw.total,
        savings: nw.savings,
        fixed_deposits: nw.fixed_deposits,
        mutual_funds: nw.mutual_funds,
        stocks: nw.stocks,
        crypto: nw.crypto,
        epf: nw.epf,
        ppf: nw.ppf,
      }, { onConflict: 'portfolio_id,snapshot_date' })
      .select()
      .single();
    handleError(error);
    return { data };
  },

  fiProjection: async (portfolioId, params = {}) => {
    const dashData = await dashboard.get(portfolioId);
    const nw = dashData.data.netWorth;
    const se = dashData.data.settings;

    const currentNetWorth = nw.total;
    const goalTarget = parseFloat(se.goal) || 15000000;
    const annualReturn = parseFloat(params.annual_return) || 12;
    const monthlyContribution = parseFloat(params.monthly_contribution) || 0;
    const monthlyRate = annualReturn / 100 / 12;

    const projection = [];
    let balance = currentNetWorth;
    let yearsToGoal = null;

    for (let month = 0; month <= 360; month++) {
      if (month % 12 === 0) {
        projection.push({ year: Math.floor(month / 12), value: Math.round(balance) });
      }
      if (yearsToGoal === null && balance >= goalTarget) {
        yearsToGoal = parseFloat((month / 12).toFixed(1));
      }
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      if (balance > goalTarget * 3) break;
    }

    return {
      data: {
        currentNetWorth,
        goalTarget,
        annualReturn,
        monthlyContribution,
        projection,
        yearsToGoal,
      },
    };
  },

  healthScore: async (portfolioId) => {
    const [dashData, ccRes, txRes] = await Promise.all([
      dashboard.get(portfolioId),
      creditCards.list(portfolioId).catch(() => ({ data: [] })),
      transactions.list(portfolioId).catch(() => ({ data: [] })),
    ]);

    const { netWorth, allocation } = dashData.data;
    const cards = ccRes.data || [];
    const txs = txRes.data || [];

    const scores = {};

    // 1. Diversification (0-25): reward spreading across multiple asset classes
    const activeBuckets = allocation.filter(a => a.percentage >= 5).length;
    scores.diversification = Math.min(activeBuckets * 5, 25);

    // 2. Credit utilization (0-20): <10% = 20, <30% = 15, <50% = 10, <75% = 5, else 0
    const totalLimit = cards.reduce((s, c) => s + (parseFloat(c.credit_limit) || 0), 0);
    const totalOutstanding = cards.reduce((s, c) => s + Math.max(parseFloat(c.current_balance) || 0, parseFloat(c.statement_balance) || 0), 0);
    const utilPct = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;
    scores.creditUtil = cards.length === 0 ? 20 :
      utilPct < 10 ? 20 : utilPct < 30 ? 15 : utilPct < 50 ? 10 : utilPct < 75 ? 5 : 0;

    // 3. Emergency fund ratio (0-20): savings >= 3 months expenses = 20
    const now = new Date();
    const monthlyExpenses = txs
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const emergencyMonths = monthlyExpenses > 0 ? netWorth.savings / monthlyExpenses : (netWorth.savings > 0 ? 6 : 0);
    scores.emergencyFund = emergencyMonths >= 6 ? 20 : emergencyMonths >= 3 ? 15 : emergencyMonths >= 1 ? 8 : 0;

    // 4. Liability-to-asset ratio (0-20): <10% = 20, <25% = 15, <40% = 10, <60% = 5, else 0
    const totalAssets = netWorth.total + netWorth.liabilities;
    const liabRatio = totalAssets > 0 ? (netWorth.liabilities / totalAssets) * 100 : 0;
    scores.liabilityRatio = liabRatio < 10 ? 20 : liabRatio < 25 ? 15 : liabRatio < 40 ? 10 : liabRatio < 60 ? 5 : 0;

    // 5. Goal progress (0-15): proportional up to 15
    const goalPct = dashData.data.goal.progress;
    scores.goalProgress = Math.min(Math.round(goalPct * 0.15), 15);

    const total = Object.values(scores).reduce((s, v) => s + v, 0);
    const grade = total >= 85 ? 'Excellent' : total >= 70 ? 'Good' : total >= 50 ? 'Fair' : 'Needs Attention';

    return { data: { score: total, grade, breakdown: scores, utilPct, emergencyMonths, liabRatio } };
  },
};

// ─── Health ──────────────────────────────────────────────

export const health = {
  check: async () => {
    // Simple ping to Supabase
    const { error } = await supabase.from('portfolios').select('id').limit(1);
    if (error) return { status: 'error', message: error.message };
    return { status: 'ok', timestamp: new Date().toISOString(), backend: 'supabase' };
  },
};

export { ApiError };

export { fetchFXRates, convertCurrency, COMMON_CURRENCIES } from './fxRates.js';

export default {
  portfolios,
  savings,
  fixedDeposits,
  mutualFunds,
  stocks,
  crypto,
  liabilities,
  creditCards,
  transactions,
  budgets,
  settings,
  recurringTransactions,
  mfOrders,
  stockOrders,
  cryptoOrders,
  dashboard,
  health,
};
