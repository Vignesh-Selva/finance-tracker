import { BaseRepository } from './BaseRepository.js';
import { PortfolioRepository } from './PortfolioRepository.js';
import { SnapshotRepository } from './SnapshotRepository.js';
import { PriceCacheRepository } from './PriceCacheRepository.js';

// Generic asset repositories
export const portfolioRepo = new PortfolioRepository();
export const savingsRepo = new BaseRepository('savings');
export const fixedDepositRepo = new BaseRepository('fixed_deposits');
export const mutualFundRepo = new BaseRepository('mutual_funds');
export const stockRepo = new BaseRepository('stocks');
export const cryptoRepo = new BaseRepository('crypto');
export const liabilityRepo = new BaseRepository('liabilities');
export const transactionRepo = new BaseRepository('transactions');
export const budgetRepo = new BaseRepository('budgets');
export const settingsRepo = new BaseRepository('settings');
export const snapshotRepo = new SnapshotRepository();
export const priceCacheRepo = new PriceCacheRepository();

export { BaseRepository };
