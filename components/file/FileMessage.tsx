"use client";
/**
 * FileMessage — a message bubble specifically for file attachments.
 */
import { Message } from "@/store/chatStore";
import { FilePreview } from "./FilePreview";
import { formatTime } from "@/lib/utils/helpers";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface Props {
  msg: Message;
  isMe: boolean;
}

export function FileMessage({ msg, isMe }: Props) {
  const fileData = msg.fileData as { name: string; dataUrl?: string; size?: number; mimeType?: string } | undefined;

  return (
    <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
      <div
        className={cn(
          "rounded-2xl overflow-hidden shadow-sm",
          isMe ? "rounded-tr-sm" : "rounded-tl-sm border border-border/60"
        )}
      >
        {fileData ? (
          <FilePreview
            name={fileData.name}
            size={fileData.size}
            dataUrl={fileData.dataUrl}
            mimeType={fileData.mimeType}
          />
        ) : (
          <div className="px-4 py-2.5 bg-card text-xs text-muted-foreground">
            {msg.content}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 px-1">
        <ShieldCheck className="w-2.5 h-2.5 opacity-50" />
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
}
