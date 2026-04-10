"use client";

import { useRef } from "react";
import { Image as ImageIcon, FileText, Film, Headphones, EyeOff } from "lucide-react";
import { useChatStore, useUserStore } from "@/store";
import { cn, generateId } from "@/lib/utils/helpers";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { sendFile } from "@/lib/webrtc/fileTransfer";
import { outgoingTransfers } from "@/components/file/FileTransferProgress";
import { serializeMessage } from "@/lib/webrtc/dataChannel";
import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
  isViewOnce: boolean;
  setIsViewOnce: (v: boolean) => void;
}

export function FileUpload({ onClose, isViewOnce, setIsViewOnce }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeChatId, addMessage } = useChatStore();
  const { currentUser } = useUserStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId || !currentUser) return;

    const id = crypto.randomUUID();
    const ts = Date.now();
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    // Create a local preview URL for all files so they can be interacted with (downloaded, previewed)
    const dataUrl = URL.createObjectURL(file);

    const fileData = {
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream", // Fallback for unknown extensions
      dataUrl,
    };

    addMessage(activeChatId, {
      id,
      senderId: currentUser.id,
      receiverId: activeChatId,
      content: `📁 ${file.name}`,
      timestamp: ts,
      status: "sending",
      type: isImage ? "image" : (isVideo ? "text" : "file"), // Map type accurately
      fileData,
      isViewOnce,
      isDeleted: false,
      isEdited: false,
    });

    const peer = peersInstance[activeChatId];
    if (peer?.connected) {
      const transferId = crypto.randomUUID();
      outgoingTransfers.set(transferId, {
        name: file.name,
        size: file.size,
        progress: 0,
        mimeType: fileData.mimeType,
        previewUrl: isImage ? dataUrl : undefined
      });

      sendFile(
        file,
        transferId,
        currentUser.id,
        (data) => {
          try { peer.send(data); } catch (err) { console.error("Failed to send file chunk:", err); }
        },
        (pct) => {
          outgoingTransfers.set(transferId, {
            name: file.name,
            size: file.size,
            progress: pct,
            mimeType: fileData.mimeType,
            previewUrl: isImage ? dataUrl : undefined
          });
        }
      ).then(() => {
        outgoingTransfers.delete(transferId);
        useChatStore.getState().updateMessage(activeChatId, id, { status: "delivered" });
        if (isViewOnce) {
          peer.send(serializeMessage({ 
            type: 'view-once', 
            id: crypto.randomUUID(),
            senderId: currentUser.id,
            timestamp: Date.now(),
            targetId: id 
          }));
        }
      });
    } else {
      useChatStore.getState().updateMessage(activeChatId, id, { status: "sent" });
    }

    onClose();
    setIsViewOnce(false);
  };

  const triggerUpload = (acceptType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in duration-200">

      {/* View Once Toggle */}
      <div className="flex items-center justify-between bg-muted/20 p-2 rounded-xl px-4 border border-border/10">
        <div className="flex items-center gap-2">
          <EyeOff className={cn("w-4 h-4", isViewOnce ? "text-primary" : "text-muted-foreground")} />
          <span className="text-xs font-bold uppercase tracking-tight">View Once Mode</span>
        </div>
        <button
          onClick={() => setIsViewOnce(!isViewOnce)}
          className={cn("w-10 h-5 rounded-full relative transition-colors p-1", isViewOnce ? "bg-primary" : "bg-muted")}
        >
          <motion.div
            animate={{ x: isViewOnce ? 20 : 0 }}
            className="w-3 h-3 rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
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
    </div>
  );
}