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
        } catch (error) {
            console.error('P/L calculation error:', error);
            return { pl: 0, plPercent: 0 };
        }
    }
};

export default FinanceUtils;
