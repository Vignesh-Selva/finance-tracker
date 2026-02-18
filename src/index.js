import PersonalFinanceApp from './core/appShell.js';

window.addEventListener('DOMContentLoaded', async () => {
    window.app = new PersonalFinanceApp();
    await window.app.init();
});