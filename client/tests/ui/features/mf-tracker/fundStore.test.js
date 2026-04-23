import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAllTrackedFunds, getTrackedFunds, trackFund, untrackFund } from '../../../../src/ui/features/mf-tracker/fundStore.js';

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
        const mockFetchFullFundData = vi.fn().mockResolvedValue({
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
      await fetchAllTrackedFunds((code, data) => {
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
