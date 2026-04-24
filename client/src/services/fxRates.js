const FX_CACHE_KEY = 'fx_rates_cache_v1';
const FX_TTL_MS = 4 * 60 * 60 * 1000;

function loadCache() {
    try { return JSON.parse(localStorage.getItem(FX_CACHE_KEY) || 'null'); } catch { return null; }
}

function saveCache(base, rates) {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ base, rates, ts: Date.now() }));
}

export async function fetchFXRates(base = 'INR') {
    const cached = loadCache();
    if (cached && cached.base === base && Date.now() - cached.ts < FX_TTL_MS) {
        return cached.rates;
    }

    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        const json = await res.json();
        if (json.result === 'success') {
            saveCache(base, json.rates);
            return json.rates;
        }
    } catch {
        // silently fall back to cache or empty
    }

    return cached?.rates || {};
}

export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;
    if (!rates || Object.keys(rates).length === 0) return amount;

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (rates[to] && rates[from]) {
        return (amount / rates[from]) * rates[to];
    }

    return amount;
}

export const COMMON_CURRENCIES = [
    'INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'AUD', 'CAD', 'CHF',
];
