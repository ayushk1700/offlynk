export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(key: CryptoKey, message: string): Promise<{ ciphertext: string, iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(message)
  );
  
  const cipherArray = Array.from(new Uint8Array(encrypted));
  const ivArray = Array.from(iv);
  
  return {
    ciphertext: btoa(String.fromCharCode(...cipherArray)),
    iv: btoa(String.fromCharCode(...ivArray))
  };
}

export async function decryptMessage(key: CryptoKey, ciphertext: string, ivStr: string): Promise<string> {
  const dec = new TextDecoder();
  const cipherArray = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivStr).split('').map(c => c.charCodeAt(0)));
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    cipherArray
  );
  
  return dec.decode(decrypted);
}

export async function exportAESKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(exported))));
}

export async function importAESKey(keyStr: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(atob(keyStr).split('').map(c => c.charCodeAt(0)));
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}
