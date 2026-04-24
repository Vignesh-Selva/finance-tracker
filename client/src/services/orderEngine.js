/**
 * Order engine — Weighted Average Cost (WAC) computation from order history.
 * All position values are computed in the application layer, not stored.
 */

/**
 * Compute the derived portfolio position from a set of orders using WAC.
 *
 * WAC rules:
 *   Buy  → new_wac = (existing_cost + buy_amount + buy_charges) / (existing_units + buy_units)
 *   Sell → wac unchanged; sold units removed from position at current wac
 *
 * @param {Array}  orders     — array of order objects for a single holding
 * @param {string} unitsField — field name for the units/quantity value ('units' or 'quantity')
 * @returns {{ units: number, wac: number, invested: number }}
 */
export function computeDerivedPosition(orders, unitsField = 'units') {
    if (!orders || orders.length === 0) {
        return { units: 0, wac: 0, invested: 0 };
    }

    const sorted = [...orders].sort(
        (a, b) => new Date(a.execution_date) - new Date(b.execution_date)
    );

    let units = 0;
    let totalCost = 0;

    for (const order of sorted) {
        const qty = parseFloat(order[unitsField]) || 0;
        const amt = parseFloat(order.amount) || 0;
        const chg = parseFloat(order.charges) || 0;

        if (order.order_type === 'Buy') {
            totalCost += amt + chg;
            units += qty;
        } else if (order.order_type === 'Sell' && units > 0) {
            const currentWac = totalCost / units;
            const sellUnits = Math.min(qty, units);
            totalCost -= currentWac * sellUnits;
            units -= sellUnits;
        }
    }

    units = Math.max(0, parseFloat(units.toFixed(8)));
    const wac = units > 0 ? totalCost / units : 0;
    const invested = parseFloat(totalCost.toFixed(2));

    return { units, wac, invested };
}

/**
 * Group an array of orders by holding ID into a Map.
 *
 * @param {Array}  orders         — flat array of orders across multiple holdings
 * @param {string} holdingIdField — field name for the holding FK ('mf_id', 'stock_id', 'crypto_id')
 * @returns {Map<string, Array>}
 */
export function groupOrdersByHolding(orders, holdingIdField) {
    const map = new Map();
    for (const order of orders) {
        const hid = order[holdingIdField];
        if (!map.has(hid)) map.set(hid, []);
        map.get(hid).push(order);
    }
    return map;
}
