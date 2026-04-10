import * as LocalAuthentication from 'expo-local-authentication';
import { database } from '../db';
import Chat from '../models/Chat';

export const isBiometricsAvailable = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
};

export const authenticate = async (reason: string = 'Confirm identity to access OffLynk') => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use Passcode',
    disableDeviceFallback: false,
  });

  return result.success;
};

/**
 * FIX: Was an empty stub — now actually updates the isLocked field in WatermelonDB.
 * Call this after a successful `authenticate()` to toggle chat lock.
 */
export const toggleChatLock = async (chatId: string, enabled: boolean): Promise<void> => {
  try {
    const chat = await database.get<Chat>('chats').find(chatId);
    await database.write(async () => {
      await chat.update((record) => {
        record.isLocked = enabled;
      });
    });
    console.log(`[Security] Chat ${chatId} lock set to ${enabled}`);
  } catch (err) {
    console.error('[Security] Failed to toggle chat lock:', err);
    throw err;
  }
};
