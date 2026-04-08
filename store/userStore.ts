import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  publicKey: string;
}

interface UserState {
  currentUser: User | null;
  keys: { privateKey: string; publicKey: string } | null;
  setCurrentUser: (user: User) => void;
  setKeys: (keys: { privateKey: string; publicKey: string }) => void;
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
  if (typeof window === 'undefined') return 'offgrid-user-storage';
  const params = new URLSearchParams(window.location.search);
  const node = params.get('node') ?? '1';
  return node === '1' ? 'offgrid-user-storage' : `offgrid-user-storage-node-${node}`;
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
