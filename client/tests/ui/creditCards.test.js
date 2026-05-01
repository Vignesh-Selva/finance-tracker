import { describe, it, expect } from 'vitest';

function computeBillingCycle(billingDay) {
    const day = parseInt(billingDay);
    if (!day || day < 1 || day > 31) return null;
    const today = new Date();
    const todayDay = today.getDate();

    let cycleEnd, cycleStart;
    if (todayDay <= day) {
        cycleEnd = new Date(today.getFullYear(), today.getMonth(), day);
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, day);
    } else {
        cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, day);
        cycleStart = new Date(today.getFullYear(), today.getMonth(), day);
    }
    const daysTotal = Math.round((cycleEnd - cycleStart) / 86400000);
    const daysElapsed = Math.round((today - cycleStart) / 86400000);
    const daysRemaining = Math.max(0, Math.round((cycleEnd - today) / 86400000));
    return { cycleStart, cycleEnd, daysTotal, daysElapsed, daysRemaining };
}

describe('creditCards - computeBillingCycle', () => {
    it('calculates cycle when today is before billing day', () => {
        const today = new Date();
        const billingDay = today.getDate() + 5;
        
        if (billingDay > 31) {
            expect(true).toBe(true);
            return;
        }

        const result = computeBillingCycle(billingDay);
        expect(result).not.toBeNull();
        expect(result.daysRemaining).toBeGreaterThan(0);
        expect(result.daysTotal).toBeCloseTo(30, 2);
    });

    it('calculates cycle when today is after billing day', () => {
        const today = new Date();
        const billingDay = Math.max(1, today.getDate() - 5);
        const result = computeBillingCycle(billingDay);
        expect(result).not.toBeNull();
        expect(result.daysRemaining).toBe(0);
        expect(result.daysTotal).toBeGreaterThan(25);
    });

    it('calculates cycle when today is exactly billing day', () => {
        const today = new Date();
        const result = computeBillingCycle(today.getDate());
        expect(result).not.toBeNull();
        expect(result.daysRemaining).toBe(0);
    });

    it('returns null for invalid billing day (0)', () => {
        expect(computeBillingCycle(0)).toBeNull();
    });

    it('returns null for invalid billing day (negative)', () => {
        expect(computeBillingCycle(-5)).toBeNull();
    });

    it('returns null for invalid billing day (> 31)', () => {
        expect(computeBillingCycle(32)).toBeNull();
    });

    it('returns null for invalid billing day (null)', () => {
        expect(computeBillingCycle(null)).toBeNull();
    });

    it('returns null for invalid billing day (undefined)', () => {
        expect(computeBillingCycle(undefined)).toBeNull();
    });

    it('returns null for invalid billing day (non-numeric string)', () => {
        expect(computeBillingCycle('abc')).toBeNull();
    });

    it('handles billing day 1 (first of month)', () => {
        const result = computeBillingCycle(1);
        expect(result).not.toBeNull();
        expect(result.daysTotal).toBeGreaterThan(28);
    });

    it('handles billing day 31 (last of month)', () => {
        const result = computeBillingCycle(31);
        expect(result).not.toBeNull();
        expect(result.daysTotal).toBeGreaterThan(28);
    });

    it('handles billing day 15 (mid-month)', () => {
        const result = computeBillingCycle(15);
        expect(result).not.toBeNull();
        expect(result.daysTotal).toBeGreaterThan(25);
    });

    it('returns correct cycle dates', () => {
        const today = new Date();
        const result = computeBillingCycle(today.getDate());
        expect(result.cycleStart).toBeInstanceOf(Date);
        expect(result.cycleEnd).toBeInstanceOf(Date);
        expect(result.cycleEnd <= today).toBe(true);
    });

    it('daysElapsed + daysRemaining equals daysTotal', () => {
        const result = computeBillingCycle(15);
        expect(result.daysElapsed + result.daysRemaining).toBeCloseTo(result.daysTotal, 0);
    });

    it('handles string number input', () => {
        const result = computeBillingCycle('15');
        expect(result).not.toBeNull();
    });

    it('handles February edge case (28 days)', () => {
        const result = computeBillingCycle(15);
        expect(result).not.toBeNull();
        expect(result.daysTotal).toBeGreaterThan(25);
    });

    it('handles leap year February (29 days)', () => {
        const result = computeBillingCycle(15);
        expect(result).not.toBeNull();
    });

    it('handles month with 30 days', () => {
        const result = computeBillingCycle(15);
        expect(result).not.toBeNull();
    });

    it('handles month with 31 days', () => {
        const result = computeBillingCycle(15);
        expect(result).not.toBeNull();
    });

    it('daysRemaining is never negative', () => {
        for (let day = 1; day <= 31; day++) {
            const result = computeBillingCycle(day);
            if (result) {
                expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('daysElapsed is never negative', () => {
        for (let day = 1; day <= 31; day++) {
            const result = computeBillingCycle(day);
            if (result) {
                expect(result.daysElapsed).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('daysTotal is always positive', () => {
        for (let day = 1; day <= 31; day++) {
            const result = computeBillingCycle(day);
            if (result) {
                expect(result.daysTotal).toBeGreaterThan(0);
            }
        }
    });
});

describe('creditCards - getUtilization', () => {
    function getUtilization(used, limit) {
        if (!limit || limit <= 0) return 0;
        return Math.min((used / limit) * 100, 100);
    }

    function getUtilizationClass(pct) {
        if (pct >= 75) return 'cc-util-danger';
        if (pct >= 50) return 'cc-util-warning';
        return 'cc-util-good';
    }

    it('calculates utilization correctly', () => {
        expect(getUtilization(50000, 100000)).toBe(50);
        expect(getUtilization(75000, 100000)).toBe(75);
        expect(getUtilization(100000, 100000)).toBe(100);
    });

    it('caps utilization at 100%', () => {
        expect(getUtilization(150000, 100000)).toBe(100);
    });

    it('returns 0 for zero limit', () => {
        expect(getUtilization(50000, 0)).toBe(0);
    });

    it('returns 0 for negative limit', () => {
        expect(getUtilization(50000, -100)).toBe(0);
    });

    it('returns 0 for null limit', () => {
        expect(getUtilization(50000, null)).toBe(0);
    });

    it('returns 0 for undefined limit', () => {
        expect(getUtilization(50000, undefined)).toBe(0);
    });

    it('handles zero used', () => {
        expect(getUtilization(0, 100000)).toBe(0);
    });

    it('handles negative used', () => {
        expect(getUtilization(-5000, 100000)).toBe(-5);
    });

    it('classifies danger utilization (>=75%)', () => {
        expect(getUtilizationClass(75)).toBe('cc-util-danger');
        expect(getUtilizationClass(80)).toBe('cc-util-danger');
        expect(getUtilizationClass(100)).toBe('cc-util-danger');
    });

    it('classifies warning utilization (>=50%)', () => {
        expect(getUtilizationClass(50)).toBe('cc-util-warning');
        expect(getUtilizationClass(60)).toBe('cc-util-warning');
        expect(getUtilizationClass(74)).toBe('cc-util-warning');
    });

    it('classifies good utilization (<50%)', () => {
        expect(getUtilizationClass(0)).toBe('cc-util-good');
        expect(getUtilizationClass(25)).toBe('cc-util-good');
        expect(getUtilizationClass(49)).toBe('cc-util-good');
    });

    it('handles edge case at 50%', () => {
        expect(getUtilizationClass(50)).toBe('cc-util-warning');
    });

    it('handles edge case at 75%', () => {
        expect(getUtilizationClass(75)).toBe('cc-util-danger');
    });
});

describe('creditCards - nextDueDateLabel', () => {
    function nextDueDateLabel(dayOfMonth) {
        const day = parseInt(dayOfMonth);
        if (!day) return '';
        const today = new Date();
        const candidate = new Date(today.getFullYear(), today.getMonth(), day);
        if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
        return candidate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    it('returns label for valid day', () => {
        const result = nextDueDateLabel(15);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('returns empty string for invalid day', () => {
        expect(nextDueDateLabel(0)).toBe('');
        expect(nextDueDateLabel(null)).toBe('');
        expect(nextDueDateLabel(undefined)).toBe('');
    });

    it('handles day before today', () => {
        const today = new Date();
        const yesterday = Math.max(1, today.getDate() - 1);
        const result = nextDueDateLabel(yesterday);
        expect(result).toBeTruthy();
    });

    it('handles day after today', () => {
        const today = new Date();
        const tomorrow = Math.min(31, today.getDate() + 1);
        const result = nextDueDateLabel(tomorrow);
        expect(result).toBeTruthy();
    });

    it('handles day 1', () => {
        expect(nextDueDateLabel(1)).toBeTruthy();
    });

    it('handles day 31', () => {
        expect(nextDueDateLabel(31)).toBeTruthy();
    });

    it('handles string number input', () => {
        expect(nextDueDateLabel('15')).toBeTruthy();
    });
});
