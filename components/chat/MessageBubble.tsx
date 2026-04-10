"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChatStore, LocalMessage } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { cn, formatTime } from "@/lib/utils/helpers";
import {
  Check, CheckCheck, Clock, AlertCircle,
  ShieldCheck, Trash2, Trash, Ban, RotateCcw, Download,
  Edit3, Smile, EyeOff, FileText, ChevronDown, ChevronUp, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { broadcastReadAck } from "@/lib/webrtc/broadcastChannel";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { VoicePlayer } from "./VoicePlayer";
import { serializeMessage } from "@/lib/webrtc/dataChannel";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/* ── Pulse Indicator ─────────────────────────────────────────── */
function PulseIndicator({ state }: { state: 'pending' | 'sent' | 'delivered' | 'read' }) {
  const colors = {
    pending: 'bg-muted-foreground/30',
    sent: 'bg-muted-foreground/60',
    delivered: 'bg-primary/60',
    read: 'bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]'
  };
  return <div className={cn("w-1.5 h-1.5 rounded-full", colors[state] || colors.pending)} />;
}

const statusMap = {
  pending: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
} as const;

/* ── Context menu ───────────────────────────────────────────── */
function ContextMenu({
  isMe, isDeleted, isStarred, canEdit, onEdit, onDeleteMe, onDeleteEveryone, onReact, onToggleStar, onClose, x, y
}: {
  x: number; y: number; isMe: boolean; isDeleted: boolean; isStarred?: boolean; canEdit: boolean;
  onEdit: () => void; onDeleteMe: () => void; onDeleteEveryone: () => void;
  onReact: (emoji: string) => void; onToggleStar: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  const menuOptions = isMe && !isDeleted
    ? [
      { label: isStarred ? 'Unstar Message' : 'Star Message', action: onToggleStar, show: true },
      { label: 'Edit', action: onEdit, show: canEdit },
      { label: 'Delete for Me', action: onDeleteMe, show: true },
      { label: 'Delete for Everyone', action: onDeleteEveryone, show: true },
      { label: 'Info', action: () => console.log("Info"), show: true },
    ]
    : [
      { label: isStarred ? 'Unstar Message' : 'Star Message', action: onToggleStar, show: !isDeleted },
      { label: 'Delete for Me', action: onDeleteMe, show: !isDeleted },
    ];

  const quickEmojis = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

  return (
    <motion.div
      ref={ref}
      style={{ position: "fixed", top: Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 250 : y), left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x), zIndex: 9999 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden py-1 min-w-[200px]"
    >
      {!isDeleted && (
        <div className="flex justify-around px-2 py-2 border-b border-border/30">
          {quickEmojis.map(e => (
            <button key={e} onClick={() => { onReact(e); onClose(); }} className="text-lg hover:scale-125 transition-transform p-1">{e}</button>
          ))}
        </div>
      )}

      {menuOptions.filter(o => o.show).map((opt, i) => (
        <button key={i} onClick={() => { opt.action(); onClose(); }} className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors",
          opt.label.includes('Delete for Everyone') && "text-destructive hover:bg-destructive/10"
        )}>
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}

/* ── Reactions Bar ──────────────────────────────────────────── */
function ReactionsBar({ reactions, onReact }: { reactions: Record<string, string[]>; onReact: (emoji: string) => void }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1 px-1">
      {Object.entries(reactions).map(([emoji, uids]) => (
        <motion.button
          key={emoji}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          onClick={() => onReact(emoji)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/50 border border-border/30 text-[11px] hover:bg-muted transition-colors"
        >
          <span>{emoji}</span>
          <span className="font-bold opacity-70">{uids.length}</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ── Image/Video bubble ────────────────────────────────────────── */
function MediaBubble({ msg, isMe, onMarkViewed, status }: { msg: LocalMessage; isMe: boolean, onMarkViewed: () => void, status: LocalMessage['status'] }) {
  const [enlarged, setEnlarged] = useState(false);
  const dataUrl = msg.fileData?.dataUrl || msg.fileData?.blobUrl;

  if (msg.isViewOnce && msg.isViewed && !isMe) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/30 border border-border/20 text-muted-foreground text-xs italic">
        <EyeOff className="w-3.5 h-3.5" /> Opened View-Once Media
      </div>
    );
  }

  const handleOpen = () => {
    setEnlarged(true);
    if (msg.isViewOnce && !isMe) onMarkViewed();
  };

  return (
    <>
      <div className={cn("flex flex-col gap-0.5 relative", isMe ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl overflow-hidden shadow-sm cursor-pointer group relative",
            msg.isViewOnce ? "border-2 border-dashed border-primary/30 p-1" : "max-w-[260px]",
            isMe ? "rounded-tr-sm" : "rounded-tl-sm border border-border/50"
          )}
          onClick={handleOpen}
        >
          {msg.isViewOnce ? (
            <div className="bg-primary/5 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-primary">View Once {msg.type === 'image' ? 'Photo' : 'Media'}</p>
                <p className="text-[10px] text-muted-foreground">Disappears after opening</p>
              </div>
            </div>
          ) : (
            <>
              <img src={dataUrl} alt="Media" className={cn("w-full max-h-60 object-cover transition-transform group-hover:scale-105", msg.isViewOnce && "blur-xl opacity-30")} />
              {msg.isViewOnce && <div className="absolute inset-0 flex items-center justify-center"><EyeOff className="w-8 h-8 text-white drop-shadow-lg" /></div>}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1 mt-0.5 font-medium">
          <ShieldCheck className="w-2.5 h-2.5 opacity-40" />
          <span>{formatTime(msg.timestamp)}</span>
          {isMe && <PulseIndicator state={statusMap[status as keyof typeof statusMap] || 'pending'} />}
        </div>
      </div>

      <AnimatePresence>
        {enlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setEnlarged(false)}
          >
            {msg.type === 'image' ? (
              <img src={dataUrl} alt="Photo" className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
            ) : (
              <video src={dataUrl} controls autoPlay className="max-w-full max-h-full rounded-xl" />
            )}
            <div className="absolute top-6 left-6 text-white/70 text-sm font-medium">
              {msg.isViewOnce && "⚠️ This media will disappear after you close it"}
            </div>
            {!msg.isViewOnce && (
              <a
                href={dataUrl} download={msg.fileData?.name || "media"}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors backdrop-blur-md"
              >
                <Download className="w-6 h-6" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Main MessageBubble ─────────────────────────────────────── */
interface Props { msg: LocalMessage; isMe: boolean; index: number; }

export default function MessageBubble({ msg, isMe, index }: Props) {
  const {
    updateMessage, deleteMessage, activeChatId, addTranscript
  } = useChatStore();
  const { currentUser } = useUserStore();

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [showTranscript, setShowTranscript] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);

  const canEdit = useMemo(() => {
    const timePassed = Date.now() - msg.timestamp;
    return timePassed < EDIT_WINDOW_MS;
  }, [msg.timestamp]);

  const peerId = activeChatId || (isMe ? msg.receiverId : msg.senderId);

  // Read receipts & View Once detection
  useEffect(() => {
    if (isMe || msg.status === "read" || msg.isDeleted || !peerId || !currentUser) return;
    const el = bubbleRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        updateMessage(peerId, msg.id, { status: "read" });
        const peer = peersInstance[peerId];
        if (peer?.connected) {
          try {
            peer.send(serializeMessage({
              type: "read-receipt",
              id: crypto.randomUUID(),
              senderId: currentUser.id,
              timestamp: Date.now(),
              messageId: msg.id,
              status: "read"
            }));
          } catch (e) { }
        }
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [msg.id, isMe, msg.status, currentUser, peerId]);

  const handleEdit = () => {
    if (!canEdit) { setIsEditing(false); return; }
    if (editValue === msg.content || !currentUser || !peerId) return setIsEditing(false);
    const editedAt = Date.now();

    // 1. Optimistic local update
    updateMessage(peerId, msg.id, {
      content: editValue,
      isEdited: true,
      editedAt,
    });
    setIsEditing(false);

    // 2. Broadcast to peer
    const peer = peersInstance[peerId];
    if (peer?.connected) {
      peer.send(serializeMessage({
        type: "message-edit",
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        timestamp: editedAt,
        messageId: msg.id,
        newContent: editValue,
        editedAt: editedAt
      }));
    }
  };

  const handleReact = (emoji: string) => {
    if (!currentUser || !peerId) return;
    let reactions: Record<string, string[]> = {};
    if (msg.reactions) {
      try { reactions = JSON.parse(msg.reactions as unknown as string); } catch(e) {}
    }
    const uids = reactions[emoji] || [];
    const isRemoving = uids.includes(currentUser.id);

    if (isRemoving) {
      reactions[emoji] = uids.filter((u: string) => u !== currentUser.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...uids, currentUser.id];
    }

    updateMessage(peerId, msg.id, { reactions: JSON.stringify(reactions) });

    // Notify peer
    const peer = peersInstance[peerId];
    if (peer?.connected) {
      peer.send(serializeMessage({
        type: "reaction",
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        timestamp: Date.now(),
        targetId: msg.id,
        emoji,
        isRemoving
      }));
    }
  };

  const handleMarkViewed = () => {
    if (!currentUser || !peerId) return;
    const expiry = Date.now() + 30000; // 30 second safety window
    updateMessage(peerId, msg.id, { isViewed: true, expiresAt: expiry });

    // Purge logic local (still keep for immediate UX)
    setTimeout(() => {
      updateMessage(peerId, msg.id, { fileData: undefined });
    }, 1000);

    const peer = peersInstance[peerId];
    if (peer?.connected) {
      peer.send(serializeMessage({
        type: "view-once",
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        timestamp: Date.now(),
        targetId: msg.id
      }));
    }
  };

  const handleDeleteEveryone = () => {
    if (!currentUser || !peerId) return;

    // 1. Tombstone locally
    deleteMessage(peerId, msg.id, 'for-everyone');

    // 2. Send burn command to peer
    const peer = peersInstance[peerId];
    if (peer?.connected) {
      peer.send(serializeMessage({
        type: 'message-delete',
        id: crypto.randomUUID(),
        senderId: currentUser.id,
        timestamp: Date.now(),
        messageId: msg.id,
        deleteType: 'for-everyone'
      }));
    }
  };

  const renderWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const isMeMentioned = currentUser && part.toLowerCase() === `@${currentUser.name.toLowerCase()}`;
        const isAll = part.toLowerCase() === '@all';
        return (
          <span key={i} className={cn(
            "font-bold px-1 rounded-sm",
            (isMeMentioned || isAll) ? "bg-yellow-400/20 text-yellow-500" : "bg-foreground/10"
          )}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (msg.isDeleted) {
    return (
      <div className={cn("flex mb-2", isMe ? "justify-end" : "justify-start")}>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 italic px-3 py-1.5 rounded-2xl border border-border/20 bg-muted/5">
          <Ban className="w-3.5 h-3.5 opacity-40" /> This message was deleted
        </div>
      </div>
    );
  }

  function toggleStarMessage(peerId: string, id: string): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className={cn("flex flex-col mb-3 animate-ink", isMe ? "items-end" : "items-start")}>
      {/* Media Block (Photos/Videos/ViewOnce) */}
      {(msg.type === "image" || (msg.fileData?.mimeType?.startsWith('video'))) && (
        <MediaBubble msg={msg} isMe={isMe} onMarkViewed={handleMarkViewed} status={msg.status} />
      )}

      {/* Voice Block */}
      {msg.type === "voice" && msg.fileData?.blobUrl && (
        <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")} ref={bubbleRef}>
          <div className={cn("rounded-2xl px-4 py-3 shadow-sm min-w-[220px]", isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border/60 rounded-tl-sm")}>
            <VoicePlayer blobUrl={msg.fileData.blobUrl} duration={msg.fileData.duration ?? 0} />

            {msg.transcript && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <button onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-1.5 text-[10px] font-bold opacity-80 uppercase tracking-widest">
                  <FileText className="w-3 h-3" /> {showTranscript ? "Hide Transcript" : "Show Transcript"}
                  {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <AnimatePresence>
                  {showTranscript && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-1 text-[13px] leading-relaxed italic opacity-90 overflow-hidden">
                      "{msg.transcript}"
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Block */}
      {msg.type === "text" && (
        <motion.div
          ref={bubbleRef}
          className={cn("flex flex-col gap-0.5 max-w-[80%]", isMe ? "items-end" : "items-start")}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
        >
          <div className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm relative group cursor-pointer",
            isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card text-card-foreground border border-border/60 rounded-tl-sm",
            msg.isStarred && "ring-1 ring-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
          )}>
            {isEditing ? (
              <div className="min-w-[200px] flex flex-col gap-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-white/10 dark:bg-black/20 rounded-lg p-2 text-sm focus:outline-none placeholder:text-white/40 resize-none min-h-[60px]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setIsEditing(false)} className="text-[11px] font-bold opacity-70 underline">Cancel</button>
                  <button onClick={handleEdit} className="text-[11px] font-bold bg-white text-black px-3 py-1 rounded-full px-2">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap select-text">{renderWithMentions(msg.content)}</p>
            )}

            <div className={cn("flex items-center gap-1.5 mt-1 text-[10px] font-medium", isMe ? "text-primary-foreground/60 justify-end" : "text-muted-foreground", msg.isStarred && !isMe && "text-yellow-600/80")}>
              <span className="text-[10px] text-muted-foreground ml-1">
                {msg.isEdited && !msg.isDeleted ? '(edited)' : ''}
              </span>
              <span>•</span>
              {msg.hopCount && msg.hopCount > 1 && (
                <span className="bg-blue-500/10 text-blue-500 font-bold px-1 rounded flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" /> {msg.hopCount}h
                </span>
              )}
              {msg.isStarred && <span className="text-yellow-400">★</span>}
              <span>{formatTime(msg.timestamp)}</span>
              {isMe && <PulseIndicator state={statusMap[msg.status as keyof typeof statusMap] || 'pending'} />}
            </div>
          </div>
        </motion.div>
      )}

      {/* Reactions */}
      <ReactionsBar reactions={msg.reactions ? JSON.parse(msg.reactions as unknown as string) : {}} onReact={handleReact} />

      {/* Context Menu */}
      <AnimatePresence>
        {menu && (
          <ContextMenu
            x={menu.x} y={menu.y} isMe={isMe} isDeleted={!!msg.isDeleted}
            isStarred={msg.isStarred}
            canEdit={canEdit}
            onToggleStar={() => toggleStarMessage(peerId, msg.id)}
            onEdit={() => setIsEditing(true)}
            onDeleteMe={() => deleteMessage(peerId, msg.id, 'for-me')}
            onDeleteEveryone={handleDeleteEveryone}
            onReact={handleReact}
            onClose={() => setMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}