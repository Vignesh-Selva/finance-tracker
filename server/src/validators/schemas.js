import { z } from 'zod';

// Reusable fields
const id = z.string().uuid().optional();
const portfolioId = z.string().uuid();
const positiveNumber = z.number().min(0);
const optionalString = z.string().optional().default('');
const isoDate = z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date' });

// Portfolio
export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  description: optionalString,
  currency: z.string().default('INR'),
});

export const updatePortfolioSchema = createPortfolioSchema.partial();

// Savings
export const savingsSchema = z.object({
  portfolio_id: portfolioId,
  bank_name: z.string().min(1).max(100),
  account_type: z.enum(['Savings', 'Current']).default('Savings'),
  balance: positiveNumber.default(0),
});

export const updateSavingsSchema = savingsSchema.partial().omit({ portfolio_id: true });

// Fixed Deposits
export const fixedDepositSchema = z.object({
  portfolio_id: portfolioId,
  bank_name: z.string().min(1).max(100),
  invested: positiveNumber.default(0),
  maturity: positiveNumber.default(0),
  interest_rate: positiveNumber.default(0),
  start_date: z.string().optional(),
  maturity_date: z.string().optional(),
});

export const updateFixedDepositSchema = fixedDepositSchema.partial().omit({ portfolio_id: true });

// Mutual Funds
export const mutualFundSchema = z.object({
  portfolio_id: portfolioId,
  fund_name: z.string().min(1).max(200),
  scheme_code: z.string().optional().default(''),
  units: positiveNumber.default(0),
  invested: positiveNumber.default(0),
  current: positiveNumber.default(0),
  fund_type: z.enum(['Equity', 'Debt', 'Hybrid', 'Index']).default('Equity'),
  sip: positiveNumber.default(0),
});

export const updateMutualFundSchema = mutualFundSchema.partial().omit({ portfolio_id: true });

// Stocks
export const stockSchema = z.object({
  portfolio_id: portfolioId,
  stock_name: z.string().min(1).max(200),
  ticker: z.string().optional().default(''),
  quantity: positiveNumber.default(0),
  invested: positiveNumber.default(0),
  current: positiveNumber.default(0),
  sector: optionalString,
});

export const updateStockSchema = stockSchema.partial().omit({ portfolio_id: true });

// Crypto
export const cryptoSchema = z.object({
  portfolio_id: portfolioId,
  coin_name: z.string().min(1).max(100),
  platform: z.string().optional().default(''),
  quantity: positiveNumber.default(0),
  invested: positiveNumber.default(0),
  current: positiveNumber.default(0),
});

export const updateCryptoSchema = cryptoSchema.partial().omit({ portfolio_id: true });

// Liabilities
export const liabilitySchema = z.object({
  portfolio_id: portfolioId,
  type: z.enum(['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Other']),
  lender: z.string().optional().default(''),
  loan_amount: positiveNumber.default(0),
  outstanding: positiveNumber.default(0),
  interest_rate: positiveNumber.default(0),
  emi: positiveNumber.default(0),
});

export const updateLiabilitySchema = liabilitySchema.partial().omit({ portfolio_id: true });

// Transactions
export const transactionSchema = z.object({
  portfolio_id: portfolioId,
  date: z.string().min(1),
  type: z.enum(['income', 'expense']),
  category: z.string().optional().default('Other'),
  amount: positiveNumber,
  units: z.number().optional(),
  description: optionalString,
});

export const updateTransactionSchema = transactionSchema.partial().omit({ portfolio_id: true });

// Budgets
export const budgetSchema = z.object({
  portfolio_id: portfolioId,
  category: z.string().min(1),
  monthly_limit: positiveNumber,
  notes: optionalString,
});

export const updateBudgetSchema = budgetSchema.partial().omit({ portfolio_id: true });

// Settings
export const settingsSchema = z.object({
  portfolio_id: portfolioId,
  currency: z.string().default('INR'),
  goal: positiveNumber.default(15000000),
  epf: positiveNumber.default(0),
  ppf: positiveNumber.default(0),
  theme: z.enum(['light', 'dark']).default('light'),
});

export const updateSettingsSchema = settingsSchema.partial().omit({ portfolio_id: true });

