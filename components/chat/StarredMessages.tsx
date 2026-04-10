"use client";

import { useChatStore } from "@/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Trash2, ExternalLink } from "lucide-react";
import { formatTime, cn } from "@/lib/utils/helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface StarredMessagesProps {
  open: boolean;
  onClose: () => void;
}

export function StarredMessages({ open, onClose }: StarredMessagesProps) {
  const { messages, peers, setActiveChat, toggleStarMessage } = useChatStore();

  const starred = Object.entries(messages).flatMap(([peerId, thread]) => 
    thread.filter(m => m.isStarred).map(m => ({ ...m, peerId }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col h-[80vh]">
        <DialogHeader className="p-4 border-b border-border bg-card">
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Starred Messages
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {starred.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
              <Star className="w-12 h-12 opacity-10" />
              <p className="text-sm">No starred messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {starred.map((msg) => {
                const peer = peers[msg.peerId];
                return (
                  <div key={msg.id} className="p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {peer?.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-xs font-semibold">{peer?.name || "Unknown"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                    </div>

                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap line-clamp-3 mb-3">
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => toggleStarMessage(msg.peerId, msg.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" /> Unstar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => { setActiveChat(msg.peerId); onClose(); }}>
                        <ExternalLink className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
