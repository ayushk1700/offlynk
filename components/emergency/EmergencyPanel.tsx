"use client";
/**
 * EmergencyPanel — SOS + Location + Broadcast = Emergency Survival Mode
 * Full-screen overlay with:
 * - One-tap SOS broadcast to all peers
 * - Location sharing (lat/lon in message)
 * - Mass alert to all connected peers
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useChatStore, useUserStore } from "@/store";
import { useFeatureStore } from "@/store/featureStore";
import { sendLocalMessage } from "@/lib/webrtc/broadcastChannel";
import { peersInstance } from "@/components/connection/PeerDiscovery";
import { generateId } from "@/lib/utils/helpers";
import {
  ShieldAlert, MapPin, Radio, CheckCircle2,
  Crosshair, AlertTriangle, Zap,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMERGENCY_PRESETS = [
  { icon: "🆘", label: "Need Help", msg: "🆘 EMERGENCY — I need immediate assistance!" },
  { icon: "🔥", label: "Fire", msg: "🔥 FIRE EMERGENCY — Evacuate now!" },
  { icon: "🏥", label: "Medical", msg: "🏥 MEDICAL EMERGENCY — Send help immediately!" },
  { icon: "⚠️", label: "Danger", msg: "⚠️ DANGER — Situation is critical!" },
  { icon: "📍", label: "Location SOS", msg: "📍 SOS — I'm sending my location." },
];

export function EmergencyPanel({ open, onClose }: Props) {
  const { addMessage } = useChatStore();
  const { currentUser } = useUserStore();
  const { location } = useFeatureStore();
  const [sent, setSent] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const sendEmergency = (text: string) => {
    if (!currentUser) return;

    let content = text;
    // Append location if available and it's a location SOS
    if (location && text.includes("SOS")) {
      content += `\n📍 Lat: ${location.lat.toFixed(5)}, Lon: ${location.lon.toFixed(5)} (±${Math.round(location.accuracy)}m)`;
    }

    const id = generateId();
    const ts = Date.now();

    // Send to broadcast channel entry in store
    addMessage({
      id, senderId: currentUser.id, receiverId: "broadcast",
      content, timestamp: ts, status: "sent", type: "text",
      isDeleted: false, isEdited: false,
    });

    // Send via BroadcastChannel to same-origin tabs
    sendLocalMessage({ id, senderId: currentUser.id, senderName: currentUser.name, receiverId: "broadcast", content, timestamp: ts });

    // Send via WebRTC to all connected peers
    const packet = JSON.stringify({ type: "message", id, senderId: currentUser.id, receiverId: "broadcast", content, timestamp: ts });
    Object.values(peersInstance).forEach((p) => { try { p.send(packet); } catch (err) { console.error("RTC send error:", err); } });

    setSentMsg(content);
    setSent(true);
    setTimeout(() => { setSent(false); setSentMsg(""); onClose(); }, 2500);
  };

  const shareLocation = () => {
    if (!currentUser) return;
    if (!location) {
      alert("Location not available. Enable location in permissions.");
      return;
    }
    const content = `📍 My Location:\nLat: ${location.lat.toFixed(5)}\nLon: ${location.lon.toFixed(5)}\nAccuracy: ±${Math.round(location.accuracy)}m\n\nhttps://maps.google.com/?q=${location.lat},${location.lon}`;
    sendEmergency(content);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Emergency Survival Mode
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold">Emergency broadcast sent!</p>
            <p className="text-xs text-muted-foreground">All connected peers have been alerted.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick SOS presets */}
            <div className="grid grid-cols-1 gap-2">
              {EMERGENCY_PRESETS.map(({ icon, label, msg }) => (
                <Button
                  key={label}
                  variant="outline"
                  className="w-full justify-start h-auto py-2.5 px-3 text-sm border-destructive/20 hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => sendEmergency(msg)}
                >
                  <span className="mr-2 text-base">{icon}</span>
                  {label}
                </Button>
              ))}
            </div>

            {/* Location share */}
            <div className="border-t border-border pt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-2.5 px-3 text-sm border-primary/20 hover:bg-primary/5 text-foreground"
                onClick={shareLocation}
              >
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                Broadcast My Location
                {location ? (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    ±{Math.round(location.accuracy)}m
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] text-destructive">No GPS</span>
                )}
              </Button>

              <Button
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={() => sendEmergency("🆘🆘🆘 MASS SOS — ALL PEERS ALERT — EMERGENCY 🆘🆘🆘")}
              >
                <Radio className="w-4 h-4 mr-2 animate-pulse" />
                Send Mass SOS to All Peers
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground opacity-60">
              Messages are sent to all connected peers immediately via all available channels.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
