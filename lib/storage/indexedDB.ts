/**
 * indexedDB.ts
 * Central IndexedDB setup — single DB, multiple object stores.
 */
import { openDB, DBSchema, IDBPDatabase } from "idb";

const DB_NAME = "offgrid-chat-db";
const DB_VERSION = 1;

interface OffgridDB extends DBSchema {
  messages: {
    key: string;
    value: {
      id: string;
      senderId: string;
      receiverId: string;
      content: string;  // Encrypted ciphertext
      timestamp: number;
      status: string;
      type: string;
    };
    indexes: { "by-receiver": string; "by-sender": string };
  };
  keys: {
    key: string;
    value: { id: string; publicKey: string; privateKey?: string };
  };
  files: {
    key: string;
    value: {
      id: string;
      fromPeer: string;
      name: string;
      type: string;
      size: number;
      data: ArrayBuffer; // Encrypted file bytes
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OffgridDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OffgridDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OffgridDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("messages")) {
          const msgStore = db.createObjectStore("messages", { keyPath: "id" });
          msgStore.createIndex("by-receiver", "receiverId");
          msgStore.createIndex("by-sender", "senderId");
        }
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}
