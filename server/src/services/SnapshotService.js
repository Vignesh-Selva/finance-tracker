import {
  savingsRepo,
  fixedDepositRepo,
  mutualFundRepo,
  stockRepo,
  cryptoRepo,
  liabilityRepo,
  settingsRepo,
  snapshotRepo,
} from '../repositories/index.js';
import { CalculatorService } from './CalculatorService.js';
import logger from '../lib/logger.js';

/**
 * Takes a point-in-time snapshot of net worth for a portfolio.
 * Called daily by the scheduler and on-demand via API.
 */
export class SnapshotService {
  static async takeSnapshot(portfolioId) {
    try {
      const [savings, fixedDeposits, mutualFunds, stocks, crypto, liabilities, settingsArr] =
        await Promise.all([
          savingsRepo.findAll(portfolioId),
          fixedDepositRepo.findAll(portfolioId),
          mutualFundRepo.findAll(portfolioId),
          stockRepo.findAll(portfolioId),
          cryptoRepo.findAll(portfolioId),
          liabilityRepo.findAll(portfolioId),
          settingsRepo.findAll(portfolioId),
        ]);

      const settings = settingsArr[0] || {};
      const netWorth = CalculatorService.calculateNetWorth({
        savings,
        fixedDeposits,
        mutualFunds,
        stocks,
        crypto,
        liabilities,
        settings,
      });

      const today = new Date().toISOString().slice(0, 10);
      const snapshot = await snapshotRepo.upsert(portfolioId, today, {
        savings: netWorth.savings,
        fixed_deposits: netWorth.fixed_deposits,
        mutual_funds: netWorth.mutual_funds,
        stocks: netWorth.stocks,
        crypto: netWorth.crypto,
        epf: netWorth.epf,
        ppf: netWorth.ppf,
        liabilities: netWorth.liabilities,
        total: netWorth.total,
      });

      logger.info({ portfolioId, total: netWorth.total }, 'Net worth snapshot saved');
      return snapshot;
    } catch (error) {
      logger.error({ err: error, portfolioId }, 'Snapshot failed');
      throw error;
    }
  }

  static async getTimeline(portfolioId, { startDate, endDate, limit } = {}) {
    if (startDate && endDate) {
      return snapshotRepo.findByDateRange(portfolioId, startDate, endDate);
    }
    return snapshotRepo.findByPortfolio(portfolioId, { limit: limit || 365 });
  }
}

export default SnapshotService;
