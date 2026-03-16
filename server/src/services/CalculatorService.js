/**
 * Server-side financial calculations.
 * Mirrors and extends the client-side Calculator class.
 */
export class CalculatorService {
  /**
   * Calculate net worth totals from all asset repositories.
   */
  static calculateNetWorth({ savings, fixedDeposits, mutualFunds, stocks, crypto, liabilities, settings }) {
    const sum = (arr, field) =>
      arr.reduce((s, item) => s + (parseFloat(item[field]) || 0), 0);

    const savingsTotal = sum(savings, 'balance');
    const fdTotal = sum(fixedDeposits, 'invested');
    const mfTotal = sum(mutualFunds, 'current');
    const stocksTotal = sum(stocks, 'current');
    const cryptoTotal = sum(crypto, 'current');
    const liabilitiesTotal = sum(liabilities, 'outstanding');
    const epf = parseFloat(settings?.epf) || 0;
    const ppf = parseFloat(settings?.ppf) || 0;

    const total = savingsTotal + fdTotal + mfTotal + stocksTotal + cryptoTotal + epf + ppf - liabilitiesTotal;

    return {
      savings: savingsTotal,
      fixed_deposits: fdTotal,
      mutual_funds: mfTotal,
      stocks: stocksTotal,
      crypto: cryptoTotal,
      liabilities: liabilitiesTotal,
      epf,
      ppf,
      total,
    };
  }

  /**
   * Calculate asset allocation percentages.
   */
  static calculateAllocation(netWorthData) {
    const totalAssets =
      netWorthData.savings +
      netWorthData.fixed_deposits +
      netWorthData.mutual_funds +
      netWorthData.stocks +
      netWorthData.crypto +
      netWorthData.epf +
      netWorthData.ppf;

    if (totalAssets === 0) return [];

    const assets = [
      { name: 'Savings', value: netWorthData.savings, color: '#3b82f6' },
      { name: 'Fixed Deposits', value: netWorthData.fixed_deposits, color: '#10b981' },
      { name: 'Mutual Funds', value: netWorthData.mutual_funds, color: '#8c0bf5' },
      { name: 'Stocks', value: netWorthData.stocks, color: '#ef4444' },
      { name: 'Crypto', value: netWorthData.crypto, color: '#e9b05b' },
      { name: 'EPF', value: netWorthData.epf, color: '#06b6d4' },
      { name: 'PPF', value: netWorthData.ppf, color: '#ec4899' },
    ];

    return assets
      .filter((a) => a.value > 0)
      .map((a) => ({
        ...a,
        percentage: parseFloat(((a.value / totalAssets) * 100).toFixed(2)),
      }));
  }

  /**
   * CAGR — Compound Annual Growth Rate.
   */
  static calculateCAGR(initialValue, finalValue, years) {
    if (!initialValue || initialValue <= 0 || !finalValue || finalValue <= 0 || !years || years <= 0) {
      return 0;
    }
    const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
    return isNaN(cagr) || !isFinite(cagr) ? 0 : parseFloat(cagr.toFixed(2));
  }

  /**
   * XIRR — Extended Internal Rate of Return.
   * cashFlows: [{ amount: number, date: Date|string }]
   * Negative amounts = investments, positive = redemptions.
   */
  static calculateXIRR(cashFlows, guess = 0.1) {
    if (!cashFlows || cashFlows.length < 2) return 0;

    const flows = cashFlows.map((cf) => ({
      amount: parseFloat(cf.amount),
      date: new Date(cf.date),
    }));

    const daysInYear = 365.25;
    const d0 = flows[0].date;

    const xnpv = (rate) =>
      flows.reduce((sum, cf) => {
        const years = (cf.date - d0) / (daysInYear * 24 * 60 * 60 * 1000);
        return sum + cf.amount / Math.pow(1 + rate, years);
      }, 0);

    const xnpvDerivative = (rate) =>
      flows.reduce((sum, cf) => {
        const years = (cf.date - d0) / (daysInYear * 24 * 60 * 60 * 1000);
        return sum - (years * cf.amount) / Math.pow(1 + rate, years + 1);
      }, 0);

    // Newton-Raphson iteration
    let rate = guess;
    const maxIter = 100;
    const tolerance = 1e-7;

    for (let i = 0; i < maxIter; i++) {
      const npv = xnpv(rate);
      const derivative = xnpvDerivative(rate);

      if (Math.abs(derivative) < 1e-10) break;

      const newRate = rate - npv / derivative;

      if (Math.abs(newRate - rate) < tolerance) {
        return parseFloat((newRate * 100).toFixed(2));
      }

      rate = newRate;
    }

    return parseFloat((rate * 100).toFixed(2));
  }

  /**
   * Portfolio growth rate over a time period using snapshots.
   */
  static calculateGrowthRate(snapshots) {
    if (!snapshots || snapshots.length < 2) return 0;

    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date)
    );

    const first = sorted[0].total;
    const last = sorted[sorted.length - 1].total;

    if (first <= 0) return 0;
    return parseFloat((((last - first) / first) * 100).toFixed(2));
  }

  /**
   * Financial Independence projection.
   * Estimates when net worth will reach the goal based on monthly savings rate.
   */
  static calculateFIProjection(currentNetWorth, monthlyContribution, goal, annualReturnRate = 12) {
    if (currentNetWorth >= goal) return { months: 0, years: 0, targetDate: new Date().toISOString() };
    if (monthlyContribution <= 0 && annualReturnRate <= 0) return null;

    const monthlyRate = annualReturnRate / 100 / 12;
    let balance = currentNetWorth;
    let months = 0;
    const maxMonths = 1200; // 100 years cap

    while (balance < goal && months < maxMonths) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      months++;
    }

    if (months >= maxMonths) return null;

    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    return {
      months,
      years: parseFloat((months / 12).toFixed(1)),
      targetDate: targetDate.toISOString(),
    };
  }

  /**
   * FD maturity calculation.
   */
  static calculateFDMaturity(principal, rate, years, compoundingFrequency = 4) {
    if (!principal || principal <= 0 || !rate || rate < 0 || !years || years <= 0) {
      return principal || 0;
    }
    const r = rate / 100;
    const maturity = principal * Math.pow(1 + r / compoundingFrequency, compoundingFrequency * years);
    return isNaN(maturity) || !isFinite(maturity) ? principal : parseFloat(maturity.toFixed(2));
  }

  /**
   * P/L for an individual investment.
   */
  static calculatePL(invested, current) {
    const inv = parseFloat(invested) || 0;
    const cur = parseFloat(current) || 0;
    const pl = cur - inv;
    const plPercent = inv > 0 ? parseFloat(((pl / inv) * 100).toFixed(2)) : 0;
    return { pl, plPercent };
  }

  /**
   * Monthly expense totals.
   */
  static calculateExpenseTotals(transactions, month, year) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();

    const monthly = transactions.filter((t) => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const income = monthly
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const expenses = monthly
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      transactionCount: monthly.length,
    };
  }

  /**
   * Category-wise expense breakdown.
   */
  static calculateCategoryExpenses(transactions) {
    const totals = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Other';
        totals[cat] = (totals[cat] || 0) + (parseFloat(t.amount) || 0);
      });
    return totals;
  }
}

export default CalculatorService;
