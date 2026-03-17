import { describe, it, expect } from 'vitest';
import { FormatUtils } from '../../src/utils/formatUtils.js';

describe('FormatUtils', () => {
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
