import { describe, it, expect, beforeEach, vi } from 'vitest';

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

describe('rebalancing - Financial Planning: emergency fund calculations', () => {
    function calculateEmergencyFund(efAmt, expenses, targetMonths) {
        const efMonths = expenses > 0 ? efAmt / expenses : 0;
        const efThreshold = expenses * targetMonths;
        const efExcess = Math.max(0, efAmt - efThreshold);
        const efLabel = efExcess > 0 ? '✓ Above target' : efMonths >= targetMonths ? '✓ Adequate' : efMonths >= (targetMonths / 2) ? '⚠ Partial' : '✗ Insufficient';
        return { efMonths, efThreshold, efExcess, efLabel };
    }

    it('calculates months of expenses correctly', () => {
        const { efMonths } = calculateEmergencyFund(600000, 100000, 6);
        expect(efMonths).toBe(6);
    });

    it('calculates threshold correctly for 6-month target', () => {
        const { efThreshold } = calculateEmergencyFund(600000, 100000, 6);
        expect(efThreshold).toBe(600000);
    });

    it('calculates threshold correctly for 12-month target', () => {
        const { efThreshold } = calculateEmergencyFund(1200000, 100000, 12);
        expect(efThreshold).toBe(1200000);
    });

    it('calculates excess correctly when above target', () => {
        const { efExcess } = calculateEmergencyFund(900000, 100000, 6);
        expect(efExcess).toBe(300000);
    });

    it('shows "Above target" label when excess exists', () => {
        const { efLabel } = calculateEmergencyFund(900000, 100000, 6);
        expect(efLabel).toBe('✓ Above target');
    });

    it('shows "Adequate" label when at target without excess', () => {
        const { efLabel } = calculateEmergencyFund(600000, 100000, 6);
        expect(efLabel).toBe('✓ Adequate');
    });

    it('shows "Partial" label when between 50% and 100% of target', () => {
        const { efLabel } = calculateEmergencyFund(300000, 100000, 6);
        expect(efLabel).toBe('⚠ Partial');
    });

    it('shows "Insufficient" label when below 50% of target', () => {
        const { efLabel } = calculateEmergencyFund(200000, 100000, 6);
        expect(efLabel).toBe('✗ Insufficient');
    });

    it('handles zero expenses gracefully', () => {
        const { efMonths } = calculateEmergencyFund(600000, 0, 6);
        expect(efMonths).toBe(0);
    });

    it('handles zero emergency fund amount', () => {
        const { efMonths, efLabel } = calculateEmergencyFund(0, 100000, 6);
        expect(efMonths).toBe(0);
        expect(efLabel).toBe('✗ Insufficient');
    });
});

describe('rebalancing - Financial Planning: insurance recommendations', () => {
    function getInsuranceRecommendation(efMonths, targetMonths, lifeIns, healthIns, maritalStatus, healthInsSpouse, dependents, healthInsDep) {
        const hasEmergencyFund = efMonths >= targetMonths;
        const hasLifeInsurance = lifeIns;
        const hasHealthInsurance = healthIns;
        const hasSpouseHealthInsurance = maritalStatus === 'married' ? healthInsSpouse : true;
        const hasDependentHealthInsurance = dependents > 0 ? healthInsDep : true;
        const hasInsurance = hasLifeInsurance && hasHealthInsurance && hasSpouseHealthInsurance && hasDependentHealthInsurance;

        if (!hasEmergencyFund) return 'Build Emergency Fund First';
        if (hasEmergencyFund && !hasInsurance) return 'Get Insurance Coverage';
        if (hasEmergencyFund && hasInsurance) return 'Ready to Invest';
        return 'Unknown';
    }

    it('recommends building emergency fund first when insufficient', () => {
        const recommendation = getInsuranceRecommendation(2, 6, false, false, 'single', false, 0, false);
        expect(recommendation).toBe('Build Emergency Fund First');
    });

    it('recommends insurance when emergency fund adequate but no insurance', () => {
        const recommendation = getInsuranceRecommendation(6, 6, false, false, 'single', false, 0, false);
        expect(recommendation).toBe('Get Insurance Coverage');
    });

    it('recommends ready to invest when emergency fund and insurance in place', () => {
        const recommendation = getInsuranceRecommendation(6, 6, true, true, 'single', false, 0, false);
        expect(recommendation).toBe('Ready to Invest');
    });

    it('requires spouse insurance when married', () => {
        const recommendation = getInsuranceRecommendation(6, 6, true, true, 'married', false, 0, false);
        expect(recommendation).toBe('Get Insurance Coverage');
    });

    it('requires dependent insurance when dependents > 0', () => {
        const recommendation = getInsuranceRecommendation(6, 6, true, true, 'married', true, 2, false);
        expect(recommendation).toBe('Get Insurance Coverage');
    });

    it('does not require spouse insurance when single', () => {
        const recommendation = getInsuranceRecommendation(6, 6, true, true, 'single', false, 0, false);
        expect(recommendation).toBe('Ready to Invest');
    });

    it('does not require dependent insurance when no dependents', () => {
        const recommendation = getInsuranceRecommendation(6, 6, true, true, 'married', true, 0, false);
        expect(recommendation).toBe('Ready to Invest');
    });
});

describe('rebalancing - Financial Planning: localStorage helpers', () => {
    const planKey = (pid) => `fin_plan_v1_${pid}`;

    function loadPlan(pid) {
        try { return JSON.parse(localStorage.getItem(planKey(pid)) || 'null') || { sips: [], ppf: 0, varMin: 0, varExpected: 0 }; } catch { return { sips: [], ppf: 0, varMin: 0, varExpected: 0 }; }
    }

    function savePlan(pid, plan) {
        localStorage.setItem(planKey(pid), JSON.stringify(plan));
    }

    beforeEach(() => {
        localStorageMock.getItem.mockReturnValue(null);
        localStorageMock.setItem.mockImplementation(() => {});
        localStorageMock.clear.mockImplementation(() => {});
    });

    it('loads default plan when none saved', () => {
        const plan = loadPlan(1);
        expect(plan).toEqual({ sips: [], ppf: 0, varMin: 0, varExpected: 0 });
    });

    it('loads saved plan', () => {
        const savedPlan = { sips: [{ name: 'Test', amount: 1000, outflow: 1020, bucket: 'Equity' }], ppf: 500, varMin: 10000, varExpected: 20000 };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPlan));
        const plan = loadPlan(1);
        expect(plan).toEqual(savedPlan);
    });

    it('saves plan to localStorage', () => {
        const plan = { sips: [], ppf: 500, varMin: 0, varExpected: 0 };
        savePlan(1, plan);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('fin_plan_v1_1', JSON.stringify(plan));
    });

    it('uses correct key for different portfolio IDs', () => {
        savePlan(1, { sips: [], ppf: 0, varMin: 0, varExpected: 0 });
        savePlan(2, { sips: [], ppf: 0, varMin: 0, varExpected: 0 });
        expect(localStorageMock.setItem).toHaveBeenCalledWith('fin_plan_v1_1', expect.any(String));
        expect(localStorageMock.setItem).toHaveBeenCalledWith('fin_plan_v1_2', expect.any(String));
    });
});
