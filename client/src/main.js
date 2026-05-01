import PersonalFinanceApp from './core/appShell.js';
import { getSession, onAuthStateChange } from './services/authService.js';

let app = null;

async function initApp() {
    if (app) return;
    app = new PersonalFinanceApp();
    await app.init();
    window.app = app;
    document.querySelector('.app-container').style.display = '';
}

function redirectToLanding() {
    document.querySelector('.app-container').style.display = 'none';
    app = null;
    window.app = null;
    window.location.replace('./landing.html');
}

window.addEventListener('DOMContentLoaded', async () => {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    try {
        const session = await getSession();
        if (session) {
            await initApp();
        } else {
            redirectToLanding();
        }
    } catch {
        redirectToLanding();
    }

    onAuthStateChange(async (session) => {
        if (session) {
            await initApp();
        } else {
            redirectToLanding();
        }
    });
});
