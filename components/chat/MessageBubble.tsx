"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Message, useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store";
import { cn, formatTime } from "@/lib/utils/helpers";
import {
  Check, CheckCheck, Clock, AlertCircle,
  ShieldCheck, Trash2, Trash, Ban, RotateCcw, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { broadcastDeleteMessage, broadcastReadAck } from "@/lib/webrtc/broadcastChannel";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { VoicePlayer } from "./VoicePlayer";
import { sendLocalMessage } from "@/lib/webrtc/broadcastChannel";


/* ── Status tick icons (Proof of Delivery) ──────────────────── */
const StatusIcon = ({
  status, onResend,
}: { status: Message["status"]; onResend?: () => void }) => {
  if (status === "sending") return <Clock className="w-3 h-3 opacity-50 animate-pulse" />;
  if (status === "queued") return <Clock className="w-3 h-3 opacity-40" />;
  if (status === "sent") return <Check className="w-3 h-3 opacity-70" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 opacity-80" />;
  if (status === "read") return <CheckCheck className="w-3 h-3 text-primary" />;
  if (status === "failed") return (
    <button onClick={onResend} className="flex items-center gap-0.5 text-destructive hover:opacity-80" title="Resend">
      <AlertCircle className="w-3 h-3" /><RotateCcw className="w-2.5 h-2.5" />
    </button>
  );
  return null;
};

/* ── Context menu ───────────────────────────────────────────── */
function ContextMenu({
  x, y, isMe, onDeleteMe, onDeleteEveryone, onClose,
}: { x: number; y: number; isMe: boolean; onDeleteMe: () => void; onDeleteEveryone: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", fn);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fn); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const safeX = typeof window !== "undefined" ? Math.min(x, window.innerWidth - 210) : x;
  const safeY = typeof window !== "undefined" ? Math.min(y, window.innerHeight - 130) : y;

  return (
    <motion.div
      ref={ref}
      style={{ position: "fixed", top: safeY, left: safeX, zIndex: 9999 }}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.1 }}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[190px] py-1"
    >
      <button
        onClick={() => { onDeleteMe(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors text-left"
      >
        <Trash className="w-4 h-4 shrink-0" /> Delete for Me
      </button>
      {isMe && (
        <button
          onClick={() => { onDeleteEveryone(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
        >
          <Trash2 className="w-4 h-4 shrink-0" /> Delete for Everyone
        </button>
      )}
    </motion.div>
  );
}

/* ── Image bubble ───────────────────────────────────────────── */
function ImageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const [enlarged, setEnlarged] = useState(false);
  const dataUrl = msg.fileData?.dataUrl;
  if (!dataUrl) return null;

  return (
    <>
      <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl overflow-hidden shadow-sm cursor-pointer max-w-[260px]",
            isMe ? "rounded-tr-sm" : "rounded-tl-sm border border-border/50"
          )}
          onClick={() => setEnlarged(true)}
        >
          <img src={dataUrl} alt="Photo" className="w-full max-h-60 object-cover" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
          <ShieldCheck className="w-2.5 h-2.5 opacity-40" />
          <span>{formatTime(msg.timestamp)}</span>
          {isMe && <StatusIcon status={msg.status} />}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {enlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setEnlarged(false)}
          >
            <img src={dataUrl} alt="Photo" className="max-w-full max-h-full rounded-xl object-contain" />
            <a
              href={dataUrl} download="photo.jpg"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full"
            >
              <Download className="w-5 h-5" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Main MessageBubble ─────────────────────────────────────── */
interface Props { msg: Message; isMe: boolean; index: number; }

export default function MessageBubble({ msg, isMe, index }: Props) {
  const { deleteMessageLocally, deleteMessageForEveryone, addMessage, updateMessageStatus } = useChatStore();
  const { currentUser } = useUserStore();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback((x: number, y: number) => setMenu({ x, y }), []);
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); openMenu(e.clientX, e.clientY); };
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    longPressTimer.current = setTimeout(() => openMenu(t.clientX, t.clientY), 500);
  };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Read receipt: send ACK when message scrolls into view
  useEffect(() => {
    if (isMe || msg.status === "read" || msg.deletedForEveryone) return;
    const el = bubbleRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && currentUser) {
        updateMessageStatus(msg.id, "read");
        // Notify sender tab via BroadcastChannel
        broadcastReadAck(msg.id, currentUser.id);
        // Notify sender via WebRTC (remote peer)
        const peer = peersInstance[msg.senderId];
        if (peer) {
          try { peer.send(JSON.stringify({ type: "read-ack", messageId: msg.id })); } catch { }
        }
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [msg.id, isMe, msg.status]);

  const handleDeleteForMe = () => deleteMessageLocally(msg.id);
  const handleDeleteForEveryone = () => {
    deleteMessageForEveryone(msg.id);
    if (currentUser) broadcastDeleteMessage(msg.id, currentUser.id);
    const sig = JSON.stringify({ type: "delete", messageId: msg.id });
    Object.values(peersInstance).forEach((p) => { try { p.send(sig); } catch { } });
  };

  const handleResend = () => {
    if (!currentUser) return;
    deleteMessageLocally(msg.id);
    const resent = { ...msg, status: "sending" as const };
    addMessage(resent);
    sendLocalMessage({ id: resent.id, senderId: resent.senderId, senderName: currentUser.name, receiverId: resent.receiverId as string, content: resent.content, timestamp: resent.timestamp });
    updateMessageStatus(resent.id, "sent");
  };

  /* Tombstone */
  if (msg.deletedForEveryone) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={cn("flex", isMe ? "justify-end" : "justify-start")}
      >
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic px-3 py-2 rounded-2xl border border-border/30 bg-muted/20">
          <Ban className="w-3.5 h-3.5 shrink-0" /> This message was deleted
        </div>
      </motion.div>
    );
  }

  /* Voice message */
  if (msg.type === "voice" && msg.fileData?.blobUrl) {

    // THE FIX: Type cast fileData so TypeScript stops complaining
    const safeFileData = msg.fileData as { blobUrl: string; duration?: number };
    const blobUrl = safeFileData.blobUrl;
    const duration = safeFileData.duration ?? 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.25) }}
        className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}
        ref={bubbleRef}
      >
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm min-w-[200px]",
          isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border/60 rounded-tl-sm"
        )}>
          {/* Pass the extracted and type-safe variables */}
          <VoicePlayer blobUrl={blobUrl} duration={duration} />
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] px-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
          <ShieldCheck className="w-2.5 h-2.5 opacity-40" />
          <span>{formatTime(msg.timestamp)}</span>
          {isMe && <StatusIcon status={msg.status} onResend={handleResend} />}
        </div>
      </motion.div>
    );
  }
  /* Image message */
  if (msg.type === "image") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.25) }}
        ref={bubbleRef}
      >
        <ImageBubble msg={msg} isMe={isMe} />
      </motion.div>
    );
  }

  /* Normal text bubble */
  return (
    <>
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.25) }}
        className={cn("flex flex-col gap-0.5 group", isMe ? "items-end" : "items-start")}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={cn(
            "max-w-[78%] sm:max-w-[68%] rounded-2xl px-4 py-2.5 shadow-sm",
            isMe ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card text-card-foreground border border-border/60 rounded-tl-sm"
          )}
        >
          <p className="break-words text-sm whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
          <div className={cn(
            "flex items-center gap-1 mt-1 text-[10px]",
            isMe ? "justify-end text-primary-foreground/60" : "justify-start text-muted-foreground"
          )}>
            <ShieldCheck className="w-2.5 h-2.5 opacity-40" />
            <span>{formatTime(msg.timestamp)}</span>
            {isMe && <StatusIcon status={msg.status} onResend={handleResend} />}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {menu && (
          <ContextMenu
            x={menu.x} y={menu.y} isMe={isMe}
            onDeleteMe={handleDeleteForMe}
            onDeleteEveryone={handleDeleteForEveryone}
            onClose={() => setMenu(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
