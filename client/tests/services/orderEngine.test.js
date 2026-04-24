import { describe, it, expect } from 'vitest';
import { computeDerivedPosition, groupOrdersByHolding } from '../../src/services/orderEngine.js';

describe('orderEngine', () => {
    describe('computeDerivedPosition', () => {
        it('returns zero position for empty orders array', () => {
            const result = computeDerivedPosition([]);
            expect(result).toEqual({ units: 0, wac: 0, invested: 0 });
        });

        it('returns zero position for null/undefined input', () => {
            expect(computeDerivedPosition(null)).toEqual({ units: 0, wac: 0, invested: 0 });
            expect(computeDerivedPosition(undefined)).toEqual({ units: 0, wac: 0, invested: 0 });
        });

        it('computes position for single buy order', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(100);
            expect(result.invested).toBe(1000);
        });

        it('computes position for single buy order with charges', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 50 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(105); // (1000 + 50) / 10
            expect(result.invested).toBe(1050);
        });

        it('computes position for multiple buy orders (WAC)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Buy', units: 20, amount: 2200, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(30);
            expect(result.wac).toBeCloseTo(106.67, 2); // (1000 + 2200) / 30
            expect(result.invested).toBeCloseTo(3200, 0);
        });

        it('handles sell order correctly (WAC unchanged)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Sell', units: 5, amount: 600, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(5);
            expect(result.wac).toBe(100); // WAC unchanged
            expect(result.invested).toBe(500);
        });

        it('handles sell order with charges (charges ignored for sell)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Sell', units: 5, amount: 600, charges: 20 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(5);
            expect(result.wac).toBe(100);
            expect(result.invested).toBe(500);
        });

        it('handles sell of more units than owned (capped at owned)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Sell', units: 15, amount: 2000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(0);
            expect(result.wac).toBe(0);
            expect(result.invested).toBe(0);
        });

        it('handles sell before any buy (no effect)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Sell', units: 5, amount: 600, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(100);
            expect(result.invested).toBe(1000);
        });

        it('handles mixed buy and sell orders', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 100, amount: 10000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Sell', units: 30, amount: 3600, charges: 0 },
                { execution_date: '2023-03-01', order_type: 'Buy', units: 50, amount: 5500, charges: 0 },
                { execution_date: '2023-04-01', order_type: 'Sell', units: 20, amount: 2400, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(100);
            expect(result.wac).toBeCloseTo(104.17, 2); // WAC changes after sells
            expect(result.invested).toBeCloseTo(10417, 0);
        });

        it('handles orders with missing/invalid numeric values', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: '10', amount: '1000', charges: '0' },
                { execution_date: '2023-02-01', order_type: 'Buy', units: null, amount: 2000, charges: 0 },
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(300); // 2000 added to cost but 0 units
            expect(result.invested).toBeCloseTo(3000, 0);
        });

        it('handles orders with zero units', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 0, amount: 0, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result).toEqual({ units: 0, wac: 0, invested: 0 });
        });

        it('sorts orders by execution_date chronologically', () => {
            const orders = [
                { execution_date: '2023-03-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-01-01', order_type: 'Buy', units: 20, amount: 2000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Buy', units: 30, amount: 3000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(60);
            expect(result.invested).toBe(6000);
        });

        it('supports custom unitsField parameter', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', quantity: 10, amount: 1000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'quantity');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(100);
            expect(result.invested).toBe(1000);
        });

        it('handles unknown order_type (ignored)', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'Buy', units: 10, amount: 1000, charges: 0 },
                { execution_date: '2023-02-01', order_type: 'Unknown', units: 5, amount: 500, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(10);
            expect(result.wac).toBe(100);
            expect(result.invested).toBe(1000);
        });

        it('handles case-sensitive order_type', () => {
            const orders = [
                { execution_date: '2023-01-01', order_type: 'buy', units: 10, amount: 1000, charges: 0 }
            ];
            const result = computeDerivedPosition(orders, 'units');
            expect(result.units).toBe(0); // 'buy' != 'Buy', so ignored
        });
    });

    describe('groupOrdersByHolding', () => {
        it('groups orders by holding ID field', () => {
            const orders = [
                { id: 1, mf_id: 'A', order_type: 'Buy' },
                { id: 2, mf_id: 'B', order_type: 'Buy' },
                { id: 3, mf_id: 'A', order_type: 'Sell' }
            ];
            const result = groupOrdersByHolding(orders, 'mf_id');
            expect(result.size).toBe(2);
            expect(result.get('A')).toHaveLength(2);
            expect(result.get('B')).toHaveLength(1);
        });

        it('handles empty orders array', () => {
            const result = groupOrdersByHolding([], 'mf_id');
            expect(result.size).toBe(0);
        });

        it('handles null/undefined orders', () => {
            expect(() => groupOrdersByHolding(null, 'mf_id')).toThrow('orders is not iterable');
            expect(() => groupOrdersByHolding(undefined, 'mf_id')).toThrow('orders is not iterable');
        });

        it('handles orders with missing holding ID', () => {
            const orders = [
                { id: 1, mf_id: 'A', order_type: 'Buy' },
                { id: 2, order_type: 'Buy' }
            ];
            const result = groupOrdersByHolding(orders, 'mf_id');
            expect(result.size).toBe(2); // 'undefined' becomes a key
            expect(result.get('A')).toHaveLength(1);
            expect(result.get(undefined)).toHaveLength(1);
        });

        it('supports different holding ID fields', () => {
            const orders = [
                { id: 1, stock_id: 'S1', order_type: 'Buy' },
                { id: 2, crypto_id: 'C1', order_type: 'Buy' }
            ];
            const stockResult = groupOrdersByHolding(orders, 'stock_id');
            expect(stockResult.size).toBe(2);
            expect(stockResult.get('S1')).toHaveLength(1);

            const cryptoResult = groupOrdersByHolding(orders, 'crypto_id');
            expect(cryptoResult.size).toBe(2);
            expect(cryptoResult.get('C1')).toHaveLength(1);
        });

        it('preserves all order properties in grouped arrays', () => {
            const orders = [
                { id: 1, mf_id: 'A', order_type: 'Buy', units: 10, amount: 1000 },
                { id: 2, mf_id: 'A', order_type: 'Sell', units: 5, amount: 600 }
            ];
            const result = groupOrdersByHolding(orders, 'mf_id');
            const grouped = result.get('A');
            expect(grouped).toHaveLength(2);
            expect(grouped[0].id).toBe(1);
            expect(grouped[1].id).toBe(2);
        });
    });
});
