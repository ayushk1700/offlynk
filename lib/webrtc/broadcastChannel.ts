/**
 * broadcastChannel.ts
 * Tab-to-tab messaging via BroadcastChannel API.
 *
 * Message types:
 *   announce   – tab joins network
 *   message    – chat message
 *   typing     – typing indicator
 *   ping/pong  – heartbeat presence
 *   leave      – tab closed
 *   delete     – delete-for-everyone signal  ← NEW
 */
import type { User } from "@/store/userStore";

export const CHANNEL_NAME = "offgrid-local";

export type BCMessageType =
  | "announce"
  | "message"
  | "typing"
  | "ambient-typing"
  | "ping"
  | "pong"
  | "leave"
  | "delete"
  | "read-ack";

export interface BCEnvelope {
  type: BCMessageType;
  senderId: string;
  user?: User;
  payload?: Record<string, unknown>;
}

let channel: BroadcastChannel | null = null;

export function getChannel(): BroadcastChannel {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function closeChannel() {
  channel?.close();
  channel = null;
}

export function broadcastAnnounce(user: User) {
  getChannel().postMessage({ type: "announce", senderId: user.id, user });
}

export function broadcastLeave(userId: string) {
  getChannel().postMessage({ type: "leave", senderId: userId });
}

export function broadcastPing(user: User) {
  getChannel().postMessage({ type: "ping", senderId: user.id, user });
}

export function broadcastPong(user: User) {
  getChannel().postMessage({ type: "pong", senderId: user.id, user });
}

export function sendLocalMessage(payload: {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: number;
}) {
  getChannel().postMessage({ type: "message", senderId: payload.senderId, payload });
}

export function sendTypingSignal(senderId: string, peerId: string) {
  getChannel().postMessage({ type: "typing", senderId, payload: { peerId } });
}

/**
 * Streams the partial text the user is currently composing to the peer
 * ("ambient typing" / live preview). Text is cleared when the message sends.
 */
export function sendAmbientTyping(senderId: string, peerId: string, partialText: string) {
  getChannel().postMessage({
    type: "ambient-typing",
    senderId,
    payload: { peerId, partialText },
  });
}

/**
 * Broadcast a "delete for everyone" signal to all other tabs.
 * @param messageId  The message to delete
 * @param senderId   Who is requesting the deletion
 */
export function broadcastDeleteMessage(messageId: string, senderId: string) {
  getChannel().postMessage({
    type: "delete",
    senderId,
    payload: { messageId },
  });
}

/** Tell the sender that their message has been read */
export function broadcastReadAck(messageId: string, readerId: string) {
  getChannel().postMessage({
    type: "read-ack",
    senderId: readerId,
    payload: { messageId },
  });
}
