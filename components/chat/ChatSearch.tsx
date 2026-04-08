"use client";

import { useChatStore } from "@/store";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ChatSearch() {
  const [query, setQuery] = useState("");
  const { peers, setActiveChat } = useChatStore();

  const results = query.trim()
    ? Object.values(peers).filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="relative p-2">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9 pr-8 bg-muted/60 border-transparent focus-visible:border-border text-sm"
          placeholder="Search peers…"
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
        <div className="absolute z-20 top-full left-2 right-2 bg-card border border-border rounded-md shadow-lg mt-1 overflow-hidden">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveChat(p.id);
                setQuery("");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
