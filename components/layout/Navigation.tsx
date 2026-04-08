"use client";

// Navigation component (bottom nav bar for mobile)
import { useChatStore } from "@/store";
import { useConnectionStore } from "@/store/connectionStore";
import { MessageSquare, Radio, Shield, Plus } from "lucide-react";

export default function Navigation() {
  const { setActiveChat, activeChatId } = useChatStore();
  const { setScanning } = useConnectionStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/90 border-t border-border backdrop-blur-md flex items-center justify-around px-4 py-2 z-50">
      <button
        onClick={() => setActiveChat(null)}
        className={`flex flex-col items-center gap-0.5 text-xs p-2 rounded-lg transition-colors ${
          !activeChatId ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span>Chats</span>
      </button>

      <button
        onClick={() => setScanning(true)}
        className="flex flex-col items-center gap-0.5 text-xs p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Connect</span>
      </button>

      <button
        onClick={() => setActiveChat("broadcast")}
        className={`flex flex-col items-center gap-0.5 text-xs p-2 rounded-lg transition-colors ${
          activeChatId === "broadcast" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        <Shield className="w-5 h-5" />
        <span>SOS</span>
      </button>
    </nav>
  );
}
