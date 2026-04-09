import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureState {
  /* Per-chat settings */
  pinnedChats: string[];
  silentChats: string[];            // Muted chats (no notifications)
  selfDestructChats: Record<string, number>; // chatId → minutes (0 = off)

  /* Global toggles */
  autoReconnect: boolean;
  emergencyMode: boolean;           // Survival mode active
  compassEnabled: boolean;
  autoRelayBoost: boolean;

  /* Location (for compass + SOS) */
  location: { lat: number; lon: number; accuracy: number } | null;
  locationEnabled: boolean;

  /* Actions */
  pinChat: (id: string) => void;
  unpinChat: (id: string) => void;
  toggleSilent: (id: string) => void;
  setSelfDestruct: (chatId: string, minutes: number) => void;
  setAutoReconnect: (v: boolean) => void;
  setEmergencyMode: (v: boolean) => void;
  setCompassEnabled: (v: boolean) => void;
  setAutoRelayBoost: (v: boolean) => void;
  setLocation: (loc: FeatureState['location']) => void;
  setLocationEnabled: (v: boolean) => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set) => ({
      pinnedChats: [],
      silentChats: [],
      selfDestructChats: {},
      autoReconnect: true,
      emergencyMode: false,
      compassEnabled: true,
      autoRelayBoost: true,
      location: null,
      locationEnabled: false,

      pinChat: (id) =>
        set((s) => ({
          pinnedChats: s.pinnedChats.includes(id)
            ? s.pinnedChats
            : [id, ...s.pinnedChats],
        })),
      unpinChat: (id) =>
        set((s) => ({ pinnedChats: s.pinnedChats.filter((p) => p !== id) })),
      toggleSilent: (id) =>
        set((s) => ({
          silentChats: s.silentChats.includes(id)
            ? s.silentChats.filter((c) => c !== id)
            : [...s.silentChats, id],
        })),
      setSelfDestruct: (chatId, minutes) =>
        set((s) => ({
          selfDestructChats: { ...s.selfDestructChats, [chatId]: minutes },
        })),
      setAutoReconnect: (v) => set({ autoReconnect: v }),
      setEmergencyMode: (v) => set({ emergencyMode: v }),
      setCompassEnabled: (v) => set({ compassEnabled: v }),
      setAutoRelayBoost: (v) => set({ autoRelayBoost: v }),
      setLocation: (loc) => set({ location: loc }),
      setLocationEnabled: (v) => set({ locationEnabled: v }),
    }),
    { name: 'offlynk-features-v1' }
  )
);

/** Calculate compass bearing from point A → point B (degrees 0-360) */
export function calcBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const y = Math.sin(dLon) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
