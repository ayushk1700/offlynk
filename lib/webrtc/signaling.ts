/**
 * signaling.ts
 * Manual signaling helpers — safe base64 encode/decode WebRTC offer/answer.
 */

// Safely encode Unicode/Emojis to Base64
export function encodeSignal(signal: object, userMeta: object): string {
  const jsonStr = JSON.stringify({ sdp: signal, user: userMeta });
  return btoa(
    encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// Safely decode Base64 containing Unicode/Emojis
export function decodeSignal(encoded: string): { sdp: object; user: any } {
  const decodedStr = decodeURIComponent(
    atob(encoded)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(decodedStr);
}