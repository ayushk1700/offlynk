/**
 * keyExchange.ts
 * Hybrid encryption: RSA-OAEP wraps an AES-GCM session key securely using WebCrypto.
 */
import { importPublicKey, importPrivateKey } from "./crypto";
import { generateAESKey, encryptMessage, decryptMessage } from "./aes";

export interface EncryptedPayload {
  encryptedAESKey: string; // RSA-OAEP wrapped AES key (base64)
  ciphertext: string;      // AES-GCM encrypted content (base64)
  iv: string;              // AES-GCM IV (base64)
}

/**
 * Encrypt a message for a recipient using hybrid encryption and native key wrapping.
 */
export async function hybridEncrypt(
  plaintext: string,
  recipientPublicKeyB64: string
): Promise<EncryptedPayload> {
  // 1. Generate fresh AES-GCM session key
  // NOTE: Ensure your `generateAESKey` in `aes.ts` sets `extractable: true`
  const aesKey = await generateAESKey();

  // 2. Encrypt plaintext with AES-GCM
  const { ciphertext, iv } = await encryptMessage(aesKey, plaintext);

  // 3. Import recipient's RSA public key
  const recipientKey = await importPublicKey(recipientPublicKeyB64);

  // 4. SECURE WRAP: Directly encrypt the AES key object using the RSA public key
  const wrappedKeyBuf = await crypto.subtle.wrapKey(
    "raw",                  // Format to extract
    aesKey,                 // The AES session key to wrap
    recipientKey,           // The RSA public key doing the wrapping
    { name: "RSA-OAEP" }    // Algorithm
  );

  // Convert the securely wrapped binary buffer to Base64 for transport
  const encryptedAESKey = btoa(
    String.fromCharCode(...new Uint8Array(wrappedKeyBuf))
  );

  return { encryptedAESKey, ciphertext, iv };
}

/**
 * Decrypt a hybrid-encrypted payload using native key unwrapping.
 */
export async function hybridDecrypt(
  payload: EncryptedPayload,
  privateKeyB64: string
): Promise<string> {
  // 1. Import own RSA private key
  const privKey = await importPrivateKey(privateKeyB64);

  // Convert Base64 wrapped key back to binary ArrayBuffer safely
  const wrappedKeyBytes = new Uint8Array(
    atob(payload.encryptedAESKey).split("").map((c) => c.charCodeAt(0))
  );

  // 2. SECURE UNWRAP: Directly decrypt into a usable CryptoKey object
  const aesKey = await crypto.subtle.unwrapKey(
    "raw",                  // Expected format of the wrapped key
    wrappedKeyBytes,        // The encrypted key binary
    privKey,                // Own RSA private key doing the unwrapping
    { name: "RSA-OAEP" },   // Unwrap algorithm
    { name: "AES-GCM", length: 256 }, // Target algorithm of the unwrapped key
    true,                   // Extractable
    ["encrypt", "decrypt"]  // Key usages
  );

  // 3. Decrypt the actual message
  return decryptMessage(aesKey, payload.ciphertext, payload.iv);
}