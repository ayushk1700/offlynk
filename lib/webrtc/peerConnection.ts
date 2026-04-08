/**
 * peerConnection.ts
 * Manages the lifecycle of a single SimplePeer connection.
 */
import SimplePeer from "simple-peer";

export type PeerEventHandlers = {
  onConnect: (peer: InstanceType<typeof SimplePeer>) => void;
  onData: (data: string) => void;
  onClose: () => void;
  onError: (err: Error) => void;
};

export function createPeer(
  initiator: boolean,
  handlers: PeerEventHandlers,
  stream?: MediaStream
): InstanceType<typeof SimplePeer> {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    stream,
  });

  peer.on("connect", () => handlers.onConnect(peer));
  peer.on("data", (data) => handlers.onData(data.toString()));
  peer.on("close", () => handlers.onClose());
  peer.on("error", (err) => handlers.onError(err));

  return peer;
}
