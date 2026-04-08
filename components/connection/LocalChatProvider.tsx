"use client";
/**
 * LocalChatProvider.tsx
 * Mounts once in AppShell.  Listens to the BroadcastChannel and syncs
 * peer presence + incoming messages into the Zustand store.
 * Also runs a 10-second heartbeat so offline peers are detected.
 */
import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import {
  getChannel,
  broadcastAnnounce,
  broadcastLeave,
  broadcastPing,
  broadcastPong,
  BCEnvelope,
} from "@/lib/webrtc/broadcastChannel";

// expose for MessageBubble re-export only
export { broadcastReadAck } from "@/lib/webrtc/broadcastChannel";

const OFFLINE_TIMEOUT = 18_000; // ms – mark peer offline after 18 s of silence

export function LocalChatProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUserStore();
  const { addPeer, updatePeerStatus, addMessage, deleteMessageForEveryone } = useChatStore();

  // lastSeen map to detect offline peers
  const lastSeenRef = useRef<Record<string, number>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const ch = getChannel();

    // Announce ourselves so other tabs add us as a peer
    broadcastAnnounce(currentUser);

    const handleMessage = (ev: MessageEvent<BCEnvelope>) => {
      const { type, senderId, user, payload } = ev.data;

      // Ignore own messages
      if (senderId === currentUser.id) return;

      // Track last seen
      lastSeenRef.current[senderId] = Date.now();

      switch (type) {
        case "announce":
        case "ping": {
          if (!user) break;
          // Add or refresh the peer
          addPeer({
            id: user.id,
            name: user.name,
            publicKey: user.publicKey ?? "",
            isOnline: true,
            unreadCount: 0,
          });
          updatePeerStatus(user.id, true);
          // Reply with a pong so the newcomer knows we exist
          if (type === "announce") broadcastPong(currentUser);
          break;
        }
        case "pong": {
          if (!user) break;
          addPeer({
            id: user.id,
            name: user.name,
            publicKey: user.publicKey ?? "",
            isOnline: true,
            unreadCount: 0,
          });
          updatePeerStatus(user.id, true);
          break;
        }
        case "message": {
          if (!payload) break;
          const { id, senderId: msgSender, receiverId, content, timestamp } =
            payload as Record<string, string | number>;

          // Accept messages addressed to us OR broadcast messages
          if (
            receiverId === currentUser.id ||
            receiverId === "broadcast"
          ) {
            addMessage({
              id: id as string,
              senderId: msgSender as string,
              receiverId: receiverId as string,
              content: content as string,
              timestamp: timestamp as number,
              status: "delivered",
              type: "text",
            });
          }
          break;
        }
        case "leave": {
          updatePeerStatus(senderId, false);
          break;
        }
        case "delete": {
          // Another tab is signalling a delete-for-everyone
          if (!payload?.messageId) break;
          deleteMessageForEveryone(payload.messageId as string);
          break;
        }
        case "read-ack": {
          // Another tab says they've read one of our messages
          if (!payload?.messageId) break;
          useChatStore.getState().updateMessageStatus(payload.messageId as string, "read");
          break;
        }
      }
    };

    ch.addEventListener("message", handleMessage);

    // Heartbeat: ping every 8 s, clean up dead peers every 10 s
    const pingInterval = setInterval(() => broadcastPing(currentUser), 8_000);
    const cleanInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, ts] of Object.entries(lastSeenRef.current)) {
        if (now - ts > OFFLINE_TIMEOUT) {
          updatePeerStatus(id, false);
        }
      }
    }, 10_000);

    // Announce leave on unload
    const handleUnload = () => broadcastLeave(currentUser.id);
    window.addEventListener("beforeunload", handleUnload);

    cleanupRef.current = () => {
      ch.removeEventListener("message", handleMessage);
      clearInterval(pingInterval);
      clearInterval(cleanInterval);
      window.removeEventListener("beforeunload", handleUnload);
      broadcastLeave(currentUser.id);
    };

    return () => cleanupRef.current?.();
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
