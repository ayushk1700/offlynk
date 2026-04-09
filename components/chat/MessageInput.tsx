"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, useUserStore } from "@/store";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Send, ShieldAlert, X, Paperclip, Plus } from "lucide-react";
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
    if (rtcPeer) { try { rtcPeer.send(JSON.stringify({ ...msgData, type: "message" })); } catch (err) { console.error("RTC send error:", err); } }
    else if (activeChatId === "broadcast") {
      Object.values(peersInstance).forEach((p) => { try { p.send(JSON.stringify({ ...msgData, type: "message" })); } catch (err) { console.error("RTC send error:", err); } });
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
        try { peer.send(data); } catch (err) { console.error("RTC send error:", err); }
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
    <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-xl relative pb-[env(safe-area-inset-bottom,0px)]">
      {/* File upload panel */}
      {showFileUpload && (
        <div className="border-b border-border/50 bg-card overflow-hidden">
          <FileUpload onClose={() => setShowFileUpload(false)} />
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 items-end px-3 py-2.5 mx-auto max-w-4xl">
        {/* LEFT: Attach / + */}
        <button
          type="button"
          onClick={() => setShowFileUpload((v) => !v)}
          className={`shrink-0 w-9 h-9 mb-[3px] flex items-center justify-center rounded-full transition-transform duration-300 ${
            showFileUpload
              ? "bg-primary text-primary-foreground rotate-45 shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
          title="Attach file"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* CENTER: The Pill Input */}
        <div className="flex-1 flex items-end min-w-0 bg-muted/40 border border-border/60 rounded-[20px] pb-[3px] focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/40 transition-all shadow-sm">
          {/* Emoji Picker (Inside Left) */}
          <div className="shrink-0 mb-0.5 ml-1">
             <EmojiPicker onSelect={insertEmoji} />
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isBroadcast ? "Emergency broadcast…" : "Message"}
            rows={1}
            className="flex-1 max-h-36 overflow-y-auto bg-transparent px-2 py-[9px] text-[15px] resize-none focus:outline-none placeholder:text-muted-foreground/60 leading-relaxed text-foreground"
            style={{ height: "auto" }}
          />

          {/* Camera (Inside Right, only if empty) */}
          {!hasText && !isBroadcast && (
            <div className="shrink-0 mb-0.5 mr-1 overflow-hidden">
               <CameraCapture onCapture={handleCameraCapture} />
            </div>
          )}
        </div>

        {/* RIGHT: Voice/Video circles OR Send Circle */}
        <div className="shrink-0 flex items-center gap-1.5 mb-[3px]">
          {!hasText && !isBroadcast ? (
            <>
              <VideoRecorder onSend={handleVideoSend} />
              <VoiceRecorder onSend={handleVoiceSend} />
            </>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!text.trim() && !isBroadcast}
              className={`w-9 h-9 rounded-full transition-all shadow-md ${
                isBroadcast
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isBroadcast ? (
                <ShieldAlert className="w-[18px] h-[18px]" />
              ) : (
                <Send className="w-[18px] h-[18px] ml-0.5" />
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}