"use client";
/**
 * useEncryption.ts
 * React hook providing convenient encryption/decryption methods
 * using the current user's stored keys.
 */
import { useUserStore } from "@/store";
import { hybridEncrypt, hybridDecrypt, EncryptedPayload } from "@/lib/encryption/keyExchange";

export function useEncryption() {
  const { keys } = useUserStore();

  const encrypt = async (
    plaintext: string,
    recipientPublicKey: string
  ): Promise<EncryptedPayload | null> => {
    try {
      return await hybridEncrypt(plaintext, recipientPublicKey);
    } catch (e) {
      console.error("[Encryption] Failed:", e);
      return null;
    }
  };

  const decrypt = async (payload: EncryptedPayload): Promise<string | null> => {
    if (!keys?.privateKey) return null;
    try {
      return await hybridDecrypt(payload, keys.privateKey);
    } catch (e) {
      console.error("[Decryption] Failed:", e);
      return null;
    }
  };

  return { encrypt, decrypt, hasKeys: !!keys };
}
