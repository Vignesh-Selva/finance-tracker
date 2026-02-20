// Firebase initialization (modular v10+)
// Replace the config values with your Firebase project's settings.
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDJXjPnMJ5arqRLP7Us1_KdV55za2GhEJQ",
    authDomain: "finance-tracker-5b1d0.firebaseapp.com",
    projectId: "finance-tracker-5b1d0",
    storageBucket: "finance-tracker-5b1d0.firebasestorage.app",
    messagingSenderId: "905722679692",
    appId: "1:905722679692:web:3aeb0a0664bd8e20ab46a9",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export function getFirebaseApp() {
    return app;
}
