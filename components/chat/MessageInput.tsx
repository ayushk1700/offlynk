"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, useUserStore } from "@/store";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Send, ShieldAlert, X, Paperclip } from "lucide-react";
import { generateId } from "@/lib/utils/helpers";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { sendLocalMessage, sendTypingSignal, sendAmbientTyping } from "@/lib/webrtc/broadcastChannel";
import { EmojiPicker } from "./EmojiPicker";

// FIX: Removed VoicePlayer and changed import path to "./VoiceRecorder"
import { VoiceMessageData, VoiceRecorder } from "./VoicePlayer";
import { VideoRecorder, VideoMessageData } from "./VideoRecorder";
import { CameraCapture } from "./CameraCapture";
import { FileUpload } from "@/components/file/FileUpload";
import { sendFile } from "@/lib/webrtc/fileTransfer";
import { outgoingTransfers } from "@/components/file/FileTransferProgress";

export default function MessageInput() {
  const [text, setText] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const { activeChatId, addMessage, peers } = useChatStore();
  const { currentUser } = useUserStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    setShowFileUpload(false);
    setText("");
  }, [activeChatId]);

  /* ── Send text ─────────────────────────────────────────── */
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !activeChatId || !currentUser) return;

    const id = generateId();
    const ts = Date.now();
    const content = text.trim();
    const msgData = { id, senderId: currentUser.id, receiverId: activeChatId, content, timestamp: ts, type: "text" as const };

    addMessage({ ...msgData, status: "sending", did: `did:offgrid:${currentUser.id}` });
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Send via BroadcastChannel (tabs) + WebRTC (remote)
    sendLocalMessage({ id, senderId: currentUser.id, senderName: currentUser.name, receiverId: activeChatId, content, timestamp: ts });
    const rtcPeer = peersInstance[activeChatId];
    if (rtcPeer) { try { rtcPeer.send(JSON.stringify({ ...msgData, type: "message" })); } catch { } }
    else if (activeChatId === "broadcast") {
      Object.values(peersInstance).forEach((p) => { try { p.send(JSON.stringify({ ...msgData, type: "message" })); } catch { } });
    }

    useChatStore.getState().updateMessageStatus(id, "sent");

    // Clear ambient typing now that message is sent
    if (activeChatId && currentUser) sendAmbientTyping(currentUser.id, activeChatId, "");
  };

  /* ── Send voice ────────────────────────────────────────── */
  const handleVoiceSend = (data: VoiceMessageData) => {
    if (!activeChatId || !currentUser) return;
    const id = generateId();
    const ts = Date.now();

    addMessage({
      id, senderId: currentUser.id, receiverId: activeChatId, content: "🎙 Voice message",
      timestamp: ts, status: "sent", type: "voice",
      fileData: { name: "voice.webm", mimeType: data.mimeType, blobUrl: data.blobUrl, duration: data.duration },
      did: `did:offgrid:${currentUser.id}`,
    });

    useChatStore.getState().updateMessageStatus(id, "sent");
  };

  /* ── Send video ────────────────────────────────────────── */
  const handleVideoSend = (data: VideoMessageData) => {
    if (!activeChatId || !currentUser) return;
    const id = generateId();
    const ts = Date.now();

    addMessage({
      id, senderId: currentUser.id, receiverId: activeChatId, content: "🎥 Video message",
      timestamp: ts, status: "sent", type: "file",
      fileData: { name: "video.webm", mimeType: data.mimeType, blobUrl: data.blobUrl, duration: data.duration, size: data.size },
      did: `did:offgrid:${currentUser.id}`,
    });

    useChatStore.getState().updateMessageStatus(id, "sent");
  };

  /* ── Send camera photo ─────────────────────────────────── */
  const handleCameraCapture = (blob: Blob, dataUrl: string) => {
    if (!activeChatId || !currentUser) return;
    const id = generateId();
    const ts = Date.now();

    const newFileData = {
      name: "photo.jpg",
      size: blob.size,
      mimeType: "image/jpeg",
      dataUrl: dataUrl
    };

    addMessage({
      id, senderId: currentUser.id, receiverId: activeChatId, content: "📷 Photo",
      timestamp: ts, status: "sending", type: "image",
      fileData: newFileData,
      did: `did:offgrid:${currentUser.id}`,
    });

    // Send encrypted over WebRTC
    const peer = peersInstance[activeChatId];
    if (peer) {
      const transferId = generateId();
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      outgoingTransfers.set(transferId, { name: "photo.jpg", size: blob.size, progress: 0 });
      sendFile(file, transferId, currentUser.id, (data) => {
        try { peer.send(data); } catch { }
      }, (pct) => {
        outgoingTransfers.set(transferId, { name: "photo.jpg", size: blob.size, progress: pct });
      }).then(() => {
        outgoingTransfers.delete(transferId);
        useChatStore.getState().updateMessageStatus(id, "delivered");
      });
    } else {
      useChatStore.getState().updateMessageStatus(id, "sent");
    }
  };

  /* ── Keyboard ──────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";

    const { privacyTyping } = useAuthStore.getState();

    if (activeChatId && currentUser && privacyTyping) {
      sendTypingSignal(currentUser.id, activeChatId);
      sendAmbientTyping(currentUser.id, activeChatId, e.target.value);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (activeChatId && currentUser) sendAmbientTyping(currentUser.id, activeChatId, "");
    }, 4000);
  };

  const insertEmoji = (emoji: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const isBroadcast = activeChatId === "broadcast";
  const hasText = text.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-card/92 backdrop-blur-md relative">
      {/* File upload panel */}
      {showFileUpload && (
        <div className="border-b border-border/50 bg-card">
          <FileUpload onClose={() => setShowFileUpload(false)} />
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-1.5 items-end px-2 py-2">
        {/* LEFT: Emoji + Attach + Camera */}
        <EmojiPicker onSelect={insertEmoji} />

        <button
          type="button"
          onClick={() => setShowFileUpload((v) => !v)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showFileUpload
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          title="Attach file"
        >
          {showFileUpload ? <X className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
        </button>

        {!hasText && !isBroadcast && <CameraCapture onCapture={handleCameraCapture} />}

        {/* CENTER: Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isBroadcast ? "Emergency broadcast…" : "Message"}
            rows={1}
            className="w-full resize-none bg-muted/50 border border-border/40 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground placeholder:text-muted-foreground max-h-36 overflow-y-auto leading-relaxed transition-all"
            style={{ height: "auto" }}
          />
        </div>

        {/* RIGHT: Voice + Video (no text) OR Send (has text) */}
        {!hasText && !isBroadcast ? (
          <div className="flex items-center gap-1">
            <VideoRecorder onSend={handleVideoSend} />
            <VoiceRecorder onSend={handleVoiceSend} />
          </div>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() && !isBroadcast}
            className={`shrink-0 h-10 w-10 rounded-2xl transition-all ${isBroadcast
              ? "bg-destructive hover:bg-destructive/80 text-destructive-foreground"
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
              }`}
          >
            {isBroadcast ? <ShieldAlert className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        )}
      </form>
    </div>
  );
}