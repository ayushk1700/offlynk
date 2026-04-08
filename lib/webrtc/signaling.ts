/**
 * signaling.ts
 * Manual signaling helpers — base64 encode/decode WebRTC offer/answer.
 * This app uses copy-paste / QR codes as the signaling channel (no server).
 */

export function encodeSignal(signal: object, userMeta: object): string {
  return btoa(JSON.stringify({ sdp: signal, user: userMeta }));
}

export function decodeSignal(encoded: string): { sdp: object; user: any } {
  return JSON.parse(atob(encoded));
}
