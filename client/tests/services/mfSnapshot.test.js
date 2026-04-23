import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processRefresh, diffSnapshot, saveSnapshot, loadSnapshot, dismissAlert, getDismissedAlerts, clearDismissedAlerts } from '../../src/services/mfSnapshot.js';

// Mock localStorage
const mockLocalStorage = new Map();
vi.stubGlobal('localStorage', {
  getItem: (key) => mockLocalStorage.get(key) || null,
  setItem: (key, value) => mockLocalStorage.set(key, value),
  removeItem: (key) => mockLocalStorage.delete(key),
  clear: () => mockLocalStorage.clear(),
});

describe('mfSnapshot', () => {
  const TEST_CODE = '119551';

  beforeEach(() => {
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('processRefresh', () => {
    describe('Bug 4: selective alert clearing', () => {
      it('only clears dismissed alerts for fields that changed', () => {
        // First, dismiss some alerts
        dismissAlert(TEST_CODE, 'expenseRatio');
        dismissAlert(TEST_CODE, 'aum');
        dismissAlert(TEST_CODE, 'return1Y');
        
        // Verify all are dismissed
        let dismissed = getDismissedAlerts(TEST_CODE);
        expect(dismissed.has('expenseRatio')).toBe(true);
        expect(dismissed.has('aum')).toBe(true);
        expect(dismissed.has('return1Y')).toBe(true);

        // Now refresh with only expenseRatio and aum changes
        const prevData = {
          expenseRatio: 1.5,
          aum: 1000,
          return1Y: 12.0,
          nav: 100,
          alpha: 2.0,
        };
        saveSnapshot(TEST_CODE, prevData);

        const currentData = {
          expenseRatio: 1.8, // changed
          aum: 1200, // changed
          return1Y: 12.0, // unchanged
          nav: 105,
          alpha: 2.0,
        };

        const result = processRefresh(TEST_CODE, currentData);

        // expenseRatio and aum changes should be detected
        expect(result.changes.expenseRatio).toBeDefined();
        expect(result.changes.aum).toBeDefined();
        expect(result.changes.return1Y).toBeUndefined();

        // Only expenseRatio and aum dismissals should be cleared
        dismissed = getDismissedAlerts(TEST_CODE);
        expect(dismissed.has('expenseRatio')).toBe(false); // cleared (changed)
        expect(dismissed.has('aum')).toBe(false); // cleared (changed)
        expect(dismissed.has('return1Y')).toBe(true); // preserved (unchanged)
      });

      it('does not clear any dismissed alerts when no changes detected', () => {
        dismissAlert(TEST_CODE, 'expenseRatio');
        dismissAlert(TEST_CODE, 'aum');

        const prevData = {
          expenseRatio: 1.5,
          aum: 1000,
          nav: 100,
        };
        saveSnapshot(TEST_CODE, prevData);

        const currentData = {
          expenseRatio: 1.5,
          aum: 1000,
          nav: 100,
        };

        processRefresh(TEST_CODE, currentData);

        const dismissed = getDismissedAlerts(TEST_CODE);
        expect(dismissed.has('expenseRatio')).toBe(true);
        expect(dismissed.has('aum')).toBe(true);
      });
    });

    it('returns isFirstSnapshot true on first refresh', () => {
      const currentData = { expenseRatio: 1.5, nav: 100 };
      const result = processRefresh(TEST_CODE, currentData);
      expect(result.isFirstSnapshot).toBe(true);
      expect(result.changes).toEqual({});
    });

    it('returns isFirstSnapshot false on subsequent refresh', () => {
      const prevData = { expenseRatio: 1.5, nav: 100 };
      saveSnapshot(TEST_CODE, prevData);
      
      const currentData = { expenseRatio: 1.8, nav: 105 };
      const result = processRefresh(TEST_CODE, currentData);
      expect(result.isFirstSnapshot).toBe(false);
      expect(result.changes.expenseRatio).toBeDefined();
    });
  });

  describe('diffSnapshot', () => {
    it('detects expense ratio increase', () => {
      const prev = { expenseRatio: 1.5, aum: 1000, return1Y: 10, nav: 100, alpha: 1 };
      const curr = { expenseRatio: 1.8, aum: 1000, return1Y: 10, nav: 100, alpha: 1 };
      const changes = diffSnapshot(prev, curr);
      expect(changes.expenseRatio).toBeDefined();
      expect(changes.expenseRatio.severity).toBe('red');
    });

    it('detects expense ratio decrease', () => {
      const prev = { expenseRatio: 1.8, aum: 1000, return1Y: 10, nav: 100, alpha: 1 };
      const curr = { expenseRatio: 1.5, aum: 1000, return1Y: 10, nav: 100, alpha: 1 };
      const changes = diffSnapshot(prev, curr);
      expect(changes.expenseRatio).toBeDefined();
      expect(changes.expenseRatio.severity).toBe('green');
    });

    it('returns empty object when prev is null', () => {
      const curr = { expenseRatio: 1.5, nav: 100 };
      const changes = diffSnapshot(null, curr);
      expect(changes).toEqual({});
    });
  });

  describe('dismissAlert', () => {
    it('adds alert to dismissed set', () => {
      dismissAlert(TEST_CODE, 'expenseRatio');
      const dismissed = getDismissedAlerts(TEST_CODE);
      expect(dismissed.has('expenseRatio')).toBe(true);
    });

    it('persists across function calls', () => {
      dismissAlert(TEST_CODE, 'expenseRatio');
      dismissAlert(TEST_CODE, 'aum');
      
      const dismissed = getDismissedAlerts(TEST_CODE);
      expect(dismissed.has('expenseRatio')).toBe(true);
      expect(dismissed.has('aum')).toBe(true);
    });
  });

  describe('clearDismissedAlerts', () => {
    it('removes all dismissed alerts for a fund', () => {
      dismissAlert(TEST_CODE, 'expenseRatio');
      dismissAlert(TEST_CODE, 'aum');
      
      clearDismissedAlerts(TEST_CODE);
      
      const dismissed = getDismissedAlerts(TEST_CODE);
      expect(dismissed.size).toBe(0);
    });
  });
});
