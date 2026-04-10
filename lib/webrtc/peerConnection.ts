/**
 * peerConnection.ts
 * Manages the lifecycle of a single SimplePeer connection.
 */
import SimplePeer from "simple-peer";
import { useChatStore } from '@/store/chatStore';
import { NetworkPacket } from '@/types/network';


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
  peer.on("data", (data) => {
    try {
      const packet: NetworkPacket = JSON.parse(data.toString());

      if (packet.type === 'control') {
        // Execute the remote instruction (delete, read receipt, etc.)
        useChatStore.getState().executeRemoteControlAction(packet.action, packet.targetId);
        return;
      }

      if (packet.type === 'chat') {
        // Standard chat message routing
        useChatStore.getState().addMessage(packet.message);

        // Bonus: Fire back a 'delivered' control packet here
      }

    } catch (error) {
      console.error("Failed to parse incoming WebRTC packet:", error);
    }
  });
  peer.on("close", () => handlers.onClose());
  peer.on("error", (err) => handlers.onError(err));

  return peer;
}
