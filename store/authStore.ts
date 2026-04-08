/**
 * store/authStore.ts
 * Firebase auth state + user profile — Zustand store.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/lib/firebase/profile";

interface AuthState {
  /* Firebase auth */
  uid: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /* Local profile cache */
  profile: Partial<UserProfile> | null;

  /* Privacy overrides (cached locally for offline use) */
  privacyReadReceipts: boolean;
  privacyLastSeen: "everyone" | "contacts" | "nobody";

  /* Actions */
  setAuth: (uid: string, phone: string) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setLoading: (v: boolean) => void;
  signOut: () => void;
  updatePrivacy: (key: "privacyReadReceipts" | "privacyLastSeen", value: boolean | string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      uid: null,
      phone: null,
      isAuthenticated: false,
      isLoading: true,
      profile: null,
      privacyReadReceipts: true,
      privacyLastSeen: "everyone",

      setAuth: (uid, phone) => set({ uid, phone, isAuthenticated: true, isLoading: false }),
      setProfile: (profile) => set({ profile }),
      setLoading: (v) => set({ isLoading: v }),
      signOut: () => set({ uid: null, phone: null, isAuthenticated: false, profile: null }),
      updatePrivacy: (key, value) => set({ [key]: value } as Partial<AuthState>),
    }),
    { name: "offgrid-auth-v1" }
  )
);
