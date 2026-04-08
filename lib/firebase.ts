/**
 * lib/firebase.ts
 * Firebase initialization — only initializes when real config values are present.
 * Falls back to demo mode (local-only) when env vars are placeholders or missing.
 */

const rawConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** True only when all required Firebase fields are non-empty, non-placeholder strings. */
export const isFirebaseConfigured =
  rawConfig.apiKey.length > 10 &&
  !rawConfig.apiKey.startsWith("AIzaSy-YOUR") &&
  rawConfig.projectId.length > 3 &&
  !rawConfig.projectId.includes("your-project");

// Lazy singleton — only created when Firebase is actually configured
let _auth: import("firebase/auth").Auth | null = null;
let _db: import("firebase/firestore").Firestore | null = null;
let _storage: import("firebase/storage").FirebaseStorage | null = null;

export async function getFirebaseAuth() {
  if (!isFirebaseConfigured) return null;
  if (_auth) return _auth;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const app = getApps().length === 0 ? initializeApp(rawConfig) : getApps()[0];
  _auth = getAuth(app);
  return _auth;
}

export async function getFirebaseDb() {
  if (!isFirebaseConfigured) return null;
  if (_db) return _db;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getFirestore } = await import("firebase/firestore");
  const app = getApps().length === 0 ? initializeApp(rawConfig) : getApps()[0];
  _db = getFirestore(app);
  return _db;
}

export async function getFirebaseStorage() {
  if (!isFirebaseConfigured) return null;
  if (_storage) return _storage;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getStorage } = await import("firebase/storage");
  const app = getApps().length === 0 ? initializeApp(rawConfig) : getApps()[0];
  _storage = getStorage(app);
  return _storage;
}

// Synchronous stubs kept for any code that imports them directly
// They will be null until getFirebase*() is called (which checks isFirebaseConfigured)
export const auth = null;
export const db = null;
export const storage = null;
