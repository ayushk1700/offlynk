"use client";

// QR scanning is complex without a native camera library.
// This component provides a text-paste fallback for the peer's QR data.
import { useState } from "react";
import { useChatStore } from "@/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, CheckCircle2, AlertCircle } from "lucide-react";

export function QRCodeScanner() {
  const { addPeer } = useChatStore();
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const handleImport = () => {
    try {
      const data = JSON.parse(raw.trim());
      if (!data.id || !data.name || !data.publicKey) throw new Error("Invalid");
      addPeer({ id: data.id, name: data.name, publicKey: data.publicKey, isOnline: false, unreadCount: 0, lastSeen: Date.now(), updatedAt: Date.now() });
      setStatus("ok");
      setRaw("");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Paste the peer identity JSON (copied from their QR code):
      </p>
      <Input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{"id":"…","name":"…","publicKey":"…"}'
        className="font-mono text-xs"
      />
      <Button className="w-full" onClick={handleImport} disabled={!raw.trim()}>
        <ScanLine className="w-4 h-4 mr-2" />
        Import Identity
      </Button>
      {status === "ok" && (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Peer imported!
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> Invalid identity data.
        </p>
      )}
    </div>
  );
}
