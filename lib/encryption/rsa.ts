/**
 * rsa.ts
 * RSA-OAEP helpers for signing and verification (message integrity).
 */

/** Sign data with ECDSA for message integrity verification */
export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
}

export async function signData(
  privateKey: CryptoKey,
  data: string
): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(
  publicKey: CryptoKey,
  data: string,
  signatureB64: string
): Promise<boolean> {
  const encoded = new TextEncoder().encode(data);
  const signature = new Uint8Array(
    atob(signatureB64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signature,
    encoded
  );
}
