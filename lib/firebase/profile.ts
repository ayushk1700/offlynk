/**
 * lib/firebase/profile.ts
 * Firestore profile CRUD using lazy Firebase initialization.
 */
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  phone: string;
  email?: string;
  displayName: string;
  photoURL: string;
  about: string;
  status: string;
  lastSeen: Timestamp | null;
  privacyLastSeen: "everyone" | "contacts" | "nobody";
  privacyReadReceipts: boolean;
  privacyTyping: boolean;
  privacyPhoto: "everyone" | "contacts" | "nobody";
  publicKey: string;
  did: string;
  createdAt: Timestamp | null;
}

export const DEFAULT_PROFILE: Partial<UserProfile> = {
  displayName: "",
  photoURL: "",
  about: "Hey there! I'm using OffLynk.",
  status: "🟢 Available",
  privacyLastSeen: "everyone",
  privacyReadReceipts: true,
  privacyTyping: true,
  privacyPhoto: "everyone",
};

export async function createProfile(uid: string, data: Partial<UserProfile>) {
  const db = await getFirebaseDb();
  if (!db) return;
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  await setDoc(doc(db, "users", uid), {
    ...DEFAULT_PROFILE,
    ...data,
    uid,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const db = await getFirebaseDb();
  if (!db) return null;
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const db = await getFirebaseDb();
  if (!db) return;
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid), { ...data, lastSeen: serverTimestamp() });
}

export async function uploadProfilePhoto(uid: string, blob: Blob): Promise<string> {
  const storage = await getFirebaseStorage();
  if (!storage) return "";
  const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const storageRef = ref(storage, `profile-photos/${uid}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function saveFeedback(uid: string, message: string, category: string) {
  const db = await getFirebaseDb();
  if (!db) throw new Error("Firebase not configured");
  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
  await addDoc(collection(db, "feedback"), {
    uid, message, category,
    createdAt: serverTimestamp(),
    appVersion: "1.0.0",
  });
}