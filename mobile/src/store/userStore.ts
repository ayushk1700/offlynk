import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  userId: string | null;
  displayName: string | null;
  isRegistered: boolean;
  setUser: (userId: string, displayName: string) => Promise<void>;
  loadUser: () => Promise<void>;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  displayName: null,
  isRegistered: false,

  setUser: async (userId, displayName) => {
    await AsyncStorage.setItem('user_id', userId);
    await AsyncStorage.setItem('display_name', displayName);
    set({ userId, displayName, isRegistered: true });
  },

  loadUser: async () => {
    const userId = await AsyncStorage.getItem('user_id');
    const displayName = await AsyncStorage.getItem('display_name');
    if (userId) {
      set({ userId, displayName, isRegistered: true });
    }
  },

  clearUser: async () => {
    await AsyncStorage.multiRemove(['user_id', 'display_name', 'auth_token']);
    set({ userId: null, displayName: null, isRegistered: false });
  },
}));
