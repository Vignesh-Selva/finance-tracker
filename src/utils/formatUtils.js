export const FormatUtils = {
    formatCurrency(amount) {
        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                return '₹0.00';
            }
            return '₹' + numAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } catch (error) {
            console.error('Currency formatting error:', error);
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

export default FormatUtils;
