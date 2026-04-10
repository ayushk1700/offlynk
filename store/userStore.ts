import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from "./authStore";
import { useChatStore } from "./chatStore";
import { clear as clearIndexedDB } from "idb-keyval";

export interface User {
  id: string;
  name: string;
  publicKey: string;
}

interface UserState {
  currentUser: User | null;
  keys: { privateKey: string; publicKey: string } | null;

  // THE FIX: Added `| null` to these function signatures so 
  // TypeScript allows clearing the user state on logout/deletion.
  setCurrentUser: (user: User | null) => void;
  setKeys: (keys: { privateKey: string; publicKey: string } | null) => void;

  clearUser: () => void;
}

/**
 * Determine storage key from URL param `?node=N`.
 * - Default (node=1 or missing): uses localStorage → shared across tabs (same user)
 * - node=2, node=3, …: uses sessionStorage → private to that tab (different user)
 *
 * This lets you open http://localhost:3000/?node=2 to
 * simulate a second device on the same Wi-Fi.
 */
function getStorageKey() {
  if (typeof window === 'undefined') return 'offlynk-user-storage';
  const params = new URLSearchParams(window.location.search);
  const node = params.get('node') ?? '1';
  return node === '1' ? 'offlynk-user-storage' : `offlynk-user-storage-node-${node}`;
}

function getStorage() {
  if (typeof window === 'undefined') return localStorage;
  const params = new URLSearchParams(window.location.search);
  const node = params.get('node') ?? '1';
  // Secondary nodes use sessionStorage (isolated per tab)
  return node === '1' ? localStorage : sessionStorage;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: null,
      keys: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      setKeys: (keys) => set({ keys }),
      clearUser: () => set({ currentUser: null, keys: null }),
    }),
    {
      name: getStorageKey(),
      storage: createJSONStorage(() => getStorage()),
    }
  )
);

/**
 * Utility function to completely eradicate local device data 
 * during Account Deletion or deep Sign Out.
 */
export async function wipeLocalDeviceData() {
  // 1. Trigger IndexedDB clear but DON'T 'await' it if it takes too long
  // We let it run in the background while we clear the UI
  clearIndexedDB().catch(e => console.warn("Cleanup background task:", e));

  // 2. Immediate UI Reset
  useAuthStore.getState().signOut();
  useUserStore.getState().setCurrentUser(null);
  useUserStore.getState().setKeys(null);

  // 3. Nuke synchronous storage
  localStorage.clear();
  sessionStorage.clear();

  // 4. Redirect immediately. 
  // This is faster than window.location.reload() because it stops all pending JS scripts.
  window.location.href = "/";
}