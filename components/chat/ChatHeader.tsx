"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/store";
import { useFeatureStore } from "@/store/featureStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, WifiOff,
  MoreVertical, Pin, PinOff, BellOff, Bell,
  Timer, Compass, Zap, Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmergencyPanel } from "@/components/emergency/EmergencyPanel";

const SELF_DESTRUCT_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "1 min", value: 1 },
  { label: "5 min", value: 5 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
];

/* ── Compass arrow ─────────────────────────────────────────── */
function CompassArrow({ peerId }: { peerId: string }) {
  const { compassEnabled } = useFeatureStore();
  const [bearing, setBearing] = useState<number | null>(null);

  useEffect(() => {
    if (!compassEnabled) return;
    const seed = (peerId.charCodeAt(0) + peerId.charCodeAt(1)) % 360;
    setBearing(seed);
  }, [peerId, compassEnabled]);

  if (!compassEnabled || bearing === null) return null;

  return (
    <div className="relative w-7 h-7 shrink-0" title={`~${Math.round(bearing)}°`}>
      <div className="w-7 h-7 rounded-full border border-border/50 bg-muted/40 flex items-center justify-center">
        <motion.div
          animate={{ rotate: bearing }}
          transition={{ type: "spring", stiffness: 30, damping: 10 }}
        >
          <Navigation className="w-3.5 h-3.5 text-primary" />
        </motion.div>
      </div>
    </div>
  );
}

/* ── ⋮ More dropdown (SOS moved here) ──────────────────────── */
interface MoreMenuProps {
  peerId: string;
  onClose: () => void;
  onSOSClick: () => void;
}

function MoreMenu({ peerId, onClose, onSOSClick }: MoreMenuProps) {
  const {
    pinnedChats, silentChats, selfDestructChats,
    pinChat, unpinChat, toggleSilent, setSelfDestruct,
    compassEnabled, setCompassEnabled, autoRelayBoost, setAutoRelayBoost,
  } = useFeatureStore();

  const isPinned = pinnedChats.includes(peerId);
  const isSilent = silentChats.includes(peerId);
  const sdMins = selfDestructChats[peerId] ?? 0;

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -6 }}
      className="absolute right-2 top-14 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-64"
    >
      {/* 🚨 SOS — now lives here */}
      {item(<ShieldAlert className="w-4 h-4" />, "Emergency SOS", onSOSClick, true)}

      <div className="border-t border-border/40" />

      {item(
        isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />,
        isPinned ? "Unpin Chat" : "Pin Chat",
        () => isPinned ? unpinChat(peerId) : pinChat(peerId)
      )}
      {item(
        isSilent ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />,
        isSilent ? "Unmute" : "Silent Mode",
        () => toggleSilent(peerId)
      )}
      {item(<Compass className="w-4 h-4" />, `Compass ${compassEnabled ? "On" : "Off"}`, () => setCompassEnabled(!compassEnabled))}
      {item(<Zap className="w-4 h-4" />, `Auto Relay ${autoRelayBoost ? "On" : "Off"}`, () => setAutoRelayBoost(!autoRelayBoost))}

      {/* Self-destruct */}
      <div className="px-4 py-2.5 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-2">
          <Timer className="w-3 h-3" /> Self-Destruct Timer
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SELF_DESTRUCT_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setSelfDestruct(peerId, value); onClose(); }}
              className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                sdMins === value
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/40 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main header ────────────────────────────────────────────── */
interface Props { onSOSClick?: () => void; }

export default function ChatHeader({ onSOSClick }: Props) {
  const { peers, activeChatId, setActiveChat } = useChatStore();
  const { pinnedChats, silentChats, selfDestructChats, compassEnabled } = useFeatureStore();
  const [showMore, setShowMore] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const peer = activeChatId ? peers[activeChatId] : null;
  if (!peer) return null;

  const isBroadcast = peer.id === "broadcast";
  const isPinned = pinnedChats.includes(peer.id);
  const isSilent = silentChats.includes(peer.id);
  const sdMins = selfDestructChats[peer.id] ?? 0;
  const peerDid = peer.did || `did:offgrid:${peer.id}`;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
        {/* Back (mobile) */}
        <Button
          variant="ghost" size="icon"
          className="md:hidden -ml-1 w-8 h-8 text-muted-foreground shrink-0"
          onClick={() => setActiveChat(null)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Avatar */}
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarFallback className={
            isBroadcast
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-secondary-foreground text-sm font-bold"
          }>
            {isBroadcast ? <ShieldAlert className="w-4 h-4" /> : peer.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Peer info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-foreground truncate leading-tight">{peer.name}</p>
            {isPinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
            {isSilent && <BellOff className="w-3 h-3 text-muted-foreground shrink-0" />}
            {sdMins > 0 && (
              <span className="text-[9px] text-destructive border border-destructive/30 bg-destructive/10 px-1 rounded-full leading-4">
                ⏱{sdMins}m
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            {isBroadcast ? (
              <><ShieldAlert className="w-3 h-3 text-destructive" /> All peers</>
            ) : peer.isOnline ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> Online</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
            {!isBroadcast && (
              <span className="hidden sm:inline text-[9px] opacity-40 ml-1 font-mono truncate max-w-[100px]">
                {peerDid}
              </span>
            )}
          </p>
        </div>

        {/* Compass */}
        {!isBroadcast && compassEnabled && <CompassArrow peerId={peer.id} />}

        {/* E2E badge */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 border border-border/30 px-2 py-1 rounded-full shrink-0">
          <ShieldCheck className="w-3 h-3" /> E2E
        </div>

        {/* ⋮ More — SOS is inside */}
        <Button
          variant="ghost" size="icon"
          className="w-8 h-8 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setShowMore((v) => !v)}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <MoreMenu
              peerId={peer.id}
              onClose={() => setShowMore(false)}
              onSOSClick={() => { setShowMore(false); setShowEmergency(true); }}
            />
          </>
        )}
      </AnimatePresence>

      <EmergencyPanel open={showEmergency} onClose={() => setShowEmergency(false)} />
    </div>
  );
}
