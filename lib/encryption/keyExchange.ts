/**
 * keyExchange.ts
 * Hybrid encryption: RSA-OAEP wraps an AES-GCM session key.
 * Flow: sender generates AES key → encrypts with recipient's RSA public key
 *       → sends encrypted AES key + AES-encrypted ciphertext.
 */
import { importPublicKey, importPrivateKey } from "./crypto";
import { generateAESKey, exportAESKey, importAESKey, encryptMessage, decryptMessage } from "./aes";

export interface EncryptedPayload {
  encryptedAESKey: string; // RSA-OAEP encrypted AES key (base64)
  ciphertext: string;      // AES-GCM encrypted content (base64)
  iv: string;              // AES-GCM IV (base64)
}

/**
 * Encrypt a message for a recipient using hybrid encryption.
 */
export async function hybridEncrypt(
  plaintext: string,
  recipientPublicKeyB64: string
): Promise<EncryptedPayload> {
  // 1. Generate fresh AES-GCM session key (forward secrecy per message)
  const aesKey = await generateAESKey();

  // 2. Encrypt plaintext with AES-GCM
  const { ciphertext, iv } = await encryptMessage(aesKey, plaintext);

  // 3. Export AES key → encrypt with recipient's RSA public key
  const aesKeyRaw = await exportAESKey(aesKey);
  const recipientKey = await importPublicKey(recipientPublicKeyB64);

  const enc = new TextEncoder();
  const encryptedAESKeyBuf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientKey,
    enc.encode(aesKeyRaw)
  );

  const encryptedAESKey = btoa(
    String.fromCharCode(...new Uint8Array(encryptedAESKeyBuf))
  );

  return { encryptedAESKey, ciphertext, iv };
}

/**
 * Decrypt a hybrid-encrypted payload using the recipient's private key.
 */
export async function hybridDecrypt(
  payload: EncryptedPayload,
  privateKeyB64: string
): Promise<string> {
  // 1. Decrypt the AES key using own private key
  const privKey = await importPrivateKey(privateKeyB64);
  const encAESKeyBytes = new Uint8Array(
    atob(payload.encryptedAESKey)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const aesKeyRawBuf = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privKey,
    encAESKeyBytes
  );
  const aesKeyRaw = new TextDecoder().decode(aesKeyRawBuf);

  // 2. Import AES key and decrypt
  const aesKey = await importAESKey(aesKeyRaw);
  return decryptMessage(aesKey, payload.ciphertext, payload.iv);
}
