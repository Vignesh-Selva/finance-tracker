const INITIAL_DATA = {
    savings: [],
    fixedDeposits: [],
    mutualFunds: [],
    stocks: [],
    crypto: [],
    liabilities: [],
    transactions: [],
    budgets: [],
    settings: {
        id: 1,
        currency: 'INR',
        goal: 15000000,
        epf: 0,
        ppf: 0,
        theme: 'light',
        lastSync: new Date().toISOString()
    }
};

class Utilities {
    /**
     * Format currency with proper validation
     */
    static formatCurrency(amount) {
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
    }

    /**
     * Format date with validation
     */
    static formatDate(dateString) {
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
    }

    /**
     * Get settings with fallback
     */
    static async getSettings(dbManager) {
        try {
            const settings = await dbManager.getAll('settings');
            return settings[0] || INITIAL_DATA.settings;
        } catch (error) {
            console.error('Get settings error:', error);
            return INITIAL_DATA.settings;
        }
    }

    /**
     * Calculate profit/loss with validation
     */
    static calculatePL(invested, current) {
        try {
            const inv = parseFloat(invested) || 0;
            const cur = parseFloat(current) || 0;

            const pl = cur - inv;
            const plPercent = inv > 0 ? ((pl / inv) * 100).toFixed(2) : 0;

            // Ensure no NaN or Infinity
            return {
                pl: isNaN(pl) || !isFinite(pl) ? 0 : pl,
                plPercent: isNaN(plPercent) || !isFinite(plPercent) ? 0 : plPercent
            };
        } catch (error) {
            console.error('P/L calculation error:', error);
            return { pl: 0, plPercent: 0 };
        }
    }

    /**
     * Export data to JSON file
     */
    static exportData(data, filename = 'finance-backup.json') {
        try {
            // Sanitize the data before export
            const sanitizedData = this.sanitizeExportData(data);

            const dataStr = JSON.stringify(sanitizedData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export data error:', error);
            throw new Error('Failed to export data');
        }
    }

    /**
     * Sanitize data for export (remove internal IDs, clean up)
     */
    static sanitizeExportData(data) {
        try {
            const sanitized = {};

            for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    sanitized[key] = value.map(item => {
                        const cleanItem = { ...item };
                        // Keep ID for import compatibility
                        return cleanItem;
                    });
                } else {
                    sanitized[key] = value;
                }
            }

            return sanitized;
        } catch (error) {
            console.error('Data sanitization error:', error);
            return data;
        }
    }

    /**
     * Import data from JSON file
     */
    static async importData(file, dbManager) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            // Validate file type
            if (!file.name.endsWith('.json')) {
                reject(new Error('Invalid file type. Please select a JSON file.'));
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('File size too large. Maximum size is 10MB.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate data structure
                    if (!data || typeof data !== 'object') {
                        reject(new Error('Invalid data format'));
                        return;
                    }

                    resolve(data);
                } catch (error) {
                    console.error('Import parse error:', error);
                    reject(new Error('Failed to parse JSON file: ' + error.message));
                }
            };

            reader.onerror = () => {
                console.error('File read error:', reader.error);
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Toggle theme between light and dark
     */
    static toggleTheme() {
        try {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        } catch (error) {
            console.error('Theme toggle error:', error);
        }
    }

    /**
     * Show notification with auto-dismiss
     */
    static showNotification(message, type = 'success') {
        try {
            // Remove any existing notifications first
            const existing = document.querySelectorAll('.notification');
            existing.forEach(n => n.remove());

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                background: ${type === 'success' ? '#10b981' : '#ef4444'};
                color: white;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                word-wrap: break-word;
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }, 3000);
        } catch (error) {
            console.error('Notification error:', error);
        }
    }

    /**
     * Show confirmation dialog
     */
    static showConfirm(message) {
        return new Promise((resolve) => {
            try {
                const confirmed = confirm(message);
                resolve(confirmed);
            } catch (error) {
                console.error('Confirm dialog error:', error);
                resolve(false);
            }
        });
    }

    /**
     * Sanitize string input to prevent XSS
     */
    static sanitizeString(str) {
        if (!str) return '';

        try {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        } catch (error) {
            console.error('String sanitization error:', error);
            return String(str).replace(/[<>]/g, '');
        }
    }

    /**
     * Validate and sanitize number input
     */
    static sanitizeNumber(num, allowNegative = false) {
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
    }

    /**
     * Deep clone object safely
     */
    static deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Deep clone error:', error);
            return obj;
        }
    }

    /**
     * Format large numbers (e.g., 1000000 -> 10L)
     */
    static formatLargeNumber(num) {
        try {
            const number = parseFloat(num);

            if (isNaN(number)) return '0';

            if (number >= 10000000) {
                return (number / 10000000).toFixed(2) + ' Cr';
            } else if (number >= 100000) {
                return (number / 100000).toFixed(2) + ' L';
            } else if (number >= 1000) {
                return (number / 1000).toFixed(2) + ' K';
            }

            return number.toFixed(2);
        } catch (error) {
            console.error('Large number formatting error:', error);
            return '0';
        }
    }
}

// Add CSS animations if not already present
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;

    if (document.head && !document.getElementById('utils-animations')) {
        style.id = 'utils-animations';
        document.head.appendChild(style);
    }
}