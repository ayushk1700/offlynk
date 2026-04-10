/**
 * meshNetwork.ts
 * Basic multi-hop message relay simulation.
 */
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { RelayEnvelope, NetworkPacket, ChatPacket, ControlPacket } from "@/types/network";
// LRU Cache equivalent to prevent infinite loops in the mesh
const seenRelays = new Set<string>();
const MAX_SEEN_CACHE = 1000;

function trackRelay(id: string) {
  seenRelays.add(id);
  if (seenRelays.size > MAX_SEEN_CACHE) {
    const firstItem = seenRelays.keys().next().value;
    if (firstItem) seenRelays.delete(firstItem);
  }
}

/**
 * Attempt to relay a message to targetId via any connected peer.
 */
export function relayMessage(
  targetId: string,
  payload: ChatPacket | ControlPacket, // <-- FIX: Change this line from NetworkPacket
  selfId: string,
  maxHops = 3
): boolean {
  const envelopeId = crypto.randomUUID();
  trackRelay(envelopeId);

  const envelope: RelayEnvelope = {
    type: "relay",
    messageId: envelopeId,
    target: targetId,
    hops: [selfId],
    maxHops,
    payload, // The red underline will now disappear!
  };


  let dispatched = false;
  for (const [peerId, peer] of Object.entries(peersInstance)) {
    if (peerId === targetId) continue;
    if (peer.connected) {
      try {
        peer.send(JSON.stringify(envelope));
        dispatched = true;
      } catch (err) { console.warn("Relay failed to", peerId, err); }
    }
  }
  return dispatched;
}

/**
 * Handle an incoming relay envelope — forward if we're not the target.
 */
export function handleRelay(
  envelope: RelayEnvelope,
  selfId: string,
  onDeliver: (payload: NetworkPacket) => void
) {
  // 1. DEDUPLICATION: Drop immediately if we've seen this exact packet
  if (seenRelays.has(envelope.messageId)) return;
  trackRelay(envelope.messageId);

  // 2. DELIVER: If it's meant for us
  if (envelope.target === selfId) {
    onDeliver(envelope.payload);
    return;
  }

  // 3. DROP: If max hops exceeded
  if (envelope.hops.length >= envelope.maxHops) return;

  // 4. FORWARD: Send to all connected peers not in the hop chain
  const updatedEnvelope: RelayEnvelope = {
    ...envelope,
    hops: [...envelope.hops, selfId],
  };

  for (const [peerId, peer] of Object.entries(peersInstance)) {
    if (updatedEnvelope.hops.includes(peerId)) continue;
    if (peer.connected) {
      try {
        peer.send(JSON.stringify(updatedEnvelope));
      } catch (err) { console.warn("Failed to forward", peerId, err); }
    }
  }
}