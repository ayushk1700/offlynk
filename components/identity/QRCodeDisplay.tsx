"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Fingerprint } from "lucide-react";

export function QRCodeDisplay() {
  const { currentUser } = useUserStore();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !currentUser) return null;

  const data = JSON.stringify({
    id: currentUser.id,
    name: currentUser.name,
    publicKey: currentUser.publicKey,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center p-4 bg-white rounded-xl border border-border">
        <QRCodeSVG value={data} size={180} level="M" />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Fingerprint className="w-3.5 h-3.5" /> Your public identity (safe to share)
        </p>
        <div className="flex gap-2">
          <code className="flex-1 text-[10px] bg-muted/60 px-2 py-1.5 rounded-lg border border-border/50 truncate font-mono text-muted-foreground">
            {currentUser.publicKey.slice(0, 60)}…
          </code>
          <button
            onClick={handleCopy}
            className="px-2 py-1.5 rounded-lg border border-border/50 bg-muted/60 hover:bg-muted transition-colors text-muted-foreground"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
