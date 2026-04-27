import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchAllTrackedFunds,
  getTrackedFunds,
  trackFund,
  untrackFund,
  computePortfolioSummary,
  loadPortfolioTerSnapshot,
  savePortfolioTerSnapshot,
  getManualData,
  setManualData,
  setPortfolioContext,
  getPortfolioContext,
  exportFundData,
} from '../../../../src/ui/features/mf-tracker/fundStore.js';

// Mock the dependencies
vi.mock('../../../../src/services/mfapi.js', () => ({
  getFundData: vi.fn(),
  computeReturns: vi.fn(),
  searchFunds: vi.fn(),
}));

vi.mock('../../../../src/services/amfi.js', () => ({
  getAmfiFundInfo: vi.fn(),
  computeAlpha: vi.fn(),
  getBenchmarkForCategory: vi.fn(),
}));

vi.mock('../../../../src/services/mfSnapshot.js', () => ({
  processRefresh: vi.fn(() => ({ changes: {}, isFirstSnapshot: false })),
  loadSnapshot: vi.fn(() => null),
  getDismissedAlerts: vi.fn(() => new Set()),
  deleteSnapshot: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = new Map();
vi.stubGlobal('localStorage', {
  getItem: (key) => mockLocalStorage.get(key) || null,
  setItem: (key, value) => mockLocalStorage.set(key, value),
  removeItem: (key) => mockLocalStorage.delete(key),
  clear: () => mockLocalStorage.clear(),
});

describe('fundStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('fetchAllTrackedFunds', () => {
    describe('Bug 6: Promise.allSettled result handling', () => {
      it('correctly handles Promise.allSettled fulfilled results', async () => {
        // Mock fetchFullFundData to return success
        vi.fn().mockResolvedValue({
          schemeCode: '119551',
          name: 'Test Fund',
          nav: 100,
        });

        // Temporarily replace the function
        const { getFundData } = await import('../../../../src/services/mfapi.js');
        getFundData.mockResolvedValue({ schemeCode: '119551', name: 'Test Fund', nav: 100 });

        trackFund('119551');
        
        // Since we can't easily mock the internal fetchFullFundData without vi.spyOn,
        // we'll test the actual function behavior
        const results = await fetchAllTrackedFunds(() => {});
        
        // The key fix is that results should not contain 'reason' objects
        // since all promises are fulfilled (inner try-catch prevents rejections)
        results.forEach(r => {
          expect(r).not.toHaveProperty('reason');
        });
      });

      it('handles errors by returning error objects instead of rejections', async () => {
        const { getFundData } = await import('../../../../src/services/mfapi.js');
        getFundData.mockRejectedValue(new Error('Network error'));

        trackFund('119551');
        
        const results = await fetchAllTrackedFunds(() => {});
        
        // Should have an error object, not a rejection reason
        expect(results[0]).toHaveProperty('error');
        expect(results[0].error).toBe('Network error');
      });
    });

    it('calls onFundLoaded callback for each fund', async () => {
      const { getFundData } = await import('../../../../src/services/mfapi.js');
      getFundData.mockResolvedValue({ schemeCode: '119551', name: 'Test Fund', nav: 100 });

      trackFund('119551');
      
      const loadedCodes = [];
      await fetchAllTrackedFunds((code, _data) => {
        loadedCodes.push(code);
      });

      expect(loadedCodes).toContain('119551');
    });

    it('processes funds in batches', async () => {
      const { getFundData } = await import('../../../../src/services/mfapi.js');
      getFundData.mockResolvedValue({ schemeCode: '1', name: 'Fund 1', nav: 100 });

      // Add more funds than batch size (4)
      for (let i = 1; i <= 6; i++) {
        trackFund(String(i));
      }

      const results = await fetchAllTrackedFunds(() => {});
      expect(results).toHaveLength(6);
    });
  });

  describe('trackFund', () => {
    it('adds fund to tracked list', () => {
      trackFund('119551');
      const tracked = getTrackedFunds();
      expect(tracked).toContain('119551');
    });

    it('does not add duplicate funds', () => {
      trackFund('119551');
      trackFund('119551');
      const tracked = getTrackedFunds();
      expect(tracked).toHaveLength(1);
    });
  });

  describe('untrackFund', () => {
    it('removes fund from tracked list', () => {
      trackFund('119551');
      trackFund('119552');
      untrackFund('119551');
      const tracked = getTrackedFunds();
      expect(tracked).not.toContain('119551');
      expect(tracked).toContain('119552');
    });
  });

  describe('getTrackedFunds', () => {
    it('returns empty array when no funds tracked', () => {
      const tracked = getTrackedFunds();
      expect(tracked).toEqual([]);
    });

    it('returns tracked funds from localStorage', () => {
      trackFund('119551');
      trackFund('119552');
      const tracked = getTrackedFunds();
      expect(tracked).toHaveLength(2);
    });
  });
});

describe('computePortfolioSummary', () => {
  it('counts only valid (non-error) funds', () => {
    const funds = [
      { schemeCode: '1', return1Y: 10 },
      { schemeCode: '2', error: 'Failed' },
    ];
    const summary = computePortfolioSummary(funds);
    expect(summary.fundCount).toBe(1);
  });

  it('computes weighted expense ratio using currentValue', () => {
    const funds = [
      { schemeCode: '1', expenseRatio: 1.0, holdings: { currentValue: 100000, gainLoss: 0 } },
      { schemeCode: '2', expenseRatio: 2.0, holdings: { currentValue: 100000, gainLoss: 0 } },
    ];
    const { avgExpenseRatio } = computePortfolioSummary(funds);
    expect(avgExpenseRatio).toBeCloseTo(1.5, 2);
  });

  it('falls back to simple average when no holdings have currentValue', () => {
    const funds = [
      { schemeCode: '1', expenseRatio: 1.0 },
      { schemeCode: '2', expenseRatio: 3.0 },
    ];
    const { avgExpenseRatio } = computePortfolioSummary(funds);
    expect(avgExpenseRatio).toBeCloseTo(2.0, 2);
  });

  it('returns null avgExpenseRatio when no funds have expenseRatio', () => {
    const funds = [{ schemeCode: '1', return1Y: 10 }];
    expect(computePortfolioSummary(funds).avgExpenseRatio).toBeNull();
  });

  it('computes average 1Y return', () => {
    const funds = [
      { schemeCode: '1', return1Y: 10 },
      { schemeCode: '2', return1Y: 20 },
    ];
    expect(computePortfolioSummary(funds).avgReturn1Y).toBeCloseTo(15);
  });

  it('returns empty summary for empty array', () => {
    const s = computePortfolioSummary([]);
    expect(s.fundCount).toBe(0);
    expect(s.avgExpenseRatio).toBeNull();
    expect(s.avgReturn1Y).toBeNull();
    expect(s.totalExposure).toBeNull();
  });
});

describe('loadPortfolioTerSnapshot / savePortfolioTerSnapshot', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('returns null when no snapshot stored', () => {
    expect(loadPortfolioTerSnapshot()).toBeNull();
  });

  it('saves and loads a TER value', () => {
    savePortfolioTerSnapshot(1.75);
    expect(loadPortfolioTerSnapshot()).toBeCloseTo(1.75);
  });

  it('ignores null save', () => {
    savePortfolioTerSnapshot(null);
    expect(loadPortfolioTerSnapshot()).toBeNull();
  });
});

describe('getManualData / setManualData', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('returns empty object for unknown code', () => {
    expect(getManualData('999')).toEqual({});
  });

  it('stores and retrieves manual data', () => {
    setManualData('119551', { expenseRatio: 1.5, fundManager: 'John' });
    const data = getManualData('119551');
    expect(data.expenseRatio).toBe(1.5);
    expect(data.fundManager).toBe('John');
  });

  it('merges additional fields without losing existing ones', () => {
    setManualData('119551', { expenseRatio: 1.5 });
    setManualData('119551', { fundManager: 'Jane' });
    const data = getManualData('119551');
    expect(data.expenseRatio).toBe(1.5);
    expect(data.fundManager).toBe('Jane');
  });
});

describe('setPortfolioContext / getPortfolioContext', () => {
  it('stores and retrieves context array', () => {
    const ctx = [{ schemeCode: '1', units: 100, buyNav: 50 }];
    setPortfolioContext(ctx);
    expect(getPortfolioContext()).toEqual(ctx);
  });

  it('defaults to empty array for non-array input', () => {
    setPortfolioContext(null);
    expect(getPortfolioContext()).toEqual([]);
  });
});

describe('exportFundData', () => {
  it('filters out error funds', () => {
    const funds = [
      { schemeCode: '1', name: 'Fund A', nav: 100, return1Y: 10, return3Y: 12, return5Y: 14, expenseRatio: 1.5, aum: 1000, alpha: 2, changes: {} },
      { schemeCode: '2', error: 'Failed' },
    ];
    const exported = exportFundData(funds);
    expect(exported).toHaveLength(1);
    expect(exported[0].schemeCode).toBe('1');
  });

  it('maps fields to integration shape', () => {
    const funds = [
      {
        schemeCode: '1', name: 'Fund A', nav: 100, return1Y: 10, return3Y: 12,
        return5Y: 14, expenseRatio: 1.5, aum: 500, alpha: 2, changes: {},
        holdings: { currentValue: 50000, gainLoss: 5000, gainLossPct: 11 },
      },
    ];
    const [e] = exportFundData(funds);
    expect(e.currentValue).toBe(50000);
    expect(e.gainLoss).toBe(5000);
    expect(e.gainLossPct).toBe(11);
  });

  it('handles missing holdings gracefully', () => {
    const funds = [{ schemeCode: '1', name: 'X', nav: 10, changes: {} }];
    const [e] = exportFundData(funds);
    expect(e.currentValue).toBeNull();
    expect(e.gainLoss).toBeNull();
  });
});
