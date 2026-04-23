import { describe, it, expect } from 'vitest';
import { renderPortfolioSummary } from '../../../../src/ui/features/mf-tracker/components.js';

describe('renderPortfolioSummary', () => {
  describe('Bug 3: null avgReturn1Y tone', () => {
    it('renders neutral tone when avgReturn1Y is null', () => {
      const summary = {
        fundCount: 3,
        totalExposure: 100000,
        totalGainLoss: 5000,
        avgExpenseRatio: 1.5,
        avgReturn1Y: null,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value neutral');
      expect(html).toContain('Avg 1Y Return');
      expect(html).toContain('—');
    });

    it('renders positive tone when avgReturn1Y is positive', () => {
      const summary = {
        fundCount: 3,
        avgReturn1Y: 12.5,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value positive');
      expect(html).toContain('+12.50%');
    });

    it('renders negative tone when avgReturn1Y is negative', () => {
      const summary = {
        fundCount: 3,
        avgReturn1Y: -5.3,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value negative');
      expect(html).toContain('-5.30%');
    });
  });

  it('renders summary with all fields', () => {
    const summary = {
      fundCount: 5,
      totalExposure: 500000,
      totalGainLoss: 25000,
      avgExpenseRatio: 1.25,
      avgReturn1Y: 15.5,
    };
    const html = renderPortfolioSummary(summary);
    expect(html).toContain('Funds Tracked');
    expect(html).toContain('5');
    expect(html).toContain('Total Exposure');
    expect(html).toContain('Avg Expense Ratio');
    expect(html).toContain('1.25%');
    expect(html).toContain('Avg 1Y Return');
    expect(html).toContain('+15.50%');
    expect(html).toContain('Total Gain/Loss');
  });

  it('renders summary with null/missing values', () => {
    const summary = {
      fundCount: 0,
      totalExposure: null,
      totalGainLoss: null,
      avgExpenseRatio: null,
      avgReturn1Y: null,
    };
    const html = renderPortfolioSummary(summary);
    expect(html).toContain('Funds Tracked');
    expect(html).toContain('0');
    expect(html).toContain('—');
  });
});
