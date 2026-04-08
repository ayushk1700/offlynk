/**
 * messageStore.ts
 * Persist and retrieve encrypted messages in IndexedDB.
 */
import { getDB } from "./indexedDB";

export type StoredMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  status: string;
  type: string;
};

export async function saveMessage(msg: StoredMessage) {
  const db = await getDB();
  await db.put("messages", msg);
}

export async function getMessages(peerId: string): Promise<StoredMessage[]> {
  const db = await getDB();
  const sent = await db.getAllFromIndex("messages", "by-sender", peerId);
  const received = await db.getAllFromIndex("messages", "by-receiver", peerId);
  return [...sent, ...received].sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearMessages(peerId: string) {
  const db = await getDB();
  const tx = db.transaction("messages", "readwrite");
  const all = await tx.store.getAll();
  for (const msg of all) {
    if (msg.senderId === peerId || msg.receiverId === peerId) {
      await tx.store.delete(msg.id);
    }
  }
  await tx.done;
}
