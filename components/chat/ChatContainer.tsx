"use client";

import { useState } from "react";
import { useChatStore } from "@/store";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import { EmergencyPanel } from "@/components/emergency/EmergencyPanel";
import { SOSButton } from "@/components/emergency/SOSButton";
import { FileTransferBar } from "@/components/file/FileTransferProgress";

export default function ChatContainer() {
  const { activeChatId } = useChatStore();
  const [sosOpen, setSosOpen] = useState(false);

  if (!activeChatId) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background relative">
      {/* Header with ⋮ menu (SOS is inside ⋮) */}
      <ChatHeader onSOSClick={() => setSosOpen(true)} />

      {/* Message feed */}
      <MessageList />

      {/* File transfer progress bar (floats above input) */}
      <div className="relative">
        <FileTransferBar />
      </div>

      {/* Input row */}
      <MessageInput />

      {/* Floating SOS (non-broadcast chats) */}
      {activeChatId !== "broadcast" && <SOSButton />}

      {/* Emergency modal (also triggered from ⋮ menu) */}
      <EmergencyPanel open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
