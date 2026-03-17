import { describe, it, expect } from 'vitest';
import { FinanceUtils } from '../../src/utils/financeUtils.js';

describe('FinanceUtils', () => {
  describe('calculatePL', () => {
    it('calculates profit correctly', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL(10000, 12000);
      expect(pl).toBe(2000);
      expect(Number(plPercent)).toBeCloseTo(20, 1);
    });

    it('calculates loss correctly', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL(10000, 8000);
      expect(pl).toBe(-2000);
      expect(Number(plPercent)).toBeCloseTo(-20, 1);
    });

    it('handles zero invested', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL(0, 5000);
      expect(pl).toBe(5000);
      expect(Number(plPercent)).toBe(0);
    });

    it('handles string inputs', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL('10000', '15000');
      expect(pl).toBe(5000);
      expect(Number(plPercent)).toBeCloseTo(50, 1);
    });

    it('handles NaN inputs gracefully', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL('abc', 'xyz');
      expect(pl).toBe(0);
      expect(Number(plPercent)).toBe(0);
    });

    it('handles null inputs', () => {
      const { pl, plPercent } = FinanceUtils.calculatePL(null, null);
      expect(pl).toBe(0);
      expect(Number(plPercent)).toBe(0);
    });
  });
});
