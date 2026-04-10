/**
 * dataChannel.ts
 * Typed message protocol for the OffLynk WebRTC data channel.
 */

// ---------------------------------------------------------------------------
// 1. Shared envelope — every message MUST carry these three fields
// ---------------------------------------------------------------------------

export interface BaseMessage {
  /** UUID v4 — unique per transmission, generated at send time */
  id: string;
  /** Local user's peer ID */
  senderId: string;
  /** Unix epoch ms — used for Last Write Wins on edits */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// 2. Concrete message variants (discriminated on `type`)
// ---------------------------------------------------------------------------

export interface TextMessage extends BaseMessage {
  type: 'message';
  content: string;
  replyToId?: string;
}

export interface EditMessage extends BaseMessage {
  type: 'message-edit';
  messageId: string;  // ID of the original TextMessage being edited
  newContent: string;
  editedAt: number;   // Unix ms — LWW comparison key
}

export interface DeleteMessage extends BaseMessage {
  type: 'message-delete';
  messageId: string;
  deleteType: 'for-me' | 'for-everyone';
}

export interface ChatActionMessage extends BaseMessage {
  type: 'chat-action';
  action: 'block' | 'report' | 'mute';
  targetId: string;  // peerId being acted upon
  reason?: string;   // required for 'report', optional otherwise
}

export interface ReadReceiptMessage extends BaseMessage {
  type: 'read-receipt';
  messageId: string;
  status: 'delivered' | 'read';
}

export interface TypingMessage extends BaseMessage {
  type: 'typing';
  isTyping: boolean;
}

/** Sent immediately on channel open to exchange identity and protocol version */
export interface HandshakeMessage extends BaseMessage {
  type: 'handshake';
  displayName: string;
  version?: string;
}

/** Generic delivery acknowledgment — confirms a message was received */
export interface AckMessage extends BaseMessage {
  type: 'ack';
  ackedId: string; // ID of the message being acknowledged
}

/** File transfer metadata — sent once before any chunks */
export interface FileMetaMessage extends BaseMessage {
  type: 'file-meta';
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}

/**
 * File transfer chunk.
 * 
 * Each chunk is mapped to a specific file transfer via `fileId`.
 * The `chunkIndex` and `totalChunks` fields allow for out-of-order reassembly
 * while maintaining protocol consistency with the rest of the file lifecycle.
 */
export interface FileChunkMessage extends BaseMessage {
  type: 'file-chunk';
  fileId: string;      // Identifies the parent file transfer
  chunkIndex: number;  // Current chunk sequence
  totalChunks: number; // For reassembly tracking
  ivB64: string;
  cipherB64: string;
}

/**
 * File delivery / read acknowledgment.
 * Sent by the receiver back to the sender.
 */
export interface FileAckMessage extends BaseMessage {
  type: 'file-ack';
  fileId: string;
  status: 'delivered' | 'read';
}

export interface ReactionMessage extends BaseMessage {
  type: 'reaction';
  targetId: string;   // ID of the message being reacted to
  emoji: string;
  isRemoving: boolean;
}

export interface ViewOnceMessage extends BaseMessage {
  type: 'view-once';
  targetId: string;   // ID of the message being marked as viewed
}

export interface RelayMessage extends BaseMessage {
  type: 'relay';
  targetId: string;     // Final destination
  hopCount: number;
  visited: string[];    // To avoid cycles
  payload: any;         // The message being relayed (ChannelMessage)
}

export interface MeshMapMessage extends BaseMessage {
  type: 'mesh-map';
  nodes: { id: string; name: string; hops: number }[];
}

// ---------------------------------------------------------------------------
// 3. Master discriminated union
// ---------------------------------------------------------------------------

export type ChannelMessage =
  | TextMessage
  | EditMessage
  | DeleteMessage
  | ChatActionMessage
  | ReadReceiptMessage
  | TypingMessage
  | HandshakeMessage
  | AckMessage
  | FileMetaMessage
  | FileChunkMessage
  | FileAckMessage
  | ReactionMessage
  | ViewOnceMessage
  | RelayMessage
  | MeshMapMessage;

// ---------------------------------------------------------------------------
// 4. Handler map — one typed callback per variant
// ---------------------------------------------------------------------------

export interface ChannelMessageHandlers {
  onMessage: (msg: TextMessage) => void;
  onEdit: (msg: EditMessage) => void;
  onDelete: (msg: DeleteMessage) => void;
  onChatAction: (msg: ChatActionMessage) => void;
  onReadReceipt: (msg: ReadReceiptMessage) => void;
  onTyping: (msg: TypingMessage) => void;
  onHandshake: (msg: HandshakeMessage) => void;
  onAck: (msg: AckMessage) => void;
  onFileMeta: (msg: FileMetaMessage) => void;
  onFileChunk: (msg: FileChunkMessage) => void;
  onFileAck: (msg: FileAckMessage) => void;
  onReaction: (msg: ReactionMessage) => void;
  onViewOnce: (msg: ViewOnceMessage) => void;
  onRelay: (msg: RelayMessage) => void;
  onMeshMap: (msg: MeshMapMessage) => void;
}

// ---------------------------------------------------------------------------
// 5. Send — single validated dispatch path
// ---------------------------------------------------------------------------

/**
 * Serialize and send any typed ChannelMessage over an RTCDataChannel.
 * This is the ONLY place channel.send() should be called in the codebase.
 *
 * FIX 3 — Parameter widened to `RTCDataChannel | null | undefined`.
 *   The original accepted only `RTCDataChannel` (non-nullable), which
 *   caused a type error at every real call site since peer channels are
 *   stored as nullable refs (`useRef<RTCDataChannel | null>`).
 */
export function sendChannelMessage(
  channel: RTCDataChannel | null | undefined,
  message: ChannelMessage
): void {
  if (!channel || channel.readyState !== 'open') {
    console.warn(
      `[DataChannel] Cannot send "${message.type}" — channel state: ${channel?.readyState ?? 'null'}`
    );
    return;
  }
  try {
    channel.send(serializeMessage(message));
  } catch (error) {
    console.error(`[DataChannel] Failed to send "${message.type}":`, error);
  }
}

// ---------------------------------------------------------------------------
// 6. Receive — single validated inbound router
// ---------------------------------------------------------------------------

/**
 * Internal router for ChannelMessages.
 */
export function dispatchChannelMessage(
  msg: ChannelMessage,
  handlers: ChannelMessageHandlers
): boolean {
  switch (msg.type) {
    case 'message': handlers.onMessage(msg); return true;
    case 'message-edit': handlers.onEdit(msg); return true;
    case 'message-delete': handlers.onDelete(msg); return true;
    case 'chat-action': handlers.onChatAction(msg); return true;
    case 'read-receipt': handlers.onReadReceipt(msg); return true;
    case 'typing': handlers.onTyping(msg); return true;
    case 'handshake': handlers.onHandshake(msg); return true;
    case 'ack': handlers.onAck(msg); return true;
    case 'file-meta': handlers.onFileMeta(msg); return true;
    case 'file-chunk': handlers.onFileChunk(msg); return true;
    case 'file-ack': handlers.onFileAck(msg); return true;
    case 'reaction': handlers.onReaction(msg); return true;
    case 'view-once': handlers.onViewOnce(msg); return true;
    case 'relay': handlers.onRelay(msg); return true;
    case 'mesh-map': handlers.onMeshMap(msg); return true;
    default:
      console.warn('[DataChannel] Unknown message type:', (msg as ChannelMessage).type);
      return false;
  }
}

/**
 * Parse a raw DataChannel payload and route it to the correct handler.
 *
 * Returns `true`  — message was recognised and dispatched.
 * Returns `false` — unknown type or parse failure (caller may run a fallback).
 */
export function handleChannelMessage(
  raw: string,
  handlers: ChannelMessageHandlers
): boolean {
  const msg = parseChannelMessage(raw);
  if (!msg) return false;
  return dispatchChannelMessage(msg, handlers);
}

// ---------------------------------------------------------------------------
// 7. Serialization helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a raw string into a typed ChannelMessage.
 *
 * FIX 4 — Restored warn logging in the catch block.
 *   The original silently swallowed all parse failures (`// Silence expected
 *   errors for legacy protocol fallthrough`), making it impossible to
 *   diagnose malformed payloads during development. Logging at `warn` (not
 *   `error`) keeps noise low while still surfacing real problems.
 */
export function parseChannelMessage(raw: string): ChannelMessage | null {
  try {
    const parsed = JSON.parse(raw) as ChannelMessage;
    if (!parsed || typeof parsed.type !== 'string') {
      console.warn('[DataChannel] Received message with missing or invalid `type`:', parsed);
      return null;
    }
    return parsed;
  } catch {
    console.warn('[DataChannel] Failed to parse incoming message — not valid JSON:', raw);
    return null;
  }
}

/** Serialize any ChannelMessage to a JSON string for transmission. */
export function serializeMessage(msg: ChannelMessage): string {
  return JSON.stringify(msg);
}