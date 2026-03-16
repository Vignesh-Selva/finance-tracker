import { Router } from 'express';
import {
  savingsRepo,
  fixedDepositRepo,
  mutualFundRepo,
  stockRepo,
  cryptoRepo,
  liabilityRepo,
  settingsRepo,
  transactionRepo,
  snapshotRepo,
} from '../repositories/index.js';
import { CalculatorService } from '../services/CalculatorService.js';
import { SnapshotService } from '../services/SnapshotService.js';

const router = Router();

// GET /api/dashboard/:portfolioId — full dashboard data in one call
router.get('/:portfolioId', async (req, res, next) => {
  try {
    const { portfolioId } = req.params;

    const [savings, fixedDeposits, mutualFunds, stocks, crypto, liabilities, settingsArr, transactions] =
      await Promise.all([
        savingsRepo.findAll(portfolioId),
        fixedDepositRepo.findAll(portfolioId),
        mutualFundRepo.findAll(portfolioId),
        stockRepo.findAll(portfolioId),
        cryptoRepo.findAll(portfolioId),
        liabilityRepo.findAll(portfolioId),
        settingsRepo.findAll(portfolioId),
        transactionRepo.findAll(portfolioId),
      ]);

    const settings = settingsArr[0] || {};

    const netWorth = CalculatorService.calculateNetWorth({
      savings, fixedDeposits, mutualFunds, stocks, crypto, liabilities, settings,
    });

    const allocation = CalculatorService.calculateAllocation(netWorth);
    const expenseTotals = CalculatorService.calculateExpenseTotals(transactions);
    const categoryExpenses = CalculatorService.calculateCategoryExpenses(transactions);

    // Investment P/L
    const mfInvested = mutualFunds.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
    const mfCurrent = mutualFunds.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);
    const stocksInvested = stocks.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
    const stocksCurrent = stocks.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);
    const cryptoInvested = crypto.reduce((s, i) => s + (parseFloat(i.invested) || 0), 0);
    const cryptoCurrent = crypto.reduce((s, i) => s + (parseFloat(i.current) || 0), 0);

    const totalInvested = mfInvested + stocksInvested + cryptoInvested;
    const totalCurrentValue = mfCurrent + stocksCurrent + cryptoCurrent;

    const investmentPL = {
      total: CalculatorService.calculatePL(totalInvested, totalCurrentValue),
      mutualFunds: CalculatorService.calculatePL(mfInvested, mfCurrent),
      stocks: CalculatorService.calculatePL(stocksInvested, stocksCurrent),
      crypto: CalculatorService.calculatePL(cryptoInvested, cryptoCurrent),
    };

    // Goal progress
    const goal = parseFloat(settings.goal) || 0;
    const progress = goal > 0 ? parseFloat(Math.min((netWorth.total / goal) * 100, 100).toFixed(2)) : 0;

    res.json({
      data: {
        netWorth,
        allocation,
        investmentPL,
        expenseTotals,
        categoryExpenses,
        goal: { target: goal, progress },
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/:portfolioId/timeline — net worth history
router.get('/:portfolioId/timeline', async (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    const { start_date, end_date, limit } = req.query;

    const snapshots = await SnapshotService.getTimeline(portfolioId, {
      startDate: start_date,
      endDate: end_date,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    const growthRate = CalculatorService.calculateGrowthRate(snapshots);

    res.json({ data: { snapshots, growthRate } });
  } catch (err) {
    next(err);
  }
});

// POST /api/dashboard/:portfolioId/snapshot — take a snapshot now
router.post('/:portfolioId/snapshot', async (req, res, next) => {
  try {
    const snapshot = await SnapshotService.takeSnapshot(req.params.portfolioId);
    res.status(201).json({ data: snapshot });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/:portfolioId/fi-projection — Financial Independence projection
router.get('/:portfolioId/fi-projection', async (req, res, next) => {
  try {
    const { portfolioId } = req.params;
    const { monthly_contribution, annual_return } = req.query;

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
      savings, fixedDeposits, mutualFunds, stocks, crypto, liabilities, settings,
    });

    const projection = CalculatorService.calculateFIProjection(
      netWorth.total,
      parseFloat(monthly_contribution) || 0,
      parseFloat(settings.goal) || 15000000,
      parseFloat(annual_return) || 12,
    );

    res.json({ data: projection });
  } catch (err) {
    next(err);
  }
});

export default router;
