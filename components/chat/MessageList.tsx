"use client";

import { useChatStore, useUserStore } from "@/store";
import MessageBubble from "./MessageBubble";
import { FileMessage } from "@/components/file/FileMessage";
import { BroadcastMessage } from "@/components/emergency/BroadcastMessage";
import TypingIndicator from "./TypingIndicator";
import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getChannel } from "@/lib/webrtc/broadcastChannel";
import { useFeatureStore } from "@/store/featureStore";

/** Tracks both typing presence and live ambient text per peer */
interface TypingPeer {
  id: string;
  name: string;
  liveText: string;
}

export default function MessageList() {
  const { messages, activeChatId, peers, deleteMessage, typingPeers } = useChatStore();
  const { currentUser } = useUserStore();
  const { selfDestructChats } = useFeatureStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [typingMap, setTypingMap] = useState<Record<string, TypingPeer>>({});
  const expiryTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  useEffect(() => {
    setTypingMap({});
    Object.values(expiryTimers.current).forEach(clearTimeout);
    expiryTimers.current = {};
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, typingMap]);

  // Self-destruct timer
  useEffect(() => {
    if (!activeChatId) return;
    const mins = selfDestructChats[activeChatId] ?? 0;
    if (!mins) return;

    const ms = mins * 60 * 1000;
    const now = Date.now();
    activeMessages.forEach((m) => {
      if (now - m.timestamp > ms) {
        deleteMessage(activeChatId, m.id, 'for-me');
      }
    });

    const interval = setInterval(() => {
      const nowTs = Date.now();
      const thread = useChatStore.getState().messages[activeChatId] || [];
      thread.forEach((m) => {
        if (nowTs - m.timestamp > ms) {
          deleteMessage(activeChatId, m.id, 'for-me');
        }
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, [activeChatId, selfDestructChats, activeMessages, deleteMessage]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeChatId) return;
    const ch = getChannel();

    const clearPeer = (senderId: string) => {
      if (expiryTimers.current[senderId]) clearTimeout(expiryTimers.current[senderId]);
      setTypingMap((prev) => {
        const n = { ...prev };
        delete n[senderId];
        return n;
      });
    };

    const resetExpiry = (senderId: string, ms: number) => {
      if (expiryTimers.current[senderId]) clearTimeout(expiryTimers.current[senderId]);
      expiryTimers.current[senderId] = setTimeout(() => clearPeer(senderId), ms);
    };

    const handler = (ev: MessageEvent) => {
      const { type, senderId, payload } = ev.data ?? {};
      if (senderId === currentUser?.id) return;
      if (senderId !== activeChatId && activeChatId !== "broadcast") return;

      if (type === "typing") {
        const peerName = peers[senderId]?.name ?? "Someone";
        setTypingMap((prev) => ({
          ...prev,
          [senderId]: { id: senderId, name: peerName, liveText: prev[senderId]?.liveText ?? "" },
        }));
        resetExpiry(senderId, 2500);
        return;
      }

      if (type === "ambient-typing") {
        const partialText: string = payload?.partialText ?? "";
        const peerName = peers[senderId]?.name ?? "Someone";
        if (!partialText.trim()) { clearPeer(senderId); return; }
        setTypingMap((prev) => ({
          ...prev,
          [senderId]: { id: senderId, name: peerName, liveText: partialText },
        }));
        resetExpiry(senderId, 4500);
      }
    };

    ch.addEventListener("message", handler);
    return () => ch.removeEventListener("message", handler);
  }, [activeChatId, currentUser?.id, peers]);

  const typingList = Object.entries(typingPeers || {})
    .filter(([id, data]) => data?.isTyping && id !== currentUser?.id && id === activeChatId)
    .map(([id, data]) => ({ id, name: peers[id]?.name || "Someone", liveText: data.liveText || "" }));

  if (activeMessages.length === 0 && typingList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground bg-muted/20 border border-border/40 rounded-2xl p-8 max-w-xs">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <h3 className="font-semibold text-foreground/70 mb-1 text-sm">End-to-End Encrypted</h3>
          <p className="text-xs leading-relaxed opacity-55">
            No servers. No logs. Only you and your peer can read these messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 pb-2">
      {activeMessages.map((msg, idx) => {
        const isMe = msg.senderId === currentUser?.id;
        const isBroadcastMsg = msg.receiverId === "broadcast";
        if (isBroadcastMsg) return <BroadcastMessage key={msg.id || idx} msg={msg} />;
        return <MessageBubble key={msg.id || idx} msg={msg} isMe={isMe} index={idx} />;
      })}

      {typingList.map((tp) => (
        <div key={tp.id} className="flex justify-start animate-in fade-in slide-in-from-bottom-2 pb-1">
          <TypingIndicator peerName={tp.name} liveText={tp.liveText} />
        </div>
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}