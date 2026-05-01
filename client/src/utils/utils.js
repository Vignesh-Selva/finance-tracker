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
    },

    openBottomSheet(fields, actions) {
        // Remove existing sheet if any
        const existingSheet = document.getElementById('mobile-bottom-sheet');
        const existingOverlay = document.getElementById('mobile-bottom-sheet-overlay');
        if (existingSheet) existingSheet.remove();
        if (existingOverlay) existingOverlay.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'mobile-bottom-sheet-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199;
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        `;

        // Create sheet
        const sheet = document.createElement('div');
        sheet.id = 'mobile-bottom-sheet';
        sheet.style.cssText = `
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
            background: var(--surface2); border-radius: 20px 20px 0 0; padding: 24px;
            transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16,1,0.3);
            max-height: 80vh; overflow-y: auto;
        `;

        // Drag handle
        const dragHandle = document.createElement('div');
        dragHandle.style.cssText = `
            width: 36px; height: 4px; background: var(--muted2); border-radius: 2px; margin: 0 auto 20px;
        `;
        sheet.appendChild(dragHandle);

        // Fields list
        Object.entries(fields).forEach(([label, value]) => {
            const fieldRow = document.createElement('div');
            fieldRow.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 0; border-bottom: 1px solid var(--border);
            `;
            fieldRow.innerHTML = `
                <span style="font-family: var(--font-mono); font-size: 12px; color: var(--muted);">${label}</span>
                <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); font-weight: 500;">${value}</span>
            `;
            sheet.appendChild(fieldRow);
        });

        // Actions (Edit and Delete buttons)
        if (actions && actions.length > 0) {
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.label;
                btn.style.cssText = `
                    width: 100%; padding: 12px; margin-top: 12px;
                    border-radius: 12px; border: 1px solid var(--border);
                    background: var(--surface3); color: var(--text-primary);
                    font-family: var(--font-ui); font-size: 14px; font-weight: 600; cursor: pointer;
                    transition: all 0.2s;
                `;
                btn.onmouseenter = () => {
                    btn.style.background = 'var(--bg-elevated)';
                    btn.style.borderColor = 'var(--border2)';
                };
                btn.onmouseleave = () => {
                    btn.style.background = 'var(--surface3)';
                    btn.style.borderColor = 'var(--border)';
                };
                btn.onclick = action.onClick;
                sheet.appendChild(btn);
            });
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            width: 100%; padding: 12px; margin-top: 12px;
            border-radius: 12px; border: 1px solid var(--border);
            background: transparent; color: var(--muted);
            font-family: var(--font-ui); font-size: 14px; font-weight: 600; cursor: pointer;
            transition: all 0.2s;
        `;
        closeBtn.onmouseenter = () => {
            closeBtn.style.background = 'var(--surface3)';
            closeBtn.style.borderColor = 'var(--border2)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.borderColor = 'var(--border)';
        };
        closeBtn.onclick = closeSheet;
        sheet.appendChild(closeBtn);

        // Function to close sheet
        function closeSheet() {
            sheet.style.transform = 'translateY(100%)';
            setTimeout(() => {
                overlay.remove();
                sheet.remove();
            }, 300);
        }

        // Event listeners
        overlay.onclick = closeSheet;

        // Append to DOM
        document.body.appendChild(overlay);
        document.body.appendChild(sheet);

        // Trigger animation
        requestAnimationFrame(() => {
            sheet.style.transform = 'translateY(0)';
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
