import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TARGET_KEY = 'rebalancing_targets_v1';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};

global.localStorage = localStorageMock;

beforeEach(() => {
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
  localStorageMock.clear.mockImplementation(() => {});
});

const ASSET_CLASSES = [
    { key: 'savings',       label: 'Savings',        color: '#d97757' },
    { key: 'fixedDeposits', label: 'Fixed Deposits',  color: '#3b82f6' },
    { key: 'mutualFunds',   label: 'Mutual Funds',    color: '#059669' },
    { key: 'stocks',        label: 'Stocks',          color: '#8b5cf6' },
    { key: 'crypto',        label: 'Crypto',          color: '#f59e0b' },
    { key: 'epfPpf',        label: 'EPF / PPF',       color: '#6b7280' },
];

function loadTargets() {
    try { return JSON.parse(localStorage.getItem(TARGET_KEY) || '{}'); } catch { return {}; }
}

function saveTargets(targets) {
    localStorage.setItem(TARGET_KEY, JSON.stringify(targets));
}

function totalTargets(targets) {
    if (!targets) return 0;
    return ASSET_CLASSES.reduce((s, a) => s + (parseFloat(targets[a.key]) || 0), 0);
}

describe('rebalancing - target management', () => {
    beforeEach(() => {
        localStorageMock.getItem.mockReturnValue(null);
        localStorageMock.setItem.mockImplementation(() => {});
        localStorageMock.clear.mockImplementation(() => {});
    });

    describe('loadTargets', () => {
        it('returns empty object when no targets saved', () => {
            const result = loadTargets();
            expect(result).toEqual({});
        });

        it('loads saved targets', () => {
            const targets = { savings: 20, mutualFunds: 40, stocks: 30 };
            localStorageMock.getItem.mockReturnValue(JSON.stringify(targets));
            const result = loadTargets();
            expect(result).toEqual(targets);
        });

        it('handles corrupt localStorage gracefully', () => {
            localStorageMock.getItem.mockReturnValue('invalid-json');
            const result = loadTargets();
            expect(result).toEqual({});
        });

        it('handles null localStorage gracefully', () => {
            localStorageMock.getItem.mockReturnValue('null');
            const result = loadTargets();
            expect(result).toBeNull();
        });
    });

    describe('saveTargets', () => {
        it('saves targets to localStorage', () => {
            const targets = { savings: 20, mutualFunds: 40 };
            saveTargets(targets);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(TARGET_KEY, JSON.stringify(targets));
        });

        it('overwrites existing targets', () => {
            localStorageMock.setItem.mockClear();
            saveTargets({ savings: 20 });
            saveTargets({ stocks: 30 });
            expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
        });

        it('handles empty targets', () => {
            saveTargets({});
            expect(localStorageMock.setItem).toHaveBeenCalledWith(TARGET_KEY, '{}');
        });
    });

    describe('totalTargets', () => {
        it('calculates sum of all target percentages', () => {
            const targets = { savings: 20, mutualFunds: 40, stocks: 30, crypto: 10 };
            expect(totalTargets(targets)).toBe(100);
        });

        it('handles partial targets (only some asset classes set)', () => {
            const targets = { savings: 20, mutualFunds: 40 };
            expect(totalTargets(targets)).toBe(60);
        });

        it('handles empty targets', () => {
            expect(totalTargets({})).toBe(0);
        });

        it('handles null targets', () => {
            expect(totalTargets(null)).toBe(0);
        });

        it('handles undefined targets', () => {
            expect(totalTargets(undefined)).toBe(0);
        });

        it('handles string number values', () => {
            const targets = { savings: '20', mutualFunds: '40' };
            expect(totalTargets(targets)).toBe(60);
        });

        it('handles decimal values', () => {
            const targets = { savings: 20.5, mutualFunds: 40.5 };
            expect(totalTargets(targets)).toBeCloseTo(61, 1);
        });

        it('handles zero values', () => {
            const targets = { savings: 0, mutualFunds: 0 };
            expect(totalTargets(targets)).toBe(0);
        });

        it('handles negative values', () => {
            const targets = { savings: -10, mutualFunds: 50 };
            expect(totalTargets(targets)).toBe(40);
        });

        it('handles values > 100', () => {
            const targets = { savings: 150 };
            expect(totalTargets(targets)).toBe(150);
        });

        it('sums all asset classes including epfPpf', () => {
            const targets = { savings: 20, mutualFunds: 40, stocks: 20, crypto: 10, epfPpf: 10 };
            expect(totalTargets(targets)).toBe(100);
        });
    });
});

describe('rebalancing - drift calculation', () => {
    function calculateDrift(currentVal, currentPct, targetPct, totalNW) {
        const targetVal = (targetPct / 100) * totalNW;
        const delta = targetVal - currentVal;
        const deltaPct = currentPct - targetPct;
        return { delta, deltaPct, targetVal };
    }

    it('calculates delta correctly for underweight position', () => {
        const totalNW = 1000000;
        const currentVal = 150000;
        const currentPct = 15;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(200000);
        expect(delta).toBe(50000);
        expect(deltaPct).toBe(-5);
    });

    it('calculates delta correctly for overweight position', () => {
        const totalNW = 1000000;
        const currentVal = 250000;
        const currentPct = 25;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(200000);
        expect(delta).toBe(-50000);
        expect(deltaPct).toBe(5);
    });

    it('calculates delta correctly for on-target position', () => {
        const totalNW = 1000000;
        const currentVal = 200000;
        const currentPct = 20;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(200000);
        expect(delta).toBe(0);
        expect(deltaPct).toBe(0);
    });

    it('handles zero net worth', () => {
        const totalNW = 0;
        const currentVal = 0;
        const currentPct = 0;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(0);
        expect(delta).toBe(0);
        expect(deltaPct).toBe(-20);
    });

    it('handles zero target percentage', () => {
        const totalNW = 1000000;
        const currentVal = 100000;
        const currentPct = 10;
        const targetPct = 0;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(0);
        expect(delta).toBe(-100000);
        expect(deltaPct).toBe(10);
    });

    it('handles very small drift (within tolerance)', () => {
        const totalNW = 1000000;
        const currentVal = 200100;
        const currentPct = 20.01;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(Math.abs(delta)).toBe(100);
        expect(deltaPct).toBeCloseTo(0.01, 2);
    });

    it('handles very large drift', () => {
        const totalNW = 1000000;
        const currentVal = 500000;
        const currentPct = 50;
        const targetPct = 10;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(100000);
        expect(delta).toBe(-400000);
        expect(deltaPct).toBe(40);
    });

    it('handles negative current value (should not happen in practice)', () => {
        const totalNW = 1000000;
        const currentVal = -10000;
        const currentPct = -1;
        const targetPct = 20;
        const { delta, deltaPct, targetVal } = calculateDrift(currentVal, currentPct, targetPct, totalNW);
        expect(targetVal).toBe(200000);
        expect(delta).toBe(210000);
        expect(deltaPct).toBe(-21);
    });
});

describe('rebalancing - action advice', () => {
    function getAction(delta) {
        if (Math.abs(delta) < 100) {
            return '✓ On target';
        } else if (delta > 0) {
            return '▲ Buy';
        } else {
            return '▼ Sell';
        }
    }

    it('recommends buy when delta is positive and significant', () => {
        expect(getAction(50000)).toBe('▲ Buy');
        expect(getAction(1000)).toBe('▲ Buy');
    });

    it('recommends sell when delta is negative and significant', () => {
        expect(getAction(-50000)).toBe('▼ Sell');
        expect(getAction(-1000)).toBe('▼ Sell');
    });

    it('recommends on-target when delta is within tolerance', () => {
        expect(getAction(99)).toBe('✓ On target');
        expect(getAction(-99)).toBe('✓ On target');
        expect(getAction(0)).toBe('✓ On target');
    });

    it('recommends buy exactly at tolerance boundary', () => {
        expect(getAction(100)).toBe('▲ Buy');
    });

    it('recommends sell exactly at tolerance boundary', () => {
        expect(getAction(-100)).toBe('▼ Sell');
    });
});

describe('rebalancing - ASSET_CLASSES constant', () => {
    it('contains all expected asset classes', () => {
        expect(ASSET_CLASSES).toHaveLength(6);
        const keys = ASSET_CLASSES.map(a => a.key);
        expect(keys).toContain('savings');
        expect(keys).toContain('fixedDeposits');
        expect(keys).toContain('mutualFunds');
        expect(keys).toContain('stocks');
        expect(keys).toContain('crypto');
        expect(keys).toContain('epfPpf');
    });

    it('has unique keys', () => {
        const keys = ASSET_CLASSES.map(a => a.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
    });

    it('has unique labels', () => {
        const labels = ASSET_CLASSES.map(a => a.label);
        const uniqueLabels = new Set(labels);
        expect(uniqueLabels.size).toBe(labels.length);
    });

    it('has valid hex color codes', () => {
        ASSET_CLASSES.forEach(a => {
            expect(a.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
    });

    it('has non-empty labels', () => {
        ASSET_CLASSES.forEach(a => {
            expect(a.label).toBeTruthy();
            expect(typeof a.label).toBe('string');
        });
    });

    it('has non-empty keys', () => {
        ASSET_CLASSES.forEach(a => {
            expect(a.key).toBeTruthy();
            expect(typeof a.key).toBe('string');
        });
    });
});

describe('rebalancing - target validation', () => {
    it('detects when targets sum to exactly 100%', () => {
        const targets = { savings: 20, mutualFunds: 40, stocks: 30, crypto: 10 };
        const total = totalTargets(targets);
        expect(Math.abs(total - 100)).toBeLessThanOrEqual(1);
    });

    it('detects when targets sum to less than 100%', () => {
        const targets = { savings: 20, mutualFunds: 30, stocks: 20 };
        const total = totalTargets(targets);
        expect(total).toBeLessThan(100);
    });

    it('detects when targets sum to more than 100%', () => {
        const targets = { savings: 30, mutualFunds: 50, stocks: 30 };
        const total = totalTargets(targets);
        expect(total).toBeGreaterThan(100);
    });

    it('handles targets with decimal values', () => {
        const targets = { savings: 20.5, mutualFunds: 40.5, stocks: 39 };
        const total = totalTargets(targets);
        expect(total).toBeCloseTo(100, 1);
    });
});
