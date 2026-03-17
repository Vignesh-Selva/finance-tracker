import { describe, it, expect } from 'vitest';
import { SanitizeUtils } from '../../src/utils/sanitizeUtils.js';

describe('SanitizeUtils', () => {
  describe('sanitizeNumber', () => {
    it('parses valid numbers', () => {
      expect(SanitizeUtils.sanitizeNumber(42)).toBe(42);
      expect(SanitizeUtils.sanitizeNumber('3.14')).toBeCloseTo(3.14);
    });

    it('returns 0 for NaN', () => {
      expect(SanitizeUtils.sanitizeNumber('abc')).toBe(0);
      expect(SanitizeUtils.sanitizeNumber(null)).toBe(0);
      expect(SanitizeUtils.sanitizeNumber(undefined)).toBe(0);
    });

    it('returns 0 for Infinity', () => {
      expect(SanitizeUtils.sanitizeNumber(Infinity)).toBe(0);
      expect(SanitizeUtils.sanitizeNumber(-Infinity)).toBe(0);
    });

    it('blocks negative numbers by default', () => {
      expect(SanitizeUtils.sanitizeNumber(-5)).toBe(0);
    });

    it('allows negative numbers when flag is set', () => {
      expect(SanitizeUtils.sanitizeNumber(-5, true)).toBe(-5);
    });
  });

  describe('deepClone', () => {
    it('creates a deep copy', () => {
      const original = { a: 1, b: { c: 2 } };
      const clone = SanitizeUtils.deepClone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.b).not.toBe(original.b);
    });

    it('clones arrays', () => {
      const original = [1, { a: 2 }, [3]];
      const clone = SanitizeUtils.deepClone(original);
      expect(clone).toEqual(original);
      expect(clone[1]).not.toBe(original[1]);
    });
  });
});
