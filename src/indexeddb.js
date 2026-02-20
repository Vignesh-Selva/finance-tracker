// IndexedDB layer for encrypted sync entries
const DB_NAME = 'finance-sync-db';
const DB_VERSION = 1;
const STORE = 'entries';

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('synced', 'synced', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        fn(store, tx, resolve, reject);
        tx.onerror = () => reject(tx.error);
    });
}

export async function upsertEntry(entry) {
    const now = Date.now();
    const record = {
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        createdAt: entry.createdAt ?? now,
        updatedAt: entry.updatedAt ?? now,
        synced: entry.synced ?? false,
        deleted: entry.deleted ?? false,
    };
    return withStore('readwrite', (store, _tx, resolve) => {
        store.put(record).onsuccess = () => resolve(record);
    });
}

export async function markSynced(id, updatedAt) {
    return withStore('readwrite', (store, _tx, resolve) => {
        const req = store.get(id);
        req.onsuccess = () => {
            const data = req.result;
            if (!data) return resolve();
            data.synced = true;
            data.updatedAt = updatedAt ?? data.updatedAt;
            store.put(data).onsuccess = () => resolve(data);
        };
    });
}

export async function markDeleted(id, updatedAt = Date.now()) {
    return withStore('readwrite', (store, _tx, resolve) => {
        const req = store.get(id);
        req.onsuccess = () => {
            const existing = req.result || { id, createdAt: updatedAt };
            const data = { ...existing, deleted: true, synced: false, updatedAt };
            store.put(data).onsuccess = () => resolve(data);
        };
    });
}

export async function getAllEntries() {
    return withStore('readonly', (store, _tx, resolve) => {
        store.getAll().onsuccess = (e) => resolve(e.target.result || []);
    });
}

export async function getUnsyncedEntries() {
    return withStore('readonly', (store, _tx, resolve) => {
        const idx = store.index('synced');
        idx.getAll(IDBKeyRange.only(false)).onsuccess = (e) => resolve(e.target.result || []);
    });
}

export async function deleteEntry(id) {
    return withStore('readwrite', (store, _tx, resolve) => {
        store.delete(id).onsuccess = () => resolve();
    });
}

export async function bulkUpsert(entries) {
    return withStore('readwrite', (store, tx, resolve) => {
        entries.forEach(entry => store.put(entry));
        tx.oncomplete = () => resolve(entries);
    });
}

export async function exportToFile() {
    const entries = await getAllEntries();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-backup.json';
    a.click();
    URL.revokeObjectURL(url);
}
