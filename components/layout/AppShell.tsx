"use client";

import { useState } from "react";
import { useChatStore } from "@/store";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatContainer from "@/components/chat/ChatContainer";
import { ConnectFlow } from "@/components/connection/ConnectFlow";
import { OfflineIndicator } from "@/components/connection/OfflineIndicator";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { StarredMessages } from "@/components/chat/StarredMessages";
import { MessageSquare, Radio, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Panel = null | "profile" | "settings";

export function AppShell() {
  const { activeChatId, setActiveChat } = useChatStore();
  const [panel, setPanel] = useState<Panel>(null);
  const [starredOpen, setStarredOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground relative">
      <OfflineIndicator />
      <StarredMessages open={starredOpen} onClose={() => setStarredOpen(false)} />

      {/* ── Sidebar ────────────────────────────────── */}
      <aside className={[
        "flex-shrink-0 border-r border-border bg-card flex flex-col relative",
        "w-full md:w-[300px] lg:w-[360px]",
        activeChatId && !panel ? "hidden md:flex" : "flex",
      ].join(" ")}>

        {/* Global Sidebar Header with Broadcast */}
        <div className="px-4 py-3 border-b border-border bg-card/90 flex items-center justify-between shrink-0">
          <h1 className="font-bold text-lg">Chats</h1>
          <button
            onClick={() => setActiveChat("broadcast")}
            className="flex items-center gap-2 text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Broadcast</span>
          </button>
        </div>

        {/* Profile overlay */}
        <AnimatePresence>
          {panel === "profile" && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="absolute inset-0 z-20 bg-background"
            >
              <ProfilePage onBack={() => setPanel(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings overlay */}
        <AnimatePresence>
          {panel === "settings" && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="absolute inset-0 z-20 bg-background"
            >
              <SettingsPage
                onBack={() => setPanel(null)}
                onOpenProfile={() => setPanel("profile")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ChatSidebar
          onOpenProfile={() => setPanel("profile")}
          onOpenSettings={() => setPanel("settings")}
          onOpenStarred={() => setStarredOpen(true)}
        />
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <main className={[
        "flex-1 flex flex-col min-w-0",
        activeChatId ? "flex" : "hidden md:flex",
      ].join(" ")}>
        {activeChatId ? (
          <ChatContainer />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5 max-w-sm">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center">
                <Radio className="w-9 h-9 text-muted-foreground opacity-40" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">OffLynk</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open another tab at <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">?node=2</code> to auto-connect.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/40 px-4 py-2 rounded-full">
                <MessageSquare className="w-3.5 h-3.5" />
                Select a chat from the left
              </div>
            </div>
          </div>
        )}
      </main>

      <ConnectFlow />
    </div>
  );
}

export default AppShell;