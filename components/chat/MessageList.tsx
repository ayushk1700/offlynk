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
import { motion } from "framer-motion";

export default function MessageList() {
  const { messages, activeChatId, deleteMessageLocally } = useChatStore();
  const { currentUser } = useUserStore();
  const { selfDestructChats } = useFeatureStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [typingPeers, setTypingPeers] = useState<string[]>([]);

  const activeMessages = messages.filter((m) =>
    m.receiverId === activeChatId ||
    m.senderId === activeChatId ||
    (activeChatId === "broadcast" && m.receiverId === "broadcast")
  );

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  // Self-destruct timer
  useEffect(() => {
    if (!activeChatId) return;
    const mins = selfDestructChats[activeChatId] ?? 0;
    if (!mins) return;

    const ms = mins * 60 * 1000;
    const now = Date.now();

    // Delete messages older than the window
    activeMessages.forEach((m) => {
      if (now - m.timestamp > ms) {
        deleteMessageLocally(m.id);
      }
    });

    // Check every 30s
    const interval = setInterval(() => {
      const nowTs = Date.now();
      useChatStore.getState().messages.forEach((m) => {
        if ((m.receiverId === activeChatId || m.senderId === activeChatId) && nowTs - m.timestamp > ms) {
          deleteMessageLocally(m.id);
        }
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeChatId, selfDestructChats]);

  // Typing indicator via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ch = getChannel();
    const handler = (ev: MessageEvent) => {
      const { type, senderId, payload } = ev.data ?? {};
      if (type !== "typing") return;
      if (payload?.peerId !== currentUser?.id && activeChatId !== senderId) return;
      setTypingPeers((prev) => prev.includes(senderId) ? prev : [...prev, senderId]);
      setTimeout(() => setTypingPeers((prev) => prev.filter((id) => id !== senderId)), 2500);
    };
    ch.addEventListener("message", handler);
    return () => ch.removeEventListener("message", handler);
  }, [activeChatId, currentUser?.id]);

  if (activeMessages.length === 0) {
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
        const isBroadcastMsg = msg.receiverId === "broadcast" && !isMe;

        if (isBroadcastMsg) return <BroadcastMessage key={msg.id || idx} msg={msg} />;
        if (msg.type === "file") return <FileMessage key={msg.id || idx} msg={msg} isMe={isMe} />;
        return <MessageBubble key={msg.id || idx} msg={msg} isMe={isMe} index={idx} />;
      })}

      {typingPeers.length > 0 && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
