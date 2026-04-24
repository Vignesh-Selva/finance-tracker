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

  describe('xirr', () => {
    it('calculates XIRR for simple cashflow', () => {
      const cashflows = [-10000, 12000];
      const dates = ['2023-01-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).toBeGreaterThan(0.15);
      expect(result).toBeLessThan(0.25);
    });

    it('calculates XIRR for multiple cashflows', () => {
      const cashflows = [-5000, -5000, -5000, 20000];
      const dates = ['2023-01-01', '2023-04-01', '2023-07-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).not.toBeNull();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(-1);
    });

    it('returns null for empty cashflows', () => {
      expect(FinanceUtils.xirr([], [])).toBeNull();
    });

    it('returns null for single cashflow', () => {
      expect(FinanceUtils.xirr([1000], ['2023-01-01'])).toBeNull();
    });

    it('returns null for mismatched cashflow/date lengths', () => {
      expect(FinanceUtils.xirr([1000, 2000], ['2023-01-01'])).toBeNull();
    });

    it('handles negative XIRR (loss)', () => {
      const cashflows = [-10000, 8000];
      const dates = ['2023-01-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).toBeLessThan(0);
    });

    it('handles very small cashflows', () => {
      const cashflows = [-1, 1.1];
      const dates = ['2023-01-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).not.toBeNull();
    });

    it('handles very large cashflows', () => {
      const cashflows = [-10000000, 15000000];
      const dates = ['2023-01-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).not.toBeNull();
    });

    it('handles invalid date strings', () => {
      const cashflows = [-1000, 2000];
      const dates = ['invalid', 'also-invalid'];
      const result = FinanceUtils.xirr(cashflows, dates);
      expect(result).toBeNull();
    });

    it('handles null/undefined inputs', () => {
      expect(FinanceUtils.xirr(null, null)).toBeNull();
      expect(FinanceUtils.xirr(undefined, undefined)).toBeNull();
    });

    it('converges with custom guess', () => {
      const cashflows = [-10000, 12000];
      const dates = ['2023-01-01', '2024-01-01'];
      const result = FinanceUtils.xirr(cashflows, dates, 0.2);
      expect(result).not.toBeNull();
    });
  });

  describe('xirrFromHolding', () => {
    it('calculates XIRR from invested/current and purchase date', () => {
      const result = FinanceUtils.xirrFromHolding(10000, 12000, '2023-01-01');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('value');
      expect(parseFloat(result.value)).toBeGreaterThan(0);
    });

    it('handles loss scenario', () => {
      const result = FinanceUtils.xirrFromHolding(10000, 8000, '2023-01-01');
      expect(result).not.toBeNull();
      expect(parseFloat(result.value)).toBeLessThan(0);
    });

    it('handles zero invested', () => {
      const result = FinanceUtils.xirrFromHolding(0, 5000, '2023-01-01');
      expect(result).toBeNull();
    });

    it('handles invalid purchase date', () => {
      const result = FinanceUtils.xirrFromHolding(10000, 12000, 'invalid-date');
      expect(result).toBeNull();
    });

    it('handles null inputs', () => {
      expect(FinanceUtils.xirrFromHolding(null, null, null)).toBeNull();
      expect(FinanceUtils.xirrFromHolding(10000, 12000, null)).toBeNull();
    });

    it('handles string number inputs', () => {
      const result = FinanceUtils.xirrFromHolding('10000', '12000', '2023-01-01');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('value');
    });

    it('handles very short holding period (days) — returns hint instead of XIRR', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = FinanceUtils.xirrFromHolding(10000, 10010, yesterday.toISOString().split('T')[0]);
      expect(result).not.toBeNull();
      expect(result.value).toBe('0.00');
      expect(result.hint).toBeTruthy();
    });

    it('handles very long holding period (years)', () => {
      const result = FinanceUtils.xirrFromHolding(10000, 30000, '2010-01-01');
      expect(result).not.toBeNull();
      expect(parseFloat(result.value)).toBeGreaterThan(0);
    });
  });
});
