"use client";
/**
 * FileMessage — a message bubble specifically for file attachments (Images, Videos, Voice, Docs).
 */
import { Message } from "@/store/chatStore";
import { FilePreview } from "./FilePreview";
import { formatTime, cn } from "@/lib/utils/helpers";
import { ShieldCheck, Mic, Film } from "lucide-react";

interface Props {
  msg: Message;
  isMe: boolean;
}

export function FileMessage({ msg, isMe }: Props) {
  const { fileData } = msg;
  if (!fileData) return null;

  // Safely get the media URL (checks both dataUrl and blobUrl to prevent empty src errors)
  const mediaSrc = fileData.dataUrl || fileData.blobUrl || "";

  // Determine file type
  const isVideo = fileData.mimeType?.startsWith("video/");
  const isAudio = msg.type === "voice" || fileData.mimeType?.startsWith("audio/");

  return (
    <div className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
      <div
        className={cn(
          "rounded-2xl overflow-hidden shadow-sm max-w-[260px] sm:max-w-xs",
          isMe
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-card border border-border/60"
        )}
      >
        {/* 1. AUDIO / VOICE RENDERER */}
        {isAudio ? (
          <div className="p-3">
            {mediaSrc ? (
              <audio src={mediaSrc} controls className="w-full h-10 max-w-[220px]" />
            ) : (
              <div className="p-4 text-xs text-center opacity-60 flex items-center gap-2">
                <Mic className="w-4 h-4 animate-pulse" /> Audio loading...
              </div>
            )}
          </div>
        ) :

          /* 2. VIDEO RENDERER */
          isVideo ? (
            <div className="p-1">
              {mediaSrc ? (
                <video
                  src={mediaSrc}
                  controls
                  className="w-full rounded-xl bg-black/10 max-h-[300px] object-cover"
                />
              ) : (
                <div className="p-8 text-xs text-center opacity-60 flex flex-col items-center justify-center gap-2">
                  <Film className="w-6 h-6 animate-pulse" />
                  <span>Video loading...</span>
                </div>
              )}
            </div>
          ) :

            /* 3. IMAGE OR GENERIC FILE RENDERER */
            (
              <FilePreview
                name={fileData.name}
                size={fileData.size}
                dataUrl={mediaSrc} // Pass the safely extracted mediaSrc here
                mimeType={fileData.mimeType}
              />
            )}
      </div>

      {/* Metadata: Timestamp & E2E Icon */}
      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 px-1 mt-0.5">
        <ShieldCheck className="w-2.5 h-2.5 opacity-50" />
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
}