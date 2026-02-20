import PersonalFinanceApp from './core/appShell.js';
import { signInWithGoogle, signOutUser, onAuthChange, getCurrentUser } from './auth.js';
import { initSync, triggerSync, syncAll, requestBackgroundSync, resetUserKey } from './sync.js';
import { upsertEntry, markDeleted, exportToFile } from './indexeddb.js';

const STATUS = {
    synced: '🟢 All changes synced',
    syncing: '🟡 Syncing…',
    offline: '🔴 Offline – changes queued',
};

let appInstance = null;
let statusEl = null;
let loginBtn = null;
let logoutBtn = null;

function setStatus(state) {
    if (!statusEl) return;
    statusEl.classList.remove('status-synced', 'status-syncing', 'status-offline');
    if (state === 'syncing') {
        statusEl.textContent = STATUS.syncing;
        statusEl.classList.add('status-syncing');
    } else if (state === 'offline') {
        statusEl.textContent = STATUS.offline;
        statusEl.classList.add('status-offline');
    } else {
        statusEl.textContent = STATUS.synced;
        statusEl.classList.add('status-synced');
    }
}

function updateOnlineStatus() {
    setStatus(navigator.onLine ? 'synced' : 'offline');
}

function bindAuthButtons() {
    loginBtn?.addEventListener('click', async () => {
        try {
            await signInWithGoogle();
            await syncAll();
        } catch (err) {
            console.error('Login failed', err);
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOutUser();
            resetUserKey();
            setStatus('synced');
        } catch (err) {
            console.error('Logout failed', err);
        }
    });
}

function bindConnectivityEvents() {
    window.addEventListener('online', () => {
        setStatus('syncing');
        triggerSync();
    });
    window.addEventListener('offline', () => setStatus('offline'));
}

function setupAuthListener() {
    onAuthChange(async user => {
        if (user) {
            loginBtn?.setAttribute('hidden', 'true');
            logoutBtn?.removeAttribute('hidden');
            resetUserKey();
            setStatus(navigator.onLine ? 'syncing' : 'offline');
            if (navigator.onLine) {
                await syncAll();
            }
        } else {
            logoutBtn?.setAttribute('hidden', 'true');
            loginBtn?.removeAttribute('hidden');
            setStatus('synced');
        }
    });
}

function randomId() {
    return crypto.randomUUID();
}

export async function saveEntry(entry) {
    const base = {
        id: entry.id || randomId(),
        type: entry.type,
        amount: entry.amount,
        createdAt: entry.createdAt || Date.now(),
        updatedAt: Date.now(),
        synced: false,
        deleted: false,
    };
    await upsertEntry(base);
    setStatus(navigator.onLine ? 'syncing' : 'offline');
    triggerSync();
    requestBackgroundSync();
    return base;
}

export async function softDeleteEntry(id) {
    await markDeleted(id);
    setStatus(navigator.onLine ? 'syncing' : 'offline');
    triggerSync();
    requestBackgroundSync();
}

export async function exportLocalBackup() {
    await exportToFile();
}

async function bootstrap() {
    statusEl = document.getElementById('syncStatus');
    loginBtn = document.getElementById('loginBtn');
    logoutBtn = document.getElementById('logoutBtn');

    appInstance = new PersonalFinanceApp();
    await appInstance.init();

    bindAuthButtons();
    bindConnectivityEvents();
    setupAuthListener();
    await initSync();
    updateOnlineStatus();

    // Expose helpers for other modules to push entries into sync pipeline.
    window.syncAdapter = {
        saveEntry,
        softDeleteEntry,
        forceSync: syncAll,
        exportLocalBackup,
        getCurrentUser,
    };
}

window.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch(err => console.error('Init failed', err));
});
