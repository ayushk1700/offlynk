"use client";
/**
 * useStorage.ts
 * Hook for easy IndexedDB access.
 */
import { useCallback } from "react";
import { saveMessage, getMessages, clearMessages, StoredMessage } from "@/lib/storage/messageStore";

export function useStorage() {
  const persistMessage = useCallback(async (msg: StoredMessage) => {
    await saveMessage(msg);
  }, []);

  const loadMessages = useCallback(async (peerId: string) => {
    return getMessages(peerId);
  }, []);

  const wipeChat = useCallback(async (peerId: string) => {
    await clearMessages(peerId);
  }, []);

  return { persistMessage, loadMessages, wipeChat };
}
