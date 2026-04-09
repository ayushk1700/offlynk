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
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /* Local profile cache */
  profile: Partial<UserProfile> | null;

  /* Privacy overrides (cached locally for offline use) */
  privacyReadReceipts: boolean;
  privacyTyping: boolean;
  privacyLastSeen: "everyone" | "contacts" | "nobody";

  /* Actions */
  setAuth: (uid: string, phone: string | null, email?: string | null) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setLoading: (v: boolean) => void;
  signOut: () => void;
  updatePrivacy: (key: "privacyReadReceipts" | "privacyLastSeen" | "privacyTyping", value: boolean | string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      uid: null,
      phone: null,
      email: null,
      isAuthenticated: false,
      isLoading: true,
      profile: null,
      privacyReadReceipts: true,
      privacyTyping: true,
      privacyLastSeen: "everyone",

      setAuth: (uid, phone, email) => set({ uid, phone, email, isAuthenticated: true, isLoading: false }),
      setProfile: (profile) => set({ profile }),
      setLoading: (v) => set({ isLoading: v }),
      signOut: () => set({ uid: null, phone: null, email: null, profile: null, isAuthenticated: false, isLoading: false }),
      updatePrivacy: (key, value) => set({ [key]: value } as Partial<AuthState>),
    }),
    { name: "offgrid-auth-v1" }
  )
);