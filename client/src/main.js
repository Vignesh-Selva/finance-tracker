import PersonalFinanceApp from './core/appShell.js';
import { getSession, onAuthStateChange } from './services/authService.js';
import { renderLoginScreen, removeLoginScreen } from './ui/auth/loginScreen.js';

let app = null;

async function initApp() {
    if (app) return; // already initialised
    app = new PersonalFinanceApp();
    await app.init();
    window.app = app;
    removeLoginScreen();
    // Show the main app UI
    document.querySelector('.app-container').style.display = '';
}

function showLogin() {
    // Hide the main app UI while logged out
    document.querySelector('.app-container').style.display = 'none';
    app = null;
    window.app = null;
    renderLoginScreen();
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = await getSession();
        if (session) {
            await initApp();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error('Session check failed', err);
        showLogin();
    }

    onAuthStateChange(async (session) => {
        if (session) {
            await initApp();
        } else {
            showLogin();
        }
    });
});
