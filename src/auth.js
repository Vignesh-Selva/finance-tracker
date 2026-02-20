import { auth, googleProvider } from './firebase.js';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;

export async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    return currentUser;
}

export async function signOutUser() {
    await signOut(auth);
    currentUser = null;
}

export function onAuthChange(callback) {
    return firebaseOnAuthStateChanged(auth, user => {
        currentUser = user;
        callback(user);
    });
}

export function getCurrentUser() {
    return currentUser;
}
