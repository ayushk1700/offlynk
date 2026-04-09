"use client";

import { useRef } from "react";
import { Image as ImageIcon, FileText, Film, Headphones } from "lucide-react";
import { useChatStore, useUserStore } from "@/store";
import { generateId } from "@/lib/utils/helpers";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { sendFile } from "@/lib/webrtc/fileTransfer";
import { outgoingTransfers } from "@/components/file/FileTransferProgress";

interface Props {
  onClose: () => void;
}

export function FileUpload({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeChatId, addMessage } = useChatStore();
  const { currentUser } = useUserStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId || !currentUser) return;

    const id = generateId();
    const ts = Date.now();
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    let dataUrl = "";
    if (isImage || isVideo) {
      dataUrl = URL.createObjectURL(file);
    }

    const fileData = {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream", // Fallback for unknown extensions
      dataUrl,
    };

    addMessage({
      id,
      senderId: currentUser.id,
      receiverId: activeChatId,
      content: `📁 ${file.name}`,
      timestamp: ts,
      status: "sending",
      type: "file",
      fileData,
      did: `did:offgrid:${currentUser.id}`,
    });

    const peer = peersInstance[activeChatId];
    if (peer) {
      const transferId = generateId();
      outgoingTransfers.set(transferId, { name: file.name, size: file.size, progress: 0 });

      sendFile(
        file,
        transferId,
        currentUser.id,
        (data) => {
          try { peer.send(data); } catch { }
        },
        (pct) => {
          outgoingTransfers.set(transferId, { name: file.name, size: file.size, progress: pct });
        }
      ).then(() => {
        outgoingTransfers.delete(transferId);
        useChatStore.getState().updateMessageStatus(id, "delivered");
      });
    } else {
      useChatStore.getState().updateMessageStatus(id, "sent");
    }

    onClose();
  };

  const triggerUpload = (acceptType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-4 grid grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 fade-in duration-200">

      {/* Universal Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => triggerUpload("image/*")}
        className="flex flex-col items-center gap-2 group"
      >
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
          <ImageIcon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">Photo</span>
      </button>

      <button
        onClick={() => triggerUpload("video/*")}
        className="flex flex-col items-center gap-2 group"
      >
        <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
          <Film className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">Video</span>
      </button>

      <button
        onClick={() => triggerUpload("audio/*")}
        className="flex flex-col items-center gap-2 group"
      >
        <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
          <Headphones className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">Audio</span>
      </button>

      {/* The ALL FILES "Document" Button */}
      <button
        onClick={() => triggerUpload("*/*")}
        className="flex flex-col items-center gap-2 group"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
          <FileText className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">Document</span>
      </button>

    </div>
  );
}