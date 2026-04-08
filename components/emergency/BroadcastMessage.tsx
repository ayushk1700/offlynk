"use client";
/**
 * BroadcastMessage — special visual style for broadcast/SOS messages.
 */
import { Message } from "@/store/chatStore";
import { formatTime } from "@/lib/utils/helpers";
import { ShieldAlert } from "lucide-react";

export function BroadcastMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-center my-2 px-4">
      <div className="flex items-start gap-2 max-w-[90%] bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
        <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-destructive mb-0.5">
            Emergency Broadcast
          </p>
          <p className="text-sm text-foreground break-words whitespace-pre-wrap">
            {msg.content}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatTime(msg.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
