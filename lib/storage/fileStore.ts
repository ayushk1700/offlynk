/**
 * fileStore.ts
 * Store and retrieve encrypted file blobs in IndexedDB.
 */
import { getDB } from "./indexedDB";

export type StoredFile = {
  id: string;
  fromPeer: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  timestamp: number;
};

export async function saveFile(file: StoredFile) {
  const db = await getDB();
  await db.put("files", file);
}

export async function getFile(fileId: string): Promise<StoredFile | null> {
  const db = await getDB();
  return (await db.get("files", fileId)) ?? null;
}

export async function listFiles(): Promise<StoredFile[]> {
  const db = await getDB();
  return db.getAll("files");
}
