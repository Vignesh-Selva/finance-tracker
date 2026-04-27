import { FormatUtils } from './formatUtils.js';
import { FinanceUtils } from './financeUtils.js';
import { SanitizeUtils } from './sanitizeUtils.js';
import { DataUtils } from './dataUtils.js';

const Utilities = {
    ...FormatUtils,
    ...FinanceUtils,
    ...SanitizeUtils,
    ...DataUtils,

    toggleTheme() {
        try {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        } catch (error) {
            console.error('Theme toggle error:', error);
        }
    },

    showNotification(message, type = 'success') {
        try {
            const existing = document.querySelectorAll('.notification');
            existing.forEach(n => n.remove());

            const bgMap = {
                success: '#10b981',
                error: '#dc2626',
                warning: '#d97706',
                info: '#3b82f6',
            };
            const textMap = {
                warning: '#1a1a1a',
            };

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
            notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
            notification.textContent = message;

            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                background: ${bgMap[type] || bgMap.success};
                color: ${textMap[type] || 'white'};
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
    },

    showConfirm(message) {
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
};

export default Utilities;

if (typeof window !== 'undefined') {
    window.Utilities = Utilities;
}

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
