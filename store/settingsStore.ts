import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    ambientTypingEnabled: Record<string, boolean>; // peerId -> boolean
    e2eEnabled: boolean;
    
    // Actions
    toggleAmbientTyping: (peerId: string) => void;
    toggleE2E: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ambientTypingEnabled: {},
            e2eEnabled: true,
            
            toggleAmbientTyping: (peerId) => set((state) => ({ 
                ambientTypingEnabled: { 
                    ...state.ambientTypingEnabled, 
                    [peerId]: !state.ambientTypingEnabled[peerId] 
                } 
            })),
            toggleE2E: () => set((state) => ({ e2eEnabled: !state.e2eEnabled })),
        }),
        {
            name: 'offlynk-settings',
        }
    )
);
