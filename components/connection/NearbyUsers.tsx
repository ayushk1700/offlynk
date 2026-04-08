"use client";

import { useChatStore } from "@/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Radio, WifiOff, Zap } from "lucide-react";

// Nearby users list (simulated from known peers)
export function NearbyUsers() {
  const { peers, setActiveChat } = useChatStore();

  const onlinePeers = Object.values(peers).filter(
    (p) => p.isOnline && p.id !== "broadcast"
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
        <Radio className="w-3 h-3 animate-pulse text-primary" />
        Nearby Peers
      </div>
      {onlinePeers.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
          <WifiOff className="w-6 h-6 opacity-30" />
          <span className="text-xs">No peers in range</span>
        </div>
      ) : (
        <div className="space-y-2">
          {onlinePeers.map((peer) => (
            <button
              key={peer.id}
              onClick={() => setActiveChat(peer.id)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {peer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-primary border border-background rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{peer.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> WebRTC connected
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
