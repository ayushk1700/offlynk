import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: true,
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
  setDarkMode: (val) => set({ isDarkMode: val }),
}));
