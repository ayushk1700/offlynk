"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore, useUserStore } from "@/store";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Send, ShieldAlert, X, Paperclip, Plus, Eye, EyeOff } from "lucide-react";
import { generateId, cn } from "@/lib/utils/helpers";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { sendLocalMessage, sendTypingSignal, sendAmbientTyping } from "@/lib/webrtc/broadcastChannel";
import { serializeMessage } from "@/lib/webrtc/dataChannel";
import { useSettingsStore } from "@/store/settingsStore";
import { EmojiPicker } from "./EmojiPicker";
import { Sparkles } from "lucide-react";

import { VoiceMessageData, VoiceRecorder } from "./VoicePlayer";
import { VideoRecorder, VideoMessageData } from "./VideoRecorder";
import { CameraCapture } from "./CameraCapture";
import { FileUpload } from "@/components/file/FileUpload";
import { sendFile } from "@/lib/webrtc/fileTransfer";
import { outgoingTransfers } from "@/components/file/FileTransferProgress";
import type { LocalMessage } from "@/store/chatStore";

const MOCK_TRANSCRIPTS = [
  "Hello, are you there? I'm coming over now.",
  "Check the file I just sent you, it's really important.",
  "OffLynk is working great even without the internet!",
  "Can you hear me? This is a test of the 2026 voice transcript system."
];

export default function MessageInput() {
  const [text, setText] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  
  const { activeChatId, addMessage, addTranscript, updateMessage, peers, setDraft } = useChatStore();
  const { currentUser } = useUserStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing draft only when chat ID changes
  const prevChatId = useRef(activeChatId);
  useEffect(() => {
    if (activeChatId !== prevChatId.current) {
        setText(activeChatId ? (peers[activeChatId]?.draft || "") : "");
        prevChatId.current = activeChatId;
        textareaRef.current?.focus();
        setShowFileUpload(false);
        setIsViewOnce(false);
    }
  }, [activeChatId, peers]);

  // Auto-save draft (Debounced)
  useEffect(() => {
     if (!activeChatId) return;
     const t = setTimeout(() => {
       setDraft(activeChatId, text);
     }, 1000);
     return () => clearTimeout(t);
  }, [text, activeChatId, setDraft]);

  /* ── Send text ─────────────────────────────────────────── */
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || !activeChatId || !currentUser) return;

    const id = generateId();
    const ts = Date.now();
    const content = text.trim();

    const msgData: LocalMessage = { 
        id, 
        senderId: currentUser.id, 
        receiverId: activeChatId, 
        content, 
        timestamp: ts, 
        type: "text", 
        status: "sending",
        isDeleted: false,
        isEdited: false
    };

    addMessage(activeChatId, msgData);
    setText("");
    setDraft(activeChatId, "");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Prepare packet
    const chatPacket = serializeMessage({ 
      type: "message", 
      id, 
      senderId: currentUser.id, 
      timestamp: ts, 
      content 
    });

    // Send via BroadcastChannel (local tabs)
    sendLocalMessage({ id, senderId: currentUser.id, senderName: currentUser.name, receiverId: activeChatId, content, timestamp: ts });

    // Send via WebRTC (remote peers)
    const targetPeer = peers[activeChatId];
    
    if (activeChatId === 'broadcast') {
      // 🚨 Broadcast to EVERYONE connected
      Object.values(peersInstance).forEach(peer => {
        if (peer.connected) {
          try { peer.send(chatPacket); } catch(e) {}
        }
      });
    } else if (targetPeer?.type === 'group' && targetPeer.participants) {
      // 👥 Send to all group members
      targetPeer.participants.forEach(pid => {
        if (pid === currentUser.id) return;
        const rtcPeer = peersInstance[pid];
        if (rtcPeer?.connected) {
           try { rtcPeer.send(chatPacket); } catch(e) {}
        }
      });
    } else {
      // 👤 Private message
      const rtcPeer = peersInstance[activeChatId];
      if (rtcPeer?.connected) { 
        try { rtcPeer.send(chatPacket); } catch (err) { console.error("RTC send error:", err); } 
      } else {
        // 🛰️ Try Relay Mesh
        const relayMsg = {
          type: 'relay' as const,
          id: crypto.randomUUID(),
          senderId: currentUser.id,
          timestamp: ts,
          targetId: activeChatId,
          hopCount: 1,
          visited: [currentUser.id],
          payload: { 
            type: 'message' as const, 
            id, 
            senderId: currentUser.id, 
            timestamp: ts, 
            content 
          }
        };
        
        const relayPacket = serializeMessage(relayMsg);
        Object.values(peersInstance).forEach(peer => {
           if (peer.connected) {
             try { peer.send(relayPacket); } catch(e) {}
           }
        });
      }
    }

    updateMessage(activeChatId, id, { status: "sent" });

    // Clear ambient typing now that message is sent
    if (activeChatId && currentUser) sendAmbientTyping(currentUser.id, activeChatId, "");
  };

  /* ── Send voice ────────────────────────────────────────── */
  const handleVoiceSend = (data: VoiceMessageData) => {
    if (!activeChatId || !currentUser) return;
    const id = generateId();
    const ts = Date.now();

    addMessage(activeChatId, {
      id, senderId: currentUser.id, receiverId: activeChatId, content: "🎙 Voice message",
      timestamp: ts, status: "sent", type: "voice",
      isViewOnce, isDeleted: false, isEdited: false,
      fileData: { name: "voice.webm", mimeType: data.mimeType, blobUrl: data.blobUrl, duration: data.duration },
    }).then(() => {
        // Voice Transcript Mock Trigger
        setTimeout(() => {
            const randomTranscript = MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)];
            addTranscript(activeChatId, id, randomTranscript);
        }, 1500);
    });

    setIsViewOnce(false);
  };

  /* ── Send video ────────────────────────────────────────── */
  const handleVideoSend = (data: VideoMessageData) => {
    if (!activeChatId || !currentUser) return;
    const id = generateId();
    const ts = Date.now();

    addMessage(activeChatId, {
      id, senderId: currentUser.id, receiverId: activeChatId, content: "🎥 Video message",
      timestamp: ts, status: "sent", type: "file",
      isViewOnce, isDeleted: false, isEdited: false,
      fileData: { name: "video.webm", mimeType: data.mimeType, blobUrl: data.blobUrl, duration: data.duration, size: data.size },
    });

    setIsViewOnce(false);
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

    addMessage(activeChatId, {
      id, senderId: currentUser.id, receiverId: activeChatId, content: "📷 Photo",
      timestamp: ts, status: "sending", type: "image",
      isViewOnce, isDeleted: false, isEdited: false,
      fileData: newFileData,
    });

    // Send encrypted over WebRTC
    const peer = peersInstance[activeChatId];
    if (peer) {
      const transferId = generateId();
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      outgoingTransfers.set(transferId, { name: "photo.jpg", size: blob.size, progress: 0, mimeType: "image/jpeg", previewUrl: dataUrl });
      sendFile(file, transferId, currentUser.id, (data) => {
        try { peer.send(data); } catch (err) { console.error("RTC send error:", err); }
      }, (pct) => {
        outgoingTransfers.set(transferId, { name: "photo.jpg", size: blob.size, progress: pct, mimeType: "image/jpeg", previewUrl: dataUrl });
      }).then(() => {
        outgoingTransfers.delete(transferId);
        updateMessage(activeChatId, id, { status: "delivered" });
      });
    } else {
      updateMessage(activeChatId, id, { status: "sent" });
    }
    setIsViewOnce(false);
  };

  /* ── Keyboard ──────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyInput = () => {
    if (!activeChatId || !currentUser) return;
    const rtcPeer = peersInstance[activeChatId];
    if (!rtcPeer || !rtcPeer.connected) return;

    if (!typingThrottleRef.current) {
        rtcPeer.send(serializeMessage({
          id: crypto.randomUUID(),
          type: 'typing',
          senderId: currentUser.id,
          timestamp: Date.now(),
          isTyping: true,
        }));
        typingThrottleRef.current = setTimeout(() => {
          typingThrottleRef.current = null;
        }, 3000);
    }

    // Reset the "stopped typing" clear timer on every keystroke
    if (typingClearRef.current) clearTimeout(typingClearRef.current);
    typingClearRef.current = setTimeout(() => {
        rtcPeer.send(serializeMessage({
          id: crypto.randomUUID(),
          type: 'typing',
          senderId: currentUser.id,
          timestamp: Date.now(),
          isTyping: false,
        }));
    }, 4000);
  };

  const settings = useSettingsStore();

  const handleToggleAmbient = () => {
     if (!activeChatId) return;
     settings.toggleAmbientTyping(activeChatId);
     const newState = !settings.ambientTypingEnabled[activeChatId];
     if (currentUser) {
        // Send internal system announcement text message
        const id = crypto.randomUUID();
        const content = newState ? "✨ Enabled ambient typing. You see what I type live!" : "🚫 Disabled ambient typing.";
        addMessage(activeChatId, {
            id, senderId: currentUser.id, receiverId: activeChatId, content,
            timestamp: Date.now(), status: "sent", type: "text",
            isDeleted: false, isEdited: false
        });

        // Broadcast to peer
        const rtcPeer = peersInstance[activeChatId];
        if (rtcPeer?.connected) {
            rtcPeer.send(serializeMessage({ 
                type: "message", id, senderId: currentUser.id, timestamp: Date.now(), 
                content
            }));
        }
     }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";

    const isAmbient = activeChatId ? settings.ambientTypingEnabled[activeChatId] : false;

    if (activeChatId && currentUser) {
      if (isAmbient) {
          sendAmbientTyping(currentUser.id, activeChatId, val);
          const rtcPeer = peersInstance[activeChatId];
          if (rtcPeer?.connected && val.length > 0) {
              rtcPeer.send(serializeMessage({
                id: crypto.randomUUID(), type: 'chat-action', senderId: currentUser.id,
                timestamp: Date.now(), action: 'report', targetId: activeChatId,
                reason: `live:${val}`
              }));
          }
      } else {
          handleKeyInput();
      }
    }
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
      {/* View Once Indicator */}
      {isViewOnce && (
        <div className="bg-primary/5 py-1 px-4 flex items-center gap-2 border-b border-primary/10 animate-in slide-in-from-bottom-1">
            <EyeOff className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">View Once Mode Active</span>
            <button onClick={() => setIsViewOnce(false)} className="ml-auto text-primary hover:bg-primary/10 rounded-full p-0.5">
                <X className="w-3 h-3" />
            </button>
        </div>
      )}

      {/* File upload panel */}
      {showFileUpload && (
        <div className="border-b border-border/50 bg-card overflow-hidden">
          <FileUpload isViewOnce={isViewOnce} setIsViewOnce={setIsViewOnce} onClose={() => setShowFileUpload(false)} />
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

          {/* Sparkles (Live Typing Toggle) */}
          <button 
            type="button" 
            onClick={handleToggleAmbient}
            className={cn(
               "shrink-0 mb-0.5 mr-1 p-1.5 rounded-full transition-colors",
               (activeChatId && settings.ambientTypingEnabled[activeChatId]) ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50"
            )}
            title="Toggle Live Typing"
          >
             <Sparkles className={cn("w-4 h-4", (activeChatId && settings.ambientTypingEnabled[activeChatId]) && "animate-pulse")} />
          </button>
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