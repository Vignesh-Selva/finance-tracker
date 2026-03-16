import PersonalFinanceApp from './core/appShell.js';

async function bootstrap() {
    const app = new PersonalFinanceApp();
    await app.init();
    window.app = app;
}

window.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch(err => console.error('Init failed', err));
});
