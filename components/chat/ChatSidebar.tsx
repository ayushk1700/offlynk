"use client";

import { useState } from "react";
import { useChatStore, useUserStore } from "@/store";
import { useConnectionStore } from "@/store/connectionStore";
import { useFeatureStore } from "@/store/featureStore";
import ChatSearch from "@/components/chat/ChatSearch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  PlusCircle, Radio, ShieldAlert, Cpu, Zap, Users,
  Sun, Moon, Pin, BellOff, Timer, RefreshCw, Wifi, Star,
} from "lucide-react";
import { CreateGroupModal } from "./CreateGroupModal";
import { formatTime } from "@/lib/utils/helpers";
import { useTheme } from "@/components/layout/ThemeToggle";

import { Settings, User } from "lucide-react";

interface SidebarProps {
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenStarred?: () => void;
}

export default function ChatSidebar({ onOpenProfile, onOpenSettings, onOpenStarred }: SidebarProps) {
  const { peers, activeChatId, setActiveChat, messages } = useChatStore();
  const { currentUser } = useUserStore();
  const { setScanning } = useConnectionStore();
  const { theme, setTheme } = useTheme();
  const {
    pinnedChats, silentChats, selfDestructChats,
    autoReconnect, setAutoReconnect,
  } = useFeatureStore();

  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const getLastMessage = (peerId: string) => {
    const thread = messages[peerId] || [];
    return thread[thread.length - 1] ?? null;
  };

  // Sort: pinned first, then by lastSeen
  const peerList = Object.values(peers).sort((a, b) => {
    const aPin = pinnedChats.includes(a.id) ? 1 : 0;
    const bPin = pinnedChats.includes(b.id) ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });

  const onlineCount = peerList.filter((p) => p.isOnline && p.id !== "broadcast").length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between shrink-0">
        <button
          className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
          onClick={onOpenProfile}
          title="View Profile"
        >
          <div className="relative shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                {currentUser?.name?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-card rounded-full" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm leading-tight truncate">{currentUser?.name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 leading-tight">
              <Cpu className="w-3 h-3" /> Offline Node
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Button
            variant="ghost" size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenStarred}
            title="Starred Messages"
          >
            <Star className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setCreateGroupOpen(true)}
            title="Create Group"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setScanning(true)}
            title="Connect to peer"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <ChatSearch />
      <CreateGroupModal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} />

      {/* ── Status + toggles ────────────────────────── */}
      <div className="px-3 pb-2 space-y-1.5">
        <div className="flex items-center justify-between bg-muted/40 border border-border/40 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse text-primary" />
            {onlineCount > 0 ? `${onlineCount} peer${onlineCount > 1 ? "s" : ""} nearby` : "Scanning…"}
          </span>
          {/* Auto-reconnect toggle */}
          <button
            onClick={() => setAutoReconnect(!autoReconnect)}
            className={`flex items-center gap-1 transition-colors ${autoReconnect ? "text-primary" : "text-muted-foreground/50"}`}
            title={autoReconnect ? "Auto-reconnect ON" : "Auto-reconnect OFF"}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Auto</span>
          </button>
        </div>
      </div>

      {/* ── Peer list ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {peerList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-6 text-center text-muted-foreground">
            <Zap className="w-10 h-10 opacity-10" />
            <div>
              <p className="text-sm font-medium text-foreground/70 mb-1">No peers yet</p>
              <p className="text-xs opacity-55 leading-relaxed">
                Open another tab to chat instantly, or tap <strong>+</strong> to connect remotely via passphrase or QR code.
              </p>
            </div>
            <button
              onClick={() => setScanning(true)}
              className="mt-1 text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              Connect Peer
            </button>
          </div>
        ) : (
          peerList.map((peer) => {
            const lastMsg = getLastMessage(peer.id);
            const isActive = activeChatId === peer.id;
            const isBroadcast = peer.id === "broadcast";
            const isPinned = pinnedChats.includes(peer.id);
            const isSilent = silentChats.includes(peer.id);
            const sdMins = selfDestructChats[peer.id] ?? 0;

            return (
              <button
                key={peer.id}
                onClick={() => setActiveChat(peer.id)}
                className={[
                  "w-full flex items-center gap-3 px-4 py-3 border-b border-border/40",
                  "hover:bg-muted/30 active:bg-muted/50 transition-colors text-left",
                  isActive ? "bg-muted/50" : "",
                ].join(" ")}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className={
                      isBroadcast
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-secondary text-secondary-foreground text-sm font-semibold"
                    }>
                      {isBroadcast ? <ShieldAlert className="w-5 h-5" /> : peer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online/Nearby dot */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-3 h-3 border-2 border-background rounded-full ${
                      peer.isOnline && !isBroadcast
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                    title={peer.isOnline ? "Online" : "Offline"}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate text-foreground flex items-center gap-1">
                      {peer.name}
                      {isPinned && <Pin className="w-2.5 h-2.5 text-muted-foreground inline-block" />}
                      {isSilent && <BellOff className="w-2.5 h-2.5 text-muted-foreground inline-block" />}
                      {sdMins > 0 && <Timer className="w-2.5 h-2.5 text-destructive inline-block" />}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {lastMsg ? formatTime(lastMsg.timestamp) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {!isBroadcast && (
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${peer.isOnline ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    )}
                    <span className="truncate">
                      {lastMsg?.isDeleted
                        ? "🚫 This message was deleted"
                        : lastMsg
                        ? lastMsg.content.slice(0, 45)
                        : isBroadcast
                        ? "Emergency broadcast channel"
                        : peer.isOnline
                        ? "Online · say hello!"
                        : peer.lastSeen
                        ? `Last seen nearby ${formatTime(peer.lastSeen)}`
                        : "Offline"}
                    </span>
                  </div>
                </div>

                {/* Unread badge */}
                {peer.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shrink-0">
                    {peer.unreadCount > 99 ? "99+" : peer.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div className="px-3 py-2.5 border-t border-border shrink-0">
        <p className="text-[10px] text-muted-foreground text-center opacity-40">
          ✦ E2E Encrypted · No servers · Offline-first
        </p>
      </div>
    </div>
  );
}
