/**
 * meshNetwork.ts
 * Basic multi-hop message relay simulation.
 * When peer A wants to reach peer C through B, it wraps the message
 * with routing info and B relays it if C is known to B.
 */
import { peersInstance } from "@/components/connection/PeerDiscovery";

export interface RelayEnvelope {
  type: "relay";
  target: string;       // Final destination peer ID
  hops: string[];       // Peer IDs this has already passed through
  payload: object;      // Original message payload
}

/**
 * Attempt to relay a message to targetId via any connected peer.
 * Returns true if relay was dispatched.
 */
export function relayMessage(
  targetId: string,
  payload: object,
  selfId: string,
  maxHops = 3
): boolean {
  const envelope: RelayEnvelope = {
    type: "relay",
    target: targetId,
    hops: [selfId],
    payload,
  };

  for (const [peerId, peer] of Object.entries(peersInstance)) {
    if (peerId === targetId) continue; // Already direct
    try {
      peer.send(JSON.stringify(envelope));
      return true;
    } catch {}
  }
  return false;
}

/**
 * Handle an incoming relay envelope — forward if we're not the target.
 */
export function handleRelay(
  envelope: RelayEnvelope,
  selfId: string,
  onDeliver: (payload: object) => void
) {
  if (envelope.target === selfId) {
    onDeliver(envelope.payload);
    return;
  }

  if (envelope.hops.length >= 3) return; // Max hops exceeded

  // Forward to all peers not already in hops chain
  const updatedEnvelope: RelayEnvelope = {
    ...envelope,
    hops: [...envelope.hops, selfId],
  };

  for (const [peerId, peer] of Object.entries(peersInstance)) {
    if (updatedEnvelope.hops.includes(peerId)) continue;
    try {
      peer.send(JSON.stringify(updatedEnvelope));
    } catch {}
  }
}
