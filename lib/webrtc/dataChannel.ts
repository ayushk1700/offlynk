/**
 * dataChannel.ts
 * Typed message protocol for the WebRTC data channel.
 */

export type ChannelMessageType = "handshake" | "message" | "typing" | "ack" | "file-meta" | "file-chunk";

export interface ChannelMessage {
  type: ChannelMessageType;
  senderId?: string;
  [key: string]: unknown;
}

export function parseChannelMessage(raw: string): ChannelMessage | null {
  try {
    return JSON.parse(raw) as ChannelMessage;
  } catch {
    return null;
  }
}

export function serializeMessage(msg: ChannelMessage): string {
  return JSON.stringify(msg);
}
