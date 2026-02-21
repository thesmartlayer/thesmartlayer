// =============================================
// THE SMART LAYER - Firebase Authentication
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeIduJ9CKVsrJTPCJpaBQxyKAt8ZrAAOg",
    authDomain: "thesmartlayer-231f6.firebaseapp.com",
    projectId: "thesmartlayer-231f6",
    storageBucket: "thesmartlayer-231f6.firebasestorage.app",
    messagingSenderId: "995273367486",
    appId: "1:995273367486:web:97ea4d7f74a0fb929863ef",
    measurementId: "G-4LNWJ5WM72"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// CEO Email - routes to CEO dashboard
const CEO_EMAIL = "thesmartlayer@pm.me";

// =============================================
// AUTH FUNCTIONS
// =============================================

// Sign In
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

// Sign Up
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

// Sign Out
export async function logOut() {
    try {
        await signOut(auth);
        window.location.href = "/login.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Password Reset
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

// =============================================
// ROUTE PROTECTION
// =============================================

// Check if user is CEO
export function isCEO(user) {
    return user && user.email && user.email.toLowerCase() === CEO_EMAIL.toLowerCase();
}

// Protect CEO Dashboard - redirect if not CEO
export function protectCEORoute() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/login.html";
        } else if (!isCEO(user)) {
            window.location.href = "/customer-dashboard.html";
        }
    });
}

// Protect Customer Dashboard - redirect if not logged in
export function protectCustomerRoute() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "/login.html";
        } else if (isCEO(user)) {
            window.location.href = "/ceo_dashboard.html";
        }
    });
}

// Redirect logged-in users away from login page
export function redirectIfLoggedIn() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (isCEO(user)) {
                window.location.href = "/ceo_dashboard.html";
            } else {
                window.location.href = "/customer-dashboard.html";
            }
        }
    });
}

// Get current user
export function getCurrentUser() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}

// =============================================
// ERROR MESSAGES
// =============================================

function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    };
    return messages[code] || 'An error occurred. Please try again.';
}

// Export auth instance for direct access if needed
export { auth, onAuthStateChanged };
