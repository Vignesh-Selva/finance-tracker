import { describe, it, expect, beforeEach } from 'vitest';
import { FormatUtils, setDisplayCurrency } from '../../src/utils/formatUtils.js';

describe('FormatUtils', () => {
  beforeEach(() => {
    setDisplayCurrency('INR', {}, 'INR');
  });

  describe('formatCurrency', () => {
    it('formats positive numbers with INR symbol', () => {
      const result = FormatUtils.formatCurrency(1000);
      expect(result).toContain('₹');
      expect(result).toContain('1,000.00');
    });

    it('formats zero', () => {
      expect(FormatUtils.formatCurrency(0)).toBe('₹0.00');
    });

    it('formats negative numbers', () => {
      const result = FormatUtils.formatCurrency(-5000);
      expect(result).toContain('₹');
      expect(result).toContain('5,000.00');
    });

    it('handles string input', () => {
      const result = FormatUtils.formatCurrency('25000.5');
      expect(result).toContain('₹');
      expect(result).toContain('25,000.50');
    });

    it('returns ₹0.00 for NaN input', () => {
      expect(FormatUtils.formatCurrency('abc')).toBe('₹0.00');
      expect(FormatUtils.formatCurrency(null)).toBe('₹0.00');
      expect(FormatUtils.formatCurrency(undefined)).toBe('₹0.00');
    });

    it('formats large Indian numbers with commas', () => {
      const result = FormatUtils.formatCurrency(1500000);
      expect(result).toContain('₹');
      expect(result).toContain('15,00,000.00');
    });

    it('formats in USD when display currency is USD', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('$');
      expect(result).toContain('1,000.00');
    });

    it('formats in EUR when display currency is EUR', () => {
      setDisplayCurrency('EUR', { INR: 83.5, EUR: 0.92 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('€');
      expect(result).toContain('920');
    });

    it('formats in GBP when display currency is GBP', () => {
      setDisplayCurrency('GBP', { INR: 83.5, GBP: 0.79 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('£');
      expect(result).toContain('790');
    });

    it('formats in JPY when display currency is JPY', () => {
      setDisplayCurrency('JPY', { INR: 83.5, JPY: 150 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('¥');
      expect(result).toContain('150,000');
    });

    it('formats in AED when display currency is AED', () => {
      setDisplayCurrency('AED', { INR: 83.5, AED: 3.67 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('AED ');
      expect(result).toContain('3,670');
    });

    it('formats in SGD when display currency is SGD', () => {
      setDisplayCurrency('SGD', { INR: 83.5, SGD: 1.35 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('S$');
      expect(result).toContain('1,350');
    });

    it('handles empty FX rates gracefully (uses display currency without conversion)', () => {
      setDisplayCurrency('USD', {}, 'INR');
      const result = FormatUtils.formatCurrency(1000);
      expect(result).toContain('$');
    });

    it('handles null FX rates gracefully (uses display currency without conversion)', () => {
      setDisplayCurrency('USD', null, 'INR');
      const result = FormatUtils.formatCurrency(1000);
      expect(result).toContain('$');
    });

    it('handles missing target currency rate (uses display currency without conversion)', () => {
      setDisplayCurrency('USD', { INR: 83.5 }, 'INR');
      const result = FormatUtils.formatCurrency(1000);
      expect(result).toContain('$');
    });

    it('handles case-insensitive currency code', () => {
      setDisplayCurrency('usd', { INR: 83.5, USD: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(83500);
      expect(result).toContain('$');
    });

    it('handles negative amounts in foreign currency', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(-83500);
      expect(result).toContain('$');
      expect(result).toContain('1,000');
    });

    it('handles zero in foreign currency', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      expect(FormatUtils.formatCurrency(0)).toBe('$0.00');
    });

    it('handles very large amounts in foreign currency', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(835000000);
      expect(result).toContain('$');
      expect(result).toContain('10,000,000');
    });

    it('handles very small amounts in foreign currency', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(8.35);
      expect(result).toContain('$');
      expect(result).toContain('0.10');
    });

    it('resets to INR when setDisplayCurrency called with INR', () => {
      setDisplayCurrency('USD', { INR: 83.5, USD: 1 }, 'INR');
      setDisplayCurrency('INR', { INR: 1 }, 'INR');
      const result = FormatUtils.formatCurrency(1000);
      expect(result).toContain('₹');
    });
  });

  describe('formatLargeNumber', () => {
    it('formats crores', () => {
      expect(FormatUtils.formatLargeNumber(15000000)).toBe('1.50 Cr');
    });

    it('formats lakhs', () => {
      expect(FormatUtils.formatLargeNumber(500000)).toBe('5.00 L');
    });

    it('formats thousands', () => {
      expect(FormatUtils.formatLargeNumber(5000)).toBe('5.00 K');
    });

    it('formats small numbers', () => {
      expect(FormatUtils.formatLargeNumber(500)).toBe('500.00');
    });

    it('returns 0 for NaN', () => {
      expect(FormatUtils.formatLargeNumber('abc')).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('returns NA for empty/NA input', () => {
      expect(FormatUtils.formatDate('')).toBe('NA');
      expect(FormatUtils.formatDate(null)).toBe('NA');
      expect(FormatUtils.formatDate('NA')).toBe('NA');
    });

    it('returns Invalid Date for garbage input', () => {
      expect(FormatUtils.formatDate('not-a-date')).toBe('Invalid Date');
    });

    it('formats a valid date string', () => {
      const result = FormatUtils.formatDate('2026-01-15');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });
  });
});
