/**
 * keyStore.ts
 * Persist and retrieve cryptographic keys in IndexedDB.
 */
import { getDB } from "./indexedDB";

export async function savePublicKey(peerId: string, publicKey: string) {
  const db = await getDB();
  await db.put("keys", { id: peerId, publicKey });
}

export async function saveOwnKeys(publicKey: string, privateKey: string) {
  const db = await getDB();
  await db.put("keys", { id: "self", publicKey, privateKey });
}

export async function getPublicKey(peerId: string): Promise<string | null> {
  const db = await getDB();
  const record = await db.get("keys", peerId);
  return record?.publicKey ?? null;
}

export async function getOwnKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  const db = await getDB();
  const record = await db.get("keys", "self");
  if (!record?.privateKey) return null;
  return { publicKey: record.publicKey, privateKey: record.privateKey };
}
