"use client";
/**
 * ConnectFlow — Simplified 3-mode connection modal:
 *  📶 Auto (Same Wi-Fi / BroadcastChannel — already works)
 *  🧾 Passphrase (shared secret → common channel)
 *  🔗 Manual (copy-paste WebRTC offer/answer)
 *
 * The passphrase mode works by:
 * 1. Hash the passphrase with SHA-256 → 8-char hex
 * 2. Create a BroadcastChannel named "offlynk-pass-{hash}"
 * 3. Two users with the same passphrase discover each other instantly
 */
import { useState, useEffect, useRef } from "react";
import { useConnectionStore } from "@/store/connectionStore";
import { useUserStore, useChatStore } from "@/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SimplePeer from "simple-peer";
import { QRCodeSVG } from "qrcode.react";
import {
  Wifi, Key, Link as LinkIcon, Copy, Check,
  Loader2, RefreshCw, CheckCircle2, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { peersInstance } from "./PeerDiscovery";

/* ─── Passphrase hashing ────────────────────────────────────── */
async function hashPassphrase(phrase: string): Promise<string> {
  const data = new TextEncoder().encode(phrase.toLowerCase().trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

type Mode = "auto" | "passphrase" | "manual";

export function ConnectFlow() {
  const { isScanning, setScanning } = useConnectionStore();
  const { currentUser } = useUserStore();
  const { addPeer, updatePeerStatus, addMessage } = useChatStore();

  const [mode, setMode] = useState<Mode>("auto");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseStatus, setPassphraseStatus] = useState<"idle" | "waiting" | "connected">("idle");
  const [connectedName, setConnectedName] = useState("");

  /* Manual WebRTC state */
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  const [manualMode, setManualMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const peerRef = useRef<InstanceType<typeof SimplePeer> | null>(null);
  const passChanRef = useRef<BroadcastChannel | null>(null);

  /* ── Auto mode: already running via LocalChatProvider ─────── */
  const autoConnected = Object.values(useChatStore.getState().peers).filter(
    (p) => p.isOnline && p.id !== "broadcast"
  );

  /* ── Passphrase mode ─────────────────────────────────────── */
  const joinPassphrase = async () => {
    if (!passphrase.trim() || !currentUser) return;
    setPassphraseStatus("waiting");

    const hash = await hashPassphrase(passphrase);
    const chanName = `offlynk-pass-${hash}`;
    const ch = new BroadcastChannel(chanName);
    passChanRef.current = ch;

    // Announce ourselves
    ch.postMessage({ type: "announce", user: currentUser });

    ch.onmessage = (ev) => {
      const { type, user } = ev.data;
      if (!user || user.id === currentUser.id) return;

      if (type === "announce") {
        // Reply so they know we're here
        ch.postMessage({ type: "ack", user: currentUser });
      }

      if (type === "announce" || type === "ack") {
        addPeer({ id: user.id, name: user.name, publicKey: user.publicKey || "", isOnline: true, unreadCount: 0 });
        updatePeerStatus(user.id, true);
        setConnectedName(user.name);
        setPassphraseStatus("connected");
        setTimeout(() => { ch.close(); setScanning(false); }, 2000);
      }
    };
  };

  const clearPassphrase = () => {
    passChanRef.current?.close();
    passChanRef.current = null;
    setPassphraseStatus("idle");
    setPassphrase("");
    setConnectedName("");
  };

  /* ── Manual WebRTC ──────────────────────────────────────── */
  const setupPeerEvents = (peer: InstanceType<typeof SimplePeer>) => {
    peer.on("connect", () => {
      peer.send(JSON.stringify({ type: "handshake", userId: currentUser?.id }));
      setScanning(false);
    });
    peer.on("data", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "handshake") updatePeerStatus(parsed.userId, true);
        else if (parsed.type === "message") {
          addMessage({
            id: parsed.id, senderId: parsed.senderId,
            receiverId: currentUser?.id || "", content: parsed.content,
            timestamp: parsed.timestamp, status: "delivered", type: "text",
          });
        }
      } catch (err) { console.warn("Could not process payload:", err); }
    });
    peer.on("error", () => {});
    peer.on("close", () => {
      for (const [id, inst] of Object.entries(peersInstance)) {
        if (inst === peer) { updatePeerStatus(id, false); delete peersInstance[id]; break; }
      }
    });
  };

  const generateOffer = () => {
    setLoading(true);
    const peer = new SimplePeer({ initiator: true, trickle: false });
    peer.on("signal", (data) => {
      setOffer(btoa(JSON.stringify({ sdp: data, user: currentUser })));
      setLoading(false);
    });
    setupPeerEvents(peer);
    peerRef.current = peer;
  };

  const connectToOffer = () => {
    if (!remoteSignal) return;
    setLoading(true);
    try {
      const decoded = JSON.parse(atob(remoteSignal));
      const peer = new SimplePeer({ initiator: false, trickle: false });
      peer.on("signal", (data) => {
        setAnswer(btoa(JSON.stringify({ sdp: data, user: currentUser })));
        setLoading(false);
      });
      peer.signal(decoded.sdp);
      if (decoded.user) {
        addPeer({ id: decoded.user.id, name: decoded.user.name, publicKey: decoded.user.publicKey || "", isOnline: false, unreadCount: 0 });
        peersInstance[decoded.user.id] = peer;
      }
      setupPeerEvents(peer);
      peerRef.current = peer;
    } catch { setLoading(false); }
  };

  const finalizeConnection = () => {
    if (!remoteSignal || !peerRef.current) return;
    try {
      const decoded = JSON.parse(atob(remoteSignal));
      peerRef.current.signal(decoded.sdp);
      if (decoded.user) {
        addPeer({ id: decoded.user.id, name: decoded.user.name, publicKey: decoded.user.publicKey || "", isOnline: false, unreadCount: 0 });
        peersInstance[decoded.user.id] = peerRef.current;
      }
      setScanning(false);
    } catch (err) { console.warn("Could not process scanned data:", err); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Cleanup on close ─────────────────────────────────────── */
  useEffect(() => {
    if (!isScanning) { clearPassphrase(); setOffer(""); setAnswer(""); setRemoteSignal(""); setManualMode("create"); }
  }, [isScanning]);

  const modeButtons: { id: Mode; icon: React.ElementType; label: string; desc: string }[] = [
    { id: "auto", icon: Wifi, label: "Auto", desc: "Same browser / Wi-Fi" },
    { id: "passphrase", icon: Key, label: "Passphrase", desc: "Shared secret word" },
    { id: "manual", icon: LinkIcon, label: "Manual", desc: "Copy-paste / QR code" },
  ];

  return (
    <Dialog open={isScanning} onOpenChange={setScanning}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Connect to Peer
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Choose the simplest method available.
          </p>
        </DialogHeader>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          {modeButtons.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={[
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                mode === id
                  ? "border-primary/60 bg-primary/5 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30",
              ].join(" ")}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[9px] opacity-60 leading-tight">{desc}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── AUTO mode ─────────────────────────────── */}
          {mode === "auto" && (
            <motion.div key="auto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-primary animate-pulse" />
                  Scanning same network…
                </p>
                <p className="text-xs text-muted-foreground">
                  Open this app in another tab or window on the same device or Wi-Fi. Peers appear automatically.
                </p>
              </div>
              {autoConnected.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Detected peers:</p>
                  {autoConnected.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">Connected</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-2">No peers detected yet…</p>
              )}
            </motion.div>
          )}

          {/* ── PASSPHRASE mode ───────────────────────── */}
          {mode === "passphrase" && (
            <motion.div key="pass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              <div className="bg-muted/20 border border-border/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Both you and your peer enter the <strong>same secret word or phrase</strong>. You'll connect instantly — no code-sharing needed.
                </p>
              </div>

              {passphraseStatus === "connected" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                  <p className="font-semibold text-sm">Connected to {connectedName}!</p>
                  <p className="text-xs text-muted-foreground">Closing…</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter shared passphrase…"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && joinPassphrase()}
                      className="h-11"
                      disabled={passphraseStatus === "waiting"}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Case-insensitive. Use any memorable phrase.
                    </p>
                  </div>
                  {passphraseStatus === "waiting" ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for peer with same passphrase…
                    </div>
                  ) : (
                    <Button className="w-full" onClick={joinPassphrase} disabled={!passphrase.trim()}>
                      <Key className="w-4 h-4 mr-2" />
                      Connect with Passphrase
                    </Button>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── MANUAL mode ───────────────────────────── */}
          {mode === "manual" && (
            <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              {/* Sub-mode tabs */}
              <div className="grid grid-cols-2 gap-2">
                {(["create", "join"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setManualMode(m)}
                    className={`py-2 text-sm rounded-lg border transition-colors ${manualMode === m ? "border-primary/50 bg-primary/5 text-foreground" : "border-border/40 text-muted-foreground hover:bg-muted/30"}`}
                  >
                    {m === "create" ? "Generate Invite" : "Join with Code"}
                  </button>
                ))}
              </div>

              {manualMode === "create" && (
                <div className="space-y-3">
                  {!offer ? (
                    <Button className="w-full h-16 border-dashed border-2 border-border bg-muted/40 hover:bg-muted" variant="outline" onClick={generateOffer} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><RefreshCw className="w-4 h-4 mr-2" />Generate Connection Code</>}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center p-3 bg-white rounded-xl">
                        <QRCodeSVG value={offer} size={160} />
                      </div>
                      <div className="flex gap-2">
                        <Input value={offer} readOnly className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copy(offer)}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Paste your peer's answer code:</p>
                        <div className="flex gap-2">
                          <Input placeholder="Answer code…" value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} className="text-xs" />
                          <Button onClick={finalizeConnection} disabled={!remoteSignal}>Connect</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {manualMode === "join" && (
                <div className="space-y-3">
                  {!answer ? (
                    <div className="space-y-2">
                      <Input placeholder="Paste invite code…" value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} className="font-mono text-xs" />
                      <Button className="w-full" onClick={connectToOffer} disabled={!remoteSignal || loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                        Accept Invite
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Send this answer back to your peer:</p>
                      <div className="flex justify-center p-3 bg-white rounded-xl">
                        <QRCodeSVG value={answer} size={160} />
                      </div>
                      <div className="flex gap-2">
                        <Input value={answer} readOnly className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copy(answer)}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
