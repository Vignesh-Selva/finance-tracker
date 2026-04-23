import { describe, it, expect, vi } from 'vitest';
import { SanitizeUtils } from '../../src/utils/sanitizeUtils.js';

vi.stubGlobal('document', {
  createElement: () => {
    const el = { _text: '' };
    Object.defineProperty(el, 'textContent', {
      set(v) { el._text = String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); },
    });
    Object.defineProperty(el, 'innerHTML', { get() { return el._text; } });
    return el;
  },
});

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

  describe('sanitizeString', () => {
    it('returns empty string for falsy input', () => {
      expect(SanitizeUtils.sanitizeString('')).toBe('');
      expect(SanitizeUtils.sanitizeString(null)).toBe('');
      expect(SanitizeUtils.sanitizeString(undefined)).toBe('');
    });

    it('escapes HTML special characters', () => {
      expect(SanitizeUtils.sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(SanitizeUtils.sanitizeString('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('passes through plain strings unchanged', () => {
      expect(SanitizeUtils.sanitizeString('Hello World')).toBe('Hello World');
    });

    it('escapes ampersands', () => {
      expect(SanitizeUtils.sanitizeString('A & B')).toBe('A &amp; B');
    });
  });
});
