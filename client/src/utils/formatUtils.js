const CURRENCY_CONFIG = {
    INR: { symbol: '₹', locale: 'en-IN' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
    JPY: { symbol: '¥', locale: 'ja-JP' },
    AED: { symbol: 'AED ', locale: 'ar-AE' },
    SGD: { symbol: 'S$', locale: 'en-SG' },
    AUD: { symbol: 'A$', locale: 'en-AU' },
    CAD: { symbol: 'C$', locale: 'en-CA' },
    CHF: { symbol: 'CHF ', locale: 'de-CH' },
};

let _displayCurrency = 'INR';
let _fxRates = {};
let _baseCurrency = 'INR';

export function setDisplayCurrency(currency, rates = {}, base = 'INR') {
    _displayCurrency = currency ? currency.toUpperCase() : 'INR';
    _fxRates = rates;
    _baseCurrency = base ? base.toUpperCase() : 'INR';
}

function convertForDisplay(amount) {
    if (_displayCurrency === _baseCurrency) return amount;
    if (!_fxRates || Object.keys(_fxRates).length === 0) return amount;
    const rate = _fxRates[_displayCurrency];
    if (!rate) return amount;
    const baseRate = _fxRates[_baseCurrency];
    if (!baseRate) return amount;
    return (amount / baseRate) * rate;
}

export const FormatUtils = {
    formatCurrency(amount) {
        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                const cfg = CURRENCY_CONFIG[_displayCurrency] || CURRENCY_CONFIG.INR;
                return cfg.symbol + '0.00';
            }
            const converted = convertForDisplay(numAmount);
            const cfg = CURRENCY_CONFIG[_displayCurrency] || CURRENCY_CONFIG.INR;
            return cfg.symbol + converted.toLocaleString(cfg.locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch {
            return '₹0.00';
        }
    },

    formatDate(dateString) {
        if (!dateString || dateString === 'NA') return 'NA';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid Date';
        }
    },

    formatLargeNumber(num) {
        try {
            const number = parseFloat(num);
            if (isNaN(number)) return '0';

            if (number >= 10000000) {
                return (number / 10000000).toFixed(2) + ' Cr';
            }
            if (number >= 100000) {
                return (number / 100000).toFixed(2) + ' L';
            }
            if (number >= 1000) {
                return (number / 1000).toFixed(2) + ' K';
            }
            return number.toFixed(2);
        } catch (error) {
            console.error('Large number formatting error:', error);
            return '0';
        }
    }
};
