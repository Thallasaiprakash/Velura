import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, Auth, getAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// FIREBASE CONFIGURATION
// Replace these values with your actual Firebase project config.
// Get them from: Firebase Console → Project Settings → Your apps → Web app config
// For production, use EAS Secrets: https://docs.expo.dev/eas/environment-variables/
// ============================================================
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialize Firebase (avoid duplicate initialization)
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with AsyncStorage persistence (React Native)
let auth: Auth;
try {
  // Use getAuth first to check if already initialized, if not initializeAuth
  auth = getAuth(app);
} catch {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    console.error('Firebase Auth initialization failed:', e);
    auth = getAuth(app);
  }
}


const db: Firestore = getFirestore(app);

export { app, auth, db };
