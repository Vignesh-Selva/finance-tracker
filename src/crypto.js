// Web Crypto helpers for AES-GCM encryption/decryption.
// Derives a key from user UID + locally stored salt (stored in localStorage).

const SALT_KEY = 'finance_salt';
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function toBase64(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

function fromBase64(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export function getOrCreateSalt() {
    let salt = localStorage.getItem(SALT_KEY);
    if (!salt) {
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        salt = toBase64(saltBytes.buffer);
        localStorage.setItem(SALT_KEY, salt);
    }
    return salt;
}

export function setSalt(newSaltBase64) {
    localStorage.setItem(SALT_KEY, newSaltBase64);
}

export async function deriveUserKey(userId, saltBase64 = getOrCreateSalt()) {
    const baseMaterial = `${userId}:${saltBase64}`;
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        TEXT_ENCODER.encode(baseMaterial),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: fromBase64(saltBase64),
            iterations: 150000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(plainObject, cryptoKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = TEXT_ENCODER.encode(JSON.stringify(plainObject));
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoded
    );
    return {
        ciphertext: toBase64(cipherBuffer),
        iv: toBase64(iv.buffer),
    };
}

export async function decryptData(ciphertextBase64, ivBase64, cryptoKey) {
    const cipherBytes = fromBase64(ciphertextBase64);
    const ivBytes = fromBase64(ivBase64);
    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        cryptoKey,
        cipherBytes
    );
    return JSON.parse(TEXT_DECODER.decode(plainBuffer));
}

// Basic key rotation: generate a new salt and re-derive the key for future encryptions.
export async function rotateKey(userId) {
    const newSalt = toBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
    setSalt(newSalt);
    return deriveUserKey(userId, newSalt);
}
