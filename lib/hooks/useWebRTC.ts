"use client";
/**
 * useWebRTC.ts
 * Hook for managing WebRTC peer connections from components.
 */
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { useChatStore } from "@/store";

export function useWebRTC() {
  const { peers } = useChatStore();

  const isConnected = (peerId: string) => {
    return !!peersInstance[peerId] && peers[peerId]?.isOnline === true;
  };

  const sendRaw = (peerId: string, data: string): boolean => {
    const peer = peersInstance[peerId];
    if (!peer) return false;
    try {
      peer.send(data);
      return true;
    } catch {
      return false;
    }
  };

  const connectedPeerIds = () => Object.keys(peersInstance);

  return { isConnected, sendRaw, connectedPeerIds };
}
