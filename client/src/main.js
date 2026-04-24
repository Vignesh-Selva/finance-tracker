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
    try {
        const session = await getSession();
        if (session) {
            await initApp();
        } else {
            redirectToLanding();
        }
    } catch (_err) {
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
