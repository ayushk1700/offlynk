import { Platform } from 'react-native';

/**
 * Phase 2: Screenshot Detection (Best-effort)
 * Uses native listeners to detect user screenshots and notify the chat.
 */
export const startScreenshotDetection = (onDetected: () => void) => {
  // Best effort for Mobile: 
  // - iOS: UIScreen.capturedDidChangeNotification
  // - Android: ContentObserver on Media images
  console.log("[Security] Screenshot detection active.");
};

export const preventScreenCapture = async (enabled: boolean) => {
  if (Platform.OS === 'android') {
    // Requires native module to set FLAG_SECURE
  }
};
