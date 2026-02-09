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
    static formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    static formatDate(dateString) {
        if (!dateString || dateString === 'NA') return 'NA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static async getSettings(dbManager) {
        const settings = await dbManager.getAll('settings');
        return settings[0] || INITIAL_DATA.settings;
    }

    static calculatePL(invested, current) {
        const pl = current - invested;
        const plPercent = invested > 0 ? ((pl / invested) * 100).toFixed(2) : 0;
        return { pl, plPercent };
    }

    static exportData(data, filename = 'finance-backup.json') {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    static async importData(file, dbManager) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    static showNotification(message, type = 'success') {
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
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    static showConfirm(message) {
        return new Promise((resolve) => {
            const confirmed = confirm(message);
            resolve(confirmed);
        });
    }
}