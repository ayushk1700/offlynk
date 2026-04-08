"use client";
/**
 * EmergencyModal — triggered when SOS is tapped.
 * Shows a confirmation dialog before broadcasting.
 */
import { useState } from "react";
import { useChatStore, useUserStore } from "@/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Radio } from "lucide-react";
import { generateId } from "@/lib/utils/helpers";
import { sendLocalMessage } from "@/lib/webrtc/broadcastChannel";
import { peersInstance } from "@/components/connection/PeerDiscovery";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SOS_MESSAGES = [
  "🆘 EMERGENCY — I need immediate help!",
  "⚠️ ALERT — Requesting assistance at my location.",
  "📡 SOS — Off-grid emergency broadcast.",
];

export function EmergencyModal({ open, onClose }: Props) {
  const { addMessage } = useChatStore();
  const { currentUser } = useUserStore();
  const [sent, setSent] = useState(false);

  const sendSOS = (text: string) => {
    if (!currentUser) return;
    const id = generateId();
    const ts = Date.now();

    const msg = {
      id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: "broadcast",
      content: text,
      timestamp: ts,
    };

    // Local store
    addMessage({ ...msg, status: "sent", type: "text" });

    // BroadcastChannel (same-origin tabs)
    sendLocalMessage(msg);

    // WebRTC peers
    Object.values(peersInstance).forEach((p) => {
      try { p.send(JSON.stringify({ ...msg, type: "message" })); } catch {}
    });

    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Emergency Broadcast
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Radio className="w-8 h-8 text-primary animate-pulse" />
            <p className="font-medium text-sm">SOS Broadcast sent to all peers!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select a message to broadcast to all connected peers instantly.
            </p>
            {SOS_MESSAGES.map((msg) => (
              <Button
                key={msg}
                variant="outline"
                className="w-full text-left justify-start h-auto py-3 px-4 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => sendSOS(msg)}
              >
                {msg}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
