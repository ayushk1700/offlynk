/**
 * fileTransfer.ts
 * High-speed, encrypted, chunked P2P file transfer engine over WebRTC DataChannel.
 *
 * Protocol:
 *   → file-start  { id, name, size, mimeType, totalChunks, senderId }
 *   → file-chunk  { id, index, total, data: Uint8Array, iv: Uint8Array }
 *   ← file-ack    { id, index }                         (optional backpressure)
 *   → file-end    { id }
 *   ← file-done   { id }
 *
 * Encryption: AES-GCM 256-bit per-transfer session key.
 * Chunk size: 64 KB  (safe for WebRTC DataChannel)
 * Large file strategy: streaming read via FileReader slices — never fully loaded into RAM.
 */

export const CHUNK_SIZE = 64 * 1024; // 64 KB

export interface TransferMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  senderId: string;
}

export interface IncomingTransfer {
  meta: TransferMeta;
  chunks: Map<number, Uint8Array>;
  key: CryptoKey;
  receivedCount: number;
  onProgress?: (pct: number) => void;
  onDone?: (blob: Blob, meta: TransferMeta) => void;
}

/* ── Key helpers ──────────────────────────────────────────── */
export async function generateTransferKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(b64: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/* ── Encrypt / Decrypt single chunk ──────────────────────── */
export async function encryptChunk(key: CryptoKey, data: ArrayBuffer): Promise<{ iv: Uint8Array; cipher: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv, cipher };
}

export async function decryptChunk(key: CryptoKey, cipher: ArrayBuffer, iv: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer> }, key, cipher);
}

/* ── Read file slice as ArrayBuffer ─────────────────────── */
function readSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(start, end));
  });
}

/* ── SENDER ─────────────────────────────────────────────── */
export async function sendFile(
  file: File,
  transferId: string,
  senderId: string,
  send: (data: string) => void,                   // peer.send or ch.postMessage
  onProgress?: (pct: number) => void
): Promise<{ keyB64: string }> {
  const key = await generateTransferKey();
  const keyB64 = await exportKey(key);
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // START packet
  send(JSON.stringify({ 
    type: "file-start", 
    id: crypto.randomUUID(),
    senderId,
    timestamp: Date.now(),
    fileId: transferId, 
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    keyB64 
  }));

  // CHUNK packets
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const slice = await readSlice(file, start, end);
    const { iv, cipher } = await encryptChunk(key, slice);

    // Encode as base64 for JSON transport
    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipher)));

    send(JSON.stringify({ 
        type: "file-chunk", 
        id: crypto.randomUUID(),
        senderId,
        timestamp: Date.now(),
        fileId: transferId, 
        chunkIndex: i, 
        totalChunks: totalChunks, 
        ivB64, 
        cipherB64 
    }));
    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));

    // Yield to event loop every 16 chunks to avoid blocking
    if (i % 16 === 0) await new Promise<void>((r) => setTimeout(r, 0));
  }

  // END packet
  // Note: We use file-ack or just implicit end. I'll stick to a simple end for now.
  send(JSON.stringify({ 
    type: "file-end", 
    id: crypto.randomUUID(), 
    senderId,
    timestamp: Date.now(),
    fileId: transferId 
  }));
  return { keyB64 };
}

import { FileChunkMessage, FileMetaMessage } from "./dataChannel";

/* ── RECEIVER ────────────────────────────────────────────── */
// Global map: transferId → IncomingTransfer
export const incomingTransfers = new Map<string, IncomingTransfer>();

export async function handleFileStart(
  payload: FileMetaMessage & { keyB64: string },
  callbacks: {
    onProgress?: (id: string, pct: number) => void;
    onDone?: (id: string, blob: Blob, meta: TransferMeta) => void;
  }
) {
  const meta: TransferMeta = {
    id: payload.fileId,
    name: payload.name,
    size: payload.size,
    mimeType: payload.mimeType,
    totalChunks: Math.ceil(payload.size / CHUNK_SIZE), // Recalculate or add to meta
    senderId: payload.senderId,
  };
  const key = await importKey(payload.keyB64);

  incomingTransfers.set(meta.id, {
    meta,
    chunks: new Map(),
    key,
    receivedCount: 0,
    onProgress: (pct) => callbacks.onProgress?.(meta.id, pct),
    onDone: (blob, m) => callbacks.onDone?.(meta.id, blob, m),
  });
}

export async function handleFileChunk(payload: FileChunkMessage) {
  const transfer = incomingTransfers.get(payload.fileId);
  if (!transfer) return;

  const iv = Uint8Array.from(atob(payload.ivB64), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(payload.cipherB64), (c) => c.charCodeAt(0));
  const plain = await decryptChunk(transfer.key, cipherBytes.buffer, iv);

  transfer.chunks.set(payload.chunkIndex, new Uint8Array(plain));
  transfer.receivedCount++;
  transfer.onProgress?.(Math.round((transfer.receivedCount / transfer.meta.totalChunks) * 100));
}

export async function handleFileEnd(id: string): Promise<{ blob: Blob; meta: TransferMeta } | null> {
  const transfer = incomingTransfers.get(id);
  if (!transfer) return null;

  // Assemble chunks in order
  const ordered: Uint8Array[] = [];
  for (let i = 0; i < transfer.meta.totalChunks; i++) {
    const chunk = transfer.chunks.get(i);
    if (chunk) ordered.push(chunk);
  }

  const blob = new Blob(ordered.map(u => u.buffer as ArrayBuffer), { type: transfer.meta.mimeType });
  transfer.onDone?.(blob, transfer.meta);
  incomingTransfers.delete(id);
  return { blob, meta: transfer.meta };
}
