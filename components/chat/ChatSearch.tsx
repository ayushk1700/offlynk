"use client";

import { useChatStore } from "@/store";
import { useState, useMemo } from "react";
import { Search, X, MessageSquare, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ChatSearch() {
  const [query, setQuery] = useState("");
  const { peers, messages, setActiveChat } = useChatStore();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const peerMatches = Object.values(peers)
        .filter((p) => p.name.toLowerCase().includes(q))
        .map(p => ({ type: 'peer' as const, data: p }));

    const messageMatches: { type: 'message', data: any, peerId: string }[] = [];
    Object.entries(messages).forEach(([peerId, thread]) => {
        thread.forEach(msg => {
            if (msg.content.toLowerCase().includes(q) && !msg.isDeleted) {
                messageMatches.push({ type: 'message', data: msg, peerId });
            }
        });
    });

    // Return limited combined results
    return [...peerMatches, ...messageMatches.slice(0, 50)];
  }, [query, peers, messages]);

  return (
    <div className="relative p-2">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-8 bg-muted/60 border-transparent focus-visible:border-border text-sm"
          placeholder="Search peers or messages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="absolute right-3 text-muted-foreground hover:text-foreground"
            onClick={() => setQuery("")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-[100] top-full left-2 right-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl mt-2 overflow-hidden max-h-[400px] overflow-y-auto animate-in slide-in-from-top-2">
          {results.map((res, i) => (
            <button
              key={`${res.type}-${i}`}
              onClick={() => {
                const targetId = res.type === 'peer' ? res.data.id : res.peerId;
                setActiveChat(targetId);
                setQuery("");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {res.type === 'peer' ? (
                    <User className="w-4 h-4 text-primary" />
                ) : (
                    <MessageSquare className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground truncate">
                    {res.type === 'peer' ? res.data.name : peers[res.peerId]?.name || 'Unknown'}
                </span>
                {res.type === 'message' && (
                    <span className="text-xs text-muted-foreground truncate italic">
                        "{res.data.content}"
                    </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
