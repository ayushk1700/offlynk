"use client";

import { useState } from "react";
import { useChatStore } from "@/store";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import { EmergencyPanel } from "@/components/emergency/EmergencyPanel";
import { FileTransferBar } from "@/components/file/FileTransferProgress";

export default function ChatContainer() {
  const { activeChatId } = useChatStore();
  const [sosOpen, setSosOpen] = useState(false);

  if (!activeChatId) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background relative">
      <ChatHeader onSOSClick={() => setSosOpen(true)} />
      <MessageList />
      <div className="relative">
        <FileTransferBar />
      </div>
      <MessageInput />
      <EmergencyPanel open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}