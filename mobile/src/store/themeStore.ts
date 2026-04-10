import { create } from 'zustand';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark';
export type FontSize = 'small' | 'default' | 'large';

interface ThemeState {
  mode: ThemeMode;
  fontSize: FontSize;
  colors: any;
  setMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
}

const lightColors = {
  background: '#FFFFFF',
  card: '#F3F4F6',
  text: '#111827',
  textMuted: '#6B7280',
  primary: '#38BDF8',
  secondary: '#10B981',
  border: '#E5E7EB',
  bubbleSent: '#38BDF8',
  bubbleReceived: '#F3F4F6',
  statusDirect: '#10B981', // Green for internet
  statusMesh: '#F59E0B',   // Orange for BLE/Mesh
};

const darkColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F9FAFB',
  textMuted: '#94A3B8',
  primary: '#38BDF8',
  secondary: '#10B981',
  border: '#334155',
  bubbleSent: '#38BDF8',
  bubbleReceived: '#1E293B',
  statusDirect: '#10B981', 
  statusMesh: '#38BDF8', // Blue/Zap for Mesh in dark mode
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  fontSize: 'default',
  colors: Appearance.getColorScheme() === 'dark' ? darkColors : lightColors,
  
  setMode: (mode) => set({ 
    mode, 
    colors: mode === 'dark' ? darkColors : lightColors 
  }),
  
  setFontSize: (fontSize) => set({ fontSize }),
}));

export const useAppTheme = () => {
    const { colors, fontSize, mode } = useThemeStore();
    
    const fontScale = {
        small: 0.85,
        default: 1.0,
        large: 1.15
    }[fontSize];

    return { colors, fontScale, mode };
};
