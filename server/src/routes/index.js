import { Router } from 'express';
import portfolioRoutes from './portfolios.js';
import dashboardRoutes from './dashboard.js';
import priceRoutes from './prices.js';
import { createCrudRouter } from './createCrudRouter.js';
import {
  savingsRepo,
  fixedDepositRepo,
  mutualFundRepo,
  stockRepo,
  cryptoRepo,
  liabilityRepo,
  transactionRepo,
  budgetRepo,
  settingsRepo,
} from '../repositories/index.js';
import {
  savingsSchema, updateSavingsSchema,
  fixedDepositSchema, updateFixedDepositSchema,
  mutualFundSchema, updateMutualFundSchema,
  stockSchema, updateStockSchema,
  cryptoSchema, updateCryptoSchema,
  liabilitySchema, updateLiabilitySchema,
  transactionSchema, updateTransactionSchema,
  budgetSchema, updateBudgetSchema,
  settingsSchema, updateSettingsSchema,
} from '../validators/schemas.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Portfolio management
router.use('/portfolios', portfolioRoutes);

// Dashboard & analytics
router.use('/dashboard', dashboardRoutes);

// Price & valuation
router.use('/prices', priceRoutes);

// Asset CRUD routes
router.use('/savings', createCrudRouter({
  repository: savingsRepo,
  createSchema: savingsSchema,
  updateSchema: updateSavingsSchema,
  resourceName: 'Savings',
}));

router.use('/fixed-deposits', createCrudRouter({
  repository: fixedDepositRepo,
  createSchema: fixedDepositSchema,
  updateSchema: updateFixedDepositSchema,
  resourceName: 'Fixed Deposit',
}));

router.use('/mutual-funds', createCrudRouter({
  repository: mutualFundRepo,
  createSchema: mutualFundSchema,
  updateSchema: updateMutualFundSchema,
  resourceName: 'Mutual Fund',
}));

router.use('/stocks', createCrudRouter({
  repository: stockRepo,
  createSchema: stockSchema,
  updateSchema: updateStockSchema,
  resourceName: 'Stock',
}));

router.use('/crypto', createCrudRouter({
  repository: cryptoRepo,
  createSchema: cryptoSchema,
  updateSchema: updateCryptoSchema,
  resourceName: 'Crypto',
}));

router.use('/liabilities', createCrudRouter({
  repository: liabilityRepo,
  createSchema: liabilitySchema,
  updateSchema: updateLiabilitySchema,
  resourceName: 'Liability',
}));

router.use('/transactions', createCrudRouter({
  repository: transactionRepo,
  createSchema: transactionSchema,
  updateSchema: updateTransactionSchema,
  resourceName: 'Transaction',
}));

router.use('/budgets', createCrudRouter({
  repository: budgetRepo,
  createSchema: budgetSchema,
  updateSchema: updateBudgetSchema,
  resourceName: 'Budget',
}));

router.use('/settings', createCrudRouter({
  repository: settingsRepo,
  createSchema: settingsSchema,
  updateSchema: updateSettingsSchema,
  resourceName: 'Settings',
}));

export default router;
