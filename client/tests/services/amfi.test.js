import { describe, it, expect } from 'vitest';
import { getBenchmarkForCategory, getBenchmarkReturns, computeAlpha } from '../../src/services/amfi.js';

describe('amfi.js (benchmark functions)', () => {
    describe('getBenchmarkForCategory', () => {
        it('returns Nifty 50 TRI for Large Cap category', () => {
            expect(getBenchmarkForCategory('Large Cap')).toBe('Nifty 50 TRI');
        });

        it('returns Nifty 50 TRI for Large Cap Fund category', () => {
            expect(getBenchmarkForCategory('Large Cap Fund')).toBe('Nifty 50 TRI');
        });

        it('returns Nifty Midcap 150 TRI for Mid Cap category', () => {
            expect(getBenchmarkForCategory('Mid Cap')).toBe('Nifty Midcap 150 TRI');
        });

        it('returns Nifty Midcap 150 TRI for Mid Cap Fund category', () => {
            expect(getBenchmarkForCategory('Mid Cap Fund')).toBe('Nifty Midcap 150 TRI');
        });

        it('returns Nifty Smallcap 250 TRI for Small Cap category', () => {
            expect(getBenchmarkForCategory('Small Cap')).toBe('Nifty Smallcap 250 TRI');
        });

        it('returns Nifty Smallcap 250 TRI for Small Cap Fund category', () => {
            expect(getBenchmarkForCategory('Small Cap Fund')).toBe('Nifty Smallcap 250 TRI');
        });

        it('returns Nifty 500 TRI for Flexi Cap category', () => {
            expect(getBenchmarkForCategory('Flexi Cap')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for Multi Cap category', () => {
            expect(getBenchmarkForCategory('Multi Cap')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for ELSS category', () => {
            expect(getBenchmarkForCategory('ELSS')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for Value Fund category', () => {
            expect(getBenchmarkForCategory('Value Fund')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for Focused Fund category', () => {
            expect(getBenchmarkForCategory('Focused Fund')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for Contra Fund category', () => {
            expect(getBenchmarkForCategory('Contra Fund')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for Dividend Yield Fund category', () => {
            expect(getBenchmarkForCategory('Dividend Yield Fund')).toBe('Nifty 500 TRI');
        });

        it('returns Nasdaq 100 for International category', () => {
            expect(getBenchmarkForCategory('International')).toBe('Nasdaq 100');
        });

        it('returns Nifty 500 TRI for unknown category', () => {
            expect(getBenchmarkForCategory('Unknown Category')).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for null/undefined category', () => {
            expect(getBenchmarkForCategory(null)).toBe('Nifty 500 TRI');
            expect(getBenchmarkForCategory(undefined)).toBe('Nifty 500 TRI');
        });

        it('returns Nifty 500 TRI for empty string', () => {
            expect(getBenchmarkForCategory('')).toBe('Nifty 500 TRI');
        });

        it('is case-insensitive for category matching', () => {
            expect(getBenchmarkForCategory('large cap')).toBe('Nifty 50 TRI');
            expect(getBenchmarkForCategory('LARGE CAP')).toBe('Nifty 50 TRI');
            expect(getBenchmarkForCategory('LaRgE CaP')).toBe('Nifty 50 TRI');
        });

        it('matches partial category names', () => {
            expect(getBenchmarkForCategory('Large Cap Fund - Direct')).toBe('Nifty 50 TRI');
            expect(getBenchmarkForCategory('Mid Cap Fund - Growth')).toBe('Nifty Midcap 150 TRI');
        });
    });

    describe('getBenchmarkReturns', () => {
        it('returns correct returns for Nifty 50 TRI', () => {
            const result = getBenchmarkReturns('Nifty 50 TRI');
            expect(result).toEqual({ return1Y: 7.5, return3Y: 13.0, return5Y: 16.5 });
        });

        it('returns correct returns for Nifty Midcap 150 TRI', () => {
            const result = getBenchmarkReturns('Nifty Midcap 150 TRI');
            expect(result).toEqual({ return1Y: 12.0, return3Y: 22.0, return5Y: 26.0 });
        });

        it('returns correct returns for Nifty Smallcap 250 TRI', () => {
            const result = getBenchmarkReturns('Nifty Smallcap 250 TRI');
            expect(result).toEqual({ return1Y: 8.0, return3Y: 20.0, return5Y: 28.0 });
        });

        it('returns correct returns for Nifty 500 TRI', () => {
            const result = getBenchmarkReturns('Nifty 500 TRI');
            expect(result).toEqual({ return1Y: 8.5, return3Y: 15.0, return5Y: 18.0 });
        });

        it('returns correct returns for Nasdaq 100', () => {
            const result = getBenchmarkReturns('Nasdaq 100');
            expect(result).toEqual({ return1Y: 10.0, return3Y: 9.0, return5Y: 18.0 });
        });

        it('returns correct returns for S&P 500', () => {
            const result = getBenchmarkReturns('S&P 500');
            expect(result).toEqual({ return1Y: 8.0, return3Y: 8.5, return5Y: 14.0 });
        });

        it('returns Nifty 500 TRI as default for unknown benchmark', () => {
            const result = getBenchmarkReturns('Unknown Benchmark');
            expect(result).toEqual({ return1Y: 8.5, return3Y: 15.0, return5Y: 18.0 });
        });

        it('returns Nifty 500 TRI for null/undefined benchmark', () => {
            expect(getBenchmarkReturns(null)).toEqual({ return1Y: 8.5, return3Y: 15.0, return5Y: 18.0 });
            expect(getBenchmarkReturns(undefined)).toEqual({ return1Y: 8.5, return3Y: 15.0, return5Y: 18.0 });
        });
    });

    describe('computeAlpha', () => {
        it('computes alpha correctly for positive outperformance', () => {
            const result = computeAlpha(15.0, 'Large Cap');
            expect(result.alpha).toBe(7.5); // 15.0 - 7.5
            expect(result.benchmarkName).toBe('Nifty 50 TRI');
            expect(result.benchmarkReturn1Y).toBe(7.5);
            expect(result.benchmarkReturn3Y).toBe(13.0);
            expect(result.benchmarkReturn5Y).toBe(16.5);
        });

        it('computes alpha correctly for negative underperformance', () => {
            const result = computeAlpha(5.0, 'Large Cap');
            expect(result.alpha).toBe(-2.5); // 5.0 - 7.5
            expect(result.benchmarkName).toBe('Nifty 50 TRI');
        });

        it('computes alpha correctly for zero alpha', () => {
            const result = computeAlpha(7.5, 'Large Cap');
            expect(result.alpha).toBe(0); // 7.5 - 7.5
        });

        it('returns null alpha when fundReturn1Y is null', () => {
            const result = computeAlpha(null, 'Large Cap');
            expect(result.alpha).toBeNull();
            expect(result.benchmarkName).toBe('Nifty 50 TRI');
        });

        it('returns NaN alpha when fundReturn1Y is undefined', () => {
            const result = computeAlpha(undefined, 'Large Cap');
            expect(result.alpha).toBeNaN();
        });

        it('handles decimal fund returns correctly', () => {
            const result = computeAlpha(12.34, 'Mid Cap');
            expect(result.alpha).toBeCloseTo(0.34, 2); // 12.34 - 12.0
        });

        it('uses default benchmark for unknown category', () => {
            const result = computeAlpha(10.0, 'Unknown Category');
            expect(result.benchmarkName).toBe('Nifty 500 TRI');
            expect(result.alpha).toBe(1.5); // 10.0 - 8.5
        });

        it('handles null/undefined category', () => {
            const result = computeAlpha(10.0, null);
            expect(result.benchmarkName).toBe('Nifty 500 TRI');
            expect(result.alpha).toBe(1.5);
        });

        it('returns all benchmark return periods', () => {
            const result = computeAlpha(10.0, 'Large Cap');
            expect(result).toHaveProperty('alpha');
            expect(result).toHaveProperty('benchmarkName');
            expect(result).toHaveProperty('benchmarkReturn1Y');
            expect(result).toHaveProperty('benchmarkReturn3Y');
            expect(result).toHaveProperty('benchmarkReturn5Y');
        });

        it('rounds alpha to 2 decimal places', () => {
            const result = computeAlpha(12.3456, 'Large Cap');
            expect(result.alpha).toBe(4.85); // 12.3456 - 7.5 = 4.8456 → 4.85
        });
    });
});
