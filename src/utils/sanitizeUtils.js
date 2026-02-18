export const SanitizeUtils = {
    sanitizeString(str) {
        if (!str) return '';
        try {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        } catch (error) {
            console.error('String sanitization error:', error);
            return String(str).replace(/[<>]/g, '');
        }
    },

    sanitizeNumber(num, allowNegative = false) {
        try {
            const parsed = parseFloat(num);
            if (isNaN(parsed) || !isFinite(parsed)) {
                return 0;
            }
            if (!allowNegative && parsed < 0) {
                return 0;
            }
            return parsed;
        } catch (error) {
            console.error('Number sanitization error:', error);
            return 0;
        }
    },

    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Deep clone error:', error);
            return obj;
        }
    }
};

export default SanitizeUtils;
