import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    deriveUserKey,
    encryptData,
    decryptData,
} from './crypto.js';
import {
    getUnsyncedEntries,
    getAllEntries,
    upsertEntry,
    bulkUpsert,
    markSynced,
    markDeleted,
} from './indexeddb.js';

const SYNC_DEBOUNCE_MS = 3000;
const SYNC_TAG = 'finance-sync';

let userKey = null;
let debounceTimer = null;

function encodeEncryptedPayload(ciphertext, iv) {
    return `${ciphertext}.${iv}`;
}

function decodeEncryptedPayload(payload) {
    const [ciphertext, iv] = payload.split('.');
    return { ciphertext, iv };
}

async function ensureUserKey() {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    if (!userKey) {
        userKey = await deriveUserKey(user.uid);
    }
    return { user, key: userKey };
}

function getUserEntriesCollection(userId) {
    return collection(db, 'users', userId, 'entries');
}

function scheduleSync() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => syncAll().catch(console.error), SYNC_DEBOUNCE_MS);
}

export async function triggerSync() {
    scheduleSync();
}

export async function initSync() {
    window.addEventListener('online', () => scheduleSync());
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'trigger-sync') {
                scheduleSync();
            }
        });
    }
}

async function uploadUnsyncedEntries(userId, key) {
    const unsynced = await getUnsyncedEntries();
    const colRef = getUserEntriesCollection(userId);

    for (const entry of unsynced) {
        const docRef = doc(colRef, entry.id);
        if (entry.deleted) {
            await deleteDoc(docRef);
            await markSynced(entry.id, entry.updatedAt);
            continue;
        }
        const { ciphertext, iv } = await encryptData(entry, key);
        await setDoc(docRef, {
            encryptedData: encodeEncryptedPayload(ciphertext, iv),
            updatedAt: entry.updatedAt,
            serverUpdatedAt: serverTimestamp(),
        });
        await markSynced(entry.id, entry.updatedAt);
    }
}

async function downloadAndMerge(userId, key) {
    const colRef = getUserEntriesCollection(userId);
    const snap = await getDocs(colRef);
    const remoteEntries = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.encryptedData) return;
        const { ciphertext, iv } = decodeEncryptedPayload(data.encryptedData);
        remoteEntries.push({
            id: docSnap.id,
            payload: { ciphertext, iv },
            updatedAt: data.updatedAt,
        });
    });

    if (!remoteEntries.length) return;

    const localEntries = await getAllEntries();
    const localMap = new Map(localEntries.map(e => [e.id, e]));
    const remoteIdSet = new Set(remoteEntries.map(r => r.id));
    const merged = [];

    for (const remote of remoteEntries) {
        const existing = localMap.get(remote.id);
        if (existing && existing.updatedAt >= remote.updatedAt) {
            merged.push(existing);
            continue;
        }
        const decrypted = await decryptData(remote.payload.ciphertext, remote.payload.iv, key);
        merged.push({ ...decrypted, synced: true });
    }

    // Handle remote deletions: if a local entry was previously synced but missing remotely, mark deleted locally.
    for (const local of localEntries) {
        if (local.synced && !local.deleted && !remoteIdSet.has(local.id)) {
            await markDeleted(local.id, Date.now());
        }
    }

    await bulkUpsert(merged);
}

export async function syncAll() {
    const { user, key } = await ensureUserKey();
    await uploadUnsyncedEntries(user.uid, key);
    await downloadAndMerge(user.uid, key);
}

export function resetUserKey() {
    userKey = null;
}

export async function requestBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        try {
            await reg.sync.register(SYNC_TAG);
        } catch (err) {
            console.warn('Background sync registration failed', err);
        }
    }
}
