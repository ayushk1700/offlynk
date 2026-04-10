"use client";

import { useState, useRef, useEffect } from "react";
import { useConnectionStore } from "@/store/connectionStore";
import { useUserStore, useChatStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SimplePeer from "simple-peer";
import { QRCodeSVG } from "qrcode.react";
import { Radar } from "./Radar";
import { Copy, Scan, Link as LinkIcon, Check, Loader2, Sparkles, Wand2, Radar as RadarIcon } from "lucide-react";
import {
  serializeMessage,
  handleChannelMessage,
} from "@/lib/webrtc/dataChannel";
import { generateId } from "@/lib/utils/helpers";
import { signalingRelay } from "@/lib/webrtc/signalingRelay";

// ---------------------------------------------------------------------------
// Global peer instance registry — keyed by peerId
// ---------------------------------------------------------------------------
export const peersInstance: Record<string, InstanceType<typeof SimplePeer>> =
  {};

export function PeerDiscovery() {
  const { isScanning, setScanning } = useConnectionStore();
  const { currentUser } = useUserStore();
  const { addPeer, updatePeerStatus, addMessage } = useChatStore();

  const [mode, setMode] = useState<"passphrase" | "create" | "join">("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const peerRef = useRef<InstanceType<typeof SimplePeer> | null>(null);

  // -------------------------------------------------------------------------
  // Initiator: generate an SDP offer
  // -------------------------------------------------------------------------
  const generateOffer = (toPeerId?: string) => {
    setLoading(true);
    const peer = new SimplePeer({ initiator: true, trickle: false });

    peer.on("signal", (data) => {
      const signalData = { sdp: data, from: currentUser };
      const b64 = btoa(JSON.stringify(signalData));
      setOffer(b64);
      setLoading(false);

      if (mode === 'passphrase' && toPeerId) {
        setStatus(`Sending offer to ${toPeerId}...`);
        signalingRelay.sendOffer(b64, toPeerId, currentUser);
      }
    });

    setupPeerEvents(peer);
    peerRef.current = peer;
  };

  const connectToOffer = (externalSignal?: string, fromPeer?: any) => {
    const signalToUse = externalSignal || remoteSignal;
    if (!signalToUse) return;
    try {
      setLoading(true);
      const decoded = JSON.parse(atob(signalToUse));
      const sender = fromPeer || decoded.from;

      const { blockedPeers } = useChatStore.getState();
      if (sender?.id && blockedPeers.has(sender.id)) {
        setLoading(false);
        return;
      }

      const peer = new SimplePeer({ initiator: false, trickle: false });

      peer.on("signal", (data) => {
        const signalData = { sdp: data, from: currentUser };
        const b64 = btoa(JSON.stringify(signalData));
        setAnswer(b64);
        setLoading(false);

        if (mode === 'passphrase' && sender?.id) {
          setStatus("Sending answer...");
          signalingRelay.sendAnswer(b64, sender.id, currentUser);
        }
      });

      peer.signal(decoded.sdp);

      if (sender) {
        addPeer({
          id: sender.id, name: sender.name, publicKey: sender.publicKey || "", isOnline: false, unreadCount: 0,
          lastSeen: 0,
          updatedAt: 0
        });
        peersInstance[sender.id] = peer;
      }

      setupPeerEvents(peer);
      peerRef.current = peer;
    } catch (e) {
      console.error("[PeerDiscovery] Invalid offer:", e);
      setLoading(false);
    }
  };

  const finalizeConnection = (externalSignal?: string, fromPeer?: any) => {
    const signalToUse = externalSignal || remoteSignal;
    if (!signalToUse || !peerRef.current) return;
    try {
      const decoded = JSON.parse(atob(signalToUse));
      const sender = fromPeer || decoded.from;

      const { blockedPeers } = useChatStore.getState();
      if (sender?.id && blockedPeers.has(sender.id)) {
        setScanning(false);
        return;
      }

      peerRef.current.signal(decoded.sdp);
      if (sender) {
        addPeer({
          id: sender.id, name: sender.name, publicKey: sender.publicKey || "", isOnline: false, unreadCount: 0,
          lastSeen: 0,
          updatedAt: 0
        });
        peersInstance[sender.id] = peerRef.current;
      }
      setScanning(false);
    } catch (e) {
      console.error("[PeerDiscovery] Invalid answer:", e);
    }
  };

  const startAutoJoin = async () => {
    if (!passphrase.trim()) return;
    setLoading(true);
    setStatus("Scanning Local Frequency...");

    // Simulate Radar Scan for UX
    setTimeout(() => {
      if (loading) setStatus("Interference cleared... peer detected!");
    }, 3200);

    await signalingRelay.connect(passphrase.trim(), currentUser!, {
      onPresence: (from) => {
        if (!currentUser || from.id === currentUser.id) return;
        console.log('[Relay] Peer present:', from.name);
        setStatus(`Peer ${from.name} detected. Connecting...`);
        // Automatically trigger an offer to this peer
        generateOffer(from.id);
      },
      onOffer: (offBuf, from) => {
        if (from.id === currentUser?.id) return;
        setStatus(`Invite from ${from.name} found! Accepting...`);
        connectToOffer(offBuf);
      },
      onAnswer: (ansBuf, from) => {
        if (from.id === currentUser?.id) return;
        setStatus(`Peer ${from.name} joined! Synchronizing...`);
        finalizeConnection(ansBuf);
      }
    });

    // We act as both potential initiator and potential responder
    generateOffer();
    setStatus("Waiting for peer to join room...");
  };

  useEffect(() => {
    return () => signalingRelay.disconnect();
  }, []);

  const setupPeerEvents = (peer: InstanceType<typeof SimplePeer>) => {
    peer.on("connect", () => {
      console.log("[PeerDiscovery] Peer CONNECTED");
      if (currentUser) {
        peer.send(serializeMessage({ type: "handshake", id: crypto.randomUUID(), senderId: currentUser.id, timestamp: Date.now(), displayName: currentUser.name, version: "1.0" }));
      }
      setScanning(false);
    });

    peer.on("data", async (data) => {
      const raw = data.toString();
      const chatStore = useChatStore.getState();

      handleChannelMessage(raw, {
        onHandshake: (msg) => {
          addPeer({
            id: msg.senderId, name: msg.displayName, publicKey: "", isOnline: true, unreadCount: 0,
            lastSeen: 0,
            updatedAt: 0
          });
          updatePeerStatus(msg.senderId, true);
        },
        onMessage: (msg: any) => {
          addMessage(msg.senderId, {
            ...msg,
            receiverId: currentUser?.id ?? "",
            status: "delivered",
            type: "text",
            isDeleted: false,
            isEdited: false,
            hopCount: 1, // Phase 3: Direct
            updatedAt: Date.now()
          });
        },
        onEdit: (msg) => chatStore.updateMessage(msg.senderId, msg.messageId, { content: msg.newContent, editedAt: msg.editedAt, isEdited: true }),
        onDelete: (msg) => chatStore.deleteMessage(msg.senderId, msg.messageId, msg.deleteType),
        onReadReceipt: (msg) => chatStore.updateMessage(msg.senderId, msg.messageId, { status: msg.status }),
        onTyping: (msg) => chatStore.setTyping(msg.senderId, msg.isTyping),
        onChatAction: (msg) => {
          if (msg.action === 'report' && msg.reason?.startsWith('live:')) {
            const liveText = msg.reason.slice(5);
            chatStore.setTyping(msg.senderId, true, liveText);
          }
        },
        onAck: (msg) => chatStore.updateMessage(msg.senderId, msg.ackedId, { status: "delivered" }),
        onFileMeta: (msg) => console.log("[PeerDiscovery] File meta:", msg.fileId),
        onFileChunk: async (msg) => {
          const { handleFileChunk } = await import("@/lib/webrtc/fileTransfer");
          await handleFileChunk(msg);
        },
        onFileAck: (msg) => chatStore.updateMessage(msg.senderId, msg.fileId, { status: msg.status }),
        onReaction: (msg) => {
          const thread = chatStore.messages[msg.senderId] ?? [];
          const target = thread.find((m: any) => m.id === msg.targetId);
          if (!target) return;
          let reactions: Record<string, string[]> = {};
          if (target.reactions) {
             try { reactions = JSON.parse(target.reactions as string); } catch(e) {}
          }
          const uids = reactions[msg.emoji] || [];
          if (msg.isRemoving) {
            reactions[msg.emoji] = uids.filter((u: string) => u !== msg.senderId);
            if (reactions[msg.emoji].length === 0) delete reactions[msg.emoji];
          } else if (!uids.includes(msg.senderId)) {
            reactions[msg.emoji] = [...uids, msg.senderId];
          }
          chatStore.updateMessage(msg.senderId, msg.targetId, { reactions: JSON.stringify(reactions) });
        },
        onViewOnce: (msg) => chatStore.updateMessage(msg.senderId, msg.targetId, { isViewed: true, fileData: undefined }),
        onMeshMap: (msg) => {
          if (!currentUser) return;
          msg.nodes.forEach(node => {
            if (node.id === currentUser.id) return;
            const existing = chatStore.peers[node.id];
            // If new peer OR shorter path found
            if (!existing || (!existing.isOnline && node.hops < 5) || (existing.hops || 99) > node.hops + 1) {
              addPeer({
                id: node.id,
                name: node.name,
                publicKey: "",
                isOnline: true,
                unreadCount: 0,
                lastSeen: Date.now(),
                updatedAt: Date.now(),
                hops: node.hops + 1
              });
              updatePeerStatus(node.id, true, node.hops + 1);
            }
          });
        },
        onRelay: (msg) => {
          if (!currentUser) return;
          // Reach destination?
          if (msg.targetId === currentUser.id) {
            console.log("📍 Relay packet REACHED destination!");
            // Recurse to process the payload
            const innerHandlers: any = {
              onHandshake: (m: any) => console.log("Relayed handshake ignore"),
              onMessage: (m: any) => {
                 addMessage(m.senderId, { 
                   ...m, 
                   receiverId: currentUser.id, 
                   status: "delivered", 
                   type: "text", 
                   isDeleted: false, 
                   isEdited: false,
                   hopCount: msg.hopCount, // Phase 3: Relayed
                   updatedAt: Date.now()
                 });
              },
              onEdit: (m: any) => chatStore.updateMessage(m.senderId, m.messageId, { content: m.newContent, editedAt: m.editedAt, isEdited: true }),
              onDelete: (m: any) => chatStore.deleteMessage(m.senderId, m.messageId, m.deleteType),
              onReaction: (m: any) => { /* Reuse logic or skip for now */ },
              onRelay: () => {}, // prevent infinite relay-in-relay
              onFileMeta: () => {},
              onFileChunk: () => {},
              onReadReceipt: () => {},
              onTyping: () => {}
            };
            const { dispatchChannelMessage } = require("@/lib/webrtc/dataChannel");
            dispatchChannelMessage(msg.payload, innerHandlers);
            return;
          }

          // Forwarding logic
          if (msg.visited.includes(currentUser.id) || msg.hopCount >= 5) return;

          const relayedMsg = {
            ...msg,
            hopCount: msg.hopCount + 1,
            visited: [...msg.visited, currentUser.id]
          };
          const packet = JSON.stringify(relayedMsg);

          // Try direct first
          const direct = peersInstance[msg.targetId];
          if (direct?.connected) {
            try { direct.send(packet); } catch(e) {}
          } else {
            // Flood to candidates
            Object.entries(peersInstance).forEach(([pid, peer]) => {
              if (peer.connected && !msg.visited.includes(pid)) {
                try { peer.send(packet); } catch(e) {}
              }
            });
          }
        }
      });
    });

    peer.on("error", (err) => console.error("[PeerDiscovery] Peer error:", err));
    peer.on("close", () => {
      for (const [id, instance] of Object.entries(peersInstance)) {
        if (instance === peer) {
          updatePeerStatus(id, false);
          delete peersInstance[id];
          break;
        }
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isScanning} onOpenChange={setScanning}>
      <DialogContent className="sm:max-w-md bg-card/60 backdrop-blur-3xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center text-xl font-bold italic tracking-tight">
            OffLynk Radar
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="passphrase"
          onValueChange={(v) => setMode(v as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/40 p-1.5 rounded-xl">
            <TabsTrigger value="passphrase" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold py-2">Magic Word</TabsTrigger>
            <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold py-2">Invite</TabsTrigger>
            <TabsTrigger value="join" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold py-2">Join</TabsTrigger>
          </TabsList>

          <TabsContent value="passphrase" className="space-y-6 px-1 flex flex-col items-center">
            {!loading ? (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-start gap-4">
                <RadarIcon className="w-6 h-6 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Local Discovery Radar</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Type a secret "Room Word". When your peer scans for the same word, you will appear on each other's radar instantly.</p>
                </div>
              </div>
            ) : (
              <Radar className="my-4" />
            )}

            <div className="space-y-3 w-full">
              <Input
                placeholder="Enter secret word…"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="h-12 text-lg font-mono text-center tracking-wider bg-muted/20 border-border/50 focus:ring-primary/20"
              />
              <Button
                className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/10"
                onClick={startAutoJoin}
                disabled={!passphrase.trim() || loading}
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-3" /> : <RadarIcon className="w-5 h-5 mr-3" />}
                {loading ? "Scanning Frequency…" : "Start Radar Scan"}
              </Button>
              {status && <p className="text-[10px] text-center uppercase tracking-widest font-bold text-primary animate-pulse">{status}</p>}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            {!offer ? (
              <Button onClick={() => generateOffer()} disabled={loading} className="w-full h-32 variant-outline border-dashed border-2 bg-muted/50 hover:bg-muted text-lg rounded-2xl">
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Manual Request Token"}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner">
                  <QRCodeSVG value={offer} size={160} />
                </div>
                <div className="flex gap-2">
                  <Input value={offer} readOnly className="font-mono text-xs bg-muted/20 rounded-xl" />
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={() => copyToClipboard(offer)}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border/40">
                  <Input placeholder="Paste their answer here..." value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} className="rounded-xl" />
                  <Button onClick={() => finalizeConnection()} disabled={!remoteSignal} className="rounded-xl">Connect</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            {!answer ? (
              <div className="space-y-4">
                <Input placeholder="Paste Peer Invite Token..." value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} className="rounded-xl h-12 font-mono text-xs" />
                <Button className="w-full h-12 rounded-xl text-base font-bold" onClick={() => connectToOffer()} disabled={!remoteSignal || loading}>
                  {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Scan className="w-4 h-4 mr-2" />}
                  Accept Invitation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-2xl">
                  <QRCodeSVG value={answer} size={160} />
                </div>
                <div className="flex gap-2">
                  <Input value={answer} readOnly className="font-mono text-xs bg-muted/20 rounded-xl" />
                  <Button variant="outline" size="icon" className="rounded-xl" onClick={() => copyToClipboard(answer)}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}