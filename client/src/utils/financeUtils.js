export const FinanceUtils = {
    calculatePL(invested, current) {
        try {
            const inv = parseFloat(invested) || 0;
            const cur = parseFloat(current) || 0;

            const pl = cur - inv;
            const plPercent = inv > 0 ? ((pl / inv) * 100).toFixed(2) : 0;

            return {
                pl: isNaN(pl) || !isFinite(pl) ? 0 : pl,
                plPercent: isNaN(plPercent) || !isFinite(plPercent) ? 0 : plPercent
            };
        } catch {
            return { pl: 0, plPercent: 0 };
        }
    },

    xirr(cashflows, dates, guess = 0.1) {
        if (!cashflows || cashflows.length < 2) return null;
        if (cashflows.length !== dates.length) return null;

        const parsedDates = dates.map(d => new Date(d).getTime());
        const t0 = parsedDates[0];
        const years = parsedDates.map(t => (t - t0) / (365.25 * 24 * 3600 * 1000));

        const f = (rate) => cashflows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, years[i]), 0);
        const df = (rate) => cashflows.reduce((sum, cf, i) => sum - (i > 0 ? years[i] * cf / Math.pow(1 + rate, years[i] + 1) : 0), 0);

        let rate = guess;
        for (let iter = 0; iter < 100; iter++) {
            const fv = f(rate);
            const dfv = df(rate);
            if (Math.abs(dfv) < 1e-12) break;
            const newRate = rate - fv / dfv;
            if (Math.abs(newRate - rate) < 1e-7) return isFinite(newRate) ? newRate : null;
            rate = newRate;
        }
        return isFinite(rate) ? rate : null;
    },

    xirrFromHolding(invested, current, purchaseDate) {
        try {
            const inv = parseFloat(invested) || 0;
            const cur = parseFloat(current) || 0;
            if (inv <= 0 || cur <= 0) return null;
            const dateIn = new Date(purchaseDate);
            if (isNaN(dateIn.getTime())) return null;
            const dateNow = new Date();
            if (dateNow <= dateIn) return null;
            const rate = this.xirr([-inv, cur], [dateIn, dateNow]);
            return rate !== null ? { value: (rate * 100).toFixed(2), hint: null } : null;
        } catch {
            return null;
        }
    },

    xirrFromPortfolio(orders, currentTotalValue) {
        try {
            if (!orders || orders.length === 0) return null;
            const cur = parseFloat(currentTotalValue) || 0;
            if (cur <= 0) return null;

            // Build cashflows array from orders
            const cashflows = [];
            const dates = [];
            const dateNow = new Date();

            orders.forEach(order => {
                if (!order.execution_date) return;
                const amount = parseFloat(order.amount) || 0;
                if (amount <= 0) return;

                const orderDate = new Date(order.execution_date);
                if (isNaN(orderDate.getTime())) return;

                // Buy orders are negative cashflows (outflow), Sell orders are positive (inflow)
                const cashflow = order.order_type === 'Buy' ? -amount : amount;
                cashflows.push(cashflow);
                dates.push(orderDate);
            });

            if (cashflows.length === 0) return null;

            // Add current value as positive cashflow at today's date
            cashflows.push(cur);
            dates.push(dateNow);

            // Check if we have at least 1 year of data
            const firstDate = dates[0];
            const yearsHeld = (dateNow - firstDate) / (365.25 * 24 * 3600 * 1000);
            if (yearsHeld < 1) {
                return { value: '0.00', hint: 'Need 1+ year of data for accurate XIRR' };
            }

            const rate = this.xirr(cashflows, dates);
            return rate !== null ? { value: (rate * 100).toFixed(2), hint: null } : null;
        } catch {
            return null;
        }
    }
};
