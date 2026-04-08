"use client";

// Connection status indicator for the app bar
import { useConnectionStore } from "@/store/connectionStore";
import { useChatStore } from "@/store";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const { connectedPeersId } = useConnectionStore();
  const { peers } = useChatStore();

  const onlineCount = Object.values(peers).filter(
    (p) => p.isOnline && p.id !== "broadcast"
  ).length;

  const isConnected = onlineCount > 0;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
        isConnected
          ? "border-primary/30 text-primary bg-primary/5"
          : "border-muted-foreground/20 text-muted-foreground bg-muted/40"
      }`}
    >
      {isConnected ? (
        <Wifi className="w-3 h-3 animate-pulse" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{isConnected ? `${onlineCount} P2P` : "Offline"}</span>
    </div>
  );
}
