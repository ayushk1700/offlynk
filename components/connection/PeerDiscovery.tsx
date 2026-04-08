"use client";

import { useState, useEffect, useRef } from "react";
import { useConnectionStore } from "@/store/connectionStore";
import { useUserStore, useChatStore } from "@/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SimplePeer from "simple-peer";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Scan, Link as LinkIcon, Check, Loader2 } from "lucide-react";

// Track global peers
export const peersInstance: Record<string, InstanceType<typeof SimplePeer>> = {};

export function PeerDiscovery() {
  const { isScanning, setScanning } = useConnectionStore();
  const { currentUser } = useUserStore();
  const { addPeer, updatePeerStatus, addMessage } = useChatStore();
  const [mode, setMode] = useState<"create" | "join">("create");
  
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const peerRef = useRef<InstanceType<typeof SimplePeer> | null>(null);

  // Initialize a new peer offer
  const generateOffer = () => {
    setLoading(true);
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
    });

    peer.on("signal", (data) => {
      // Include user metadata in the initial offer
      const signalData = {
        sdp: data,
        user: currentUser
      };
      setOffer(btoa(JSON.stringify(signalData)));
      setLoading(false);
    });

    setupPeerEvents(peer);
    peerRef.current = peer;
  };

  // Connect to an offer (generates an answer)
  const connectToOffer = () => {
    if (!remoteSignal) return;
    try {
      setLoading(true);
      const decoded = JSON.parse(atob(remoteSignal));
      
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
      });

      peer.on("signal", (data) => {
        const signalData = {
          sdp: data,
          user: currentUser
        };
        setAnswer(btoa(JSON.stringify(signalData)));
        setLoading(false);
      });

      peer.signal(decoded.sdp);
      
      // Add peer to store
      if (decoded.user) {
        addPeer({
          id: decoded.user.id,
          name: decoded.user.name,
          publicKey: decoded.user.publicKey,
          isOnline: false,
          unreadCount: 0
        });
        peersInstance[decoded.user.id] = peer;
      }

      setupPeerEvents(peer);
      peerRef.current = peer;
    } catch (e) {
      console.error("Invalid offer", e);
      setLoading(false);
    }
  };

  // Finalize connection for initiator (processes the answer)
  const finalizeConnection = () => {
    if (!remoteSignal || !peerRef.current) return;
    try {
      const decoded = JSON.parse(atob(remoteSignal));
      peerRef.current.signal(decoded.sdp);

      if (decoded.user) {
        addPeer({
          id: decoded.user.id,
          name: decoded.user.name,
          publicKey: decoded.user.publicKey,
          isOnline: false,
          unreadCount: 0
        });
        peersInstance[decoded.user.id] = peerRef.current;
      }
      setScanning(false);
    } catch (e) {
      console.error("Invalid answer", e);
    }
  };

  const setupPeerEvents = (peer: InstanceType<typeof SimplePeer>) => {
    peer.on("connect", () => {
      console.log("Peer CONNECTED!");
      // Status update handled during data exchange if needed, or by finding peer ID
      // To keep it simple, we listen for a handshake data event
      peer.send(JSON.stringify({ type: 'handshake', userId: currentUser?.id }));
      setScanning(false);
    });

    peer.on("data", async (data) => {
      try {
        const parsed = JSON.parse(data.toString());

        switch (parsed.type) {
          case 'handshake':
            updatePeerStatus(parsed.userId, true);
            break;

          case 'message':
            addMessage({
              id: parsed.id, senderId: parsed.senderId,
              receiverId: currentUser?.id || '', content: parsed.content,
              timestamp: parsed.timestamp, status: 'delivered', type: 'text',
            });
            break;

          case 'delete':
            if (parsed.messageId) useChatStore.getState().deleteMessageForEveryone(parsed.messageId);
            break;

          case 'read-ack':
            if (parsed.messageId) useChatStore.getState().updateMessageStatus(parsed.messageId, 'read');
            break;

          case 'file-start': {
            const { handleFileStart } = await import('@/lib/webrtc/fileTransfer');
            await handleFileStart(parsed, {
              onProgress: (id, pct) => console.log(`File ${id}: ${pct}%`),
              onDone: (id, blob, meta) => {
                const blobUrl = URL.createObjectURL(blob);
                const isImage = meta.mimeType.startsWith('image/');
                useChatStore.getState().addMessage({
                  id: meta.id, senderId: meta.senderId,
                  receiverId: currentUser?.id || '', content: isImage ? '📷 Photo' : `📎 ${meta.name}`,
                  timestamp: Date.now(), status: 'delivered',
                  type: isImage ? 'image' : 'file',
                  fileData: { name: meta.name, size: meta.size, mimeType: meta.mimeType, blobUrl, dataUrl: isImage ? blobUrl : undefined },
                });
              },
            });
            break;
          }

          case 'file-chunk': {
            const { handleFileChunk } = await import('@/lib/webrtc/fileTransfer');
            await handleFileChunk(parsed);
            break;
          }

          case 'file-end': {
            const { handleFileEnd } = await import('@/lib/webrtc/fileTransfer');
            await handleFileEnd(parsed.id);
            break;
          }
        }
      } catch (e) {
        console.error("Failed to parse peer data", e);
      }
    });

    peer.on("error", (err) => console.log("Peer error", err));
    peer.on("close", () => {
      // Find which peer disconnected by iterating peersInstance
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Connect to Peer
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="create">Generate Invite</TabsTrigger>
            <TabsTrigger value="join">Join Peer</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            {!offer ? (
              <Button onClick={generateOffer} disabled={loading} className="w-full h-24 border-dashed border-2 bg-muted/50 hover:bg-muted text-lg">
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Start Connection Request"}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Share this with your peer. They need to paste it in 'Join Peer'.</p>
                <div className="flex justify-center p-4 bg-white rounded-md">
                  <QRCodeSVG value={offer} size={180} />
                </div>
                <div className="flex gap-2">
                  <Input value={offer} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(offer)}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="pt-4 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground mb-2">After they join, paste their answer here to complete connection:</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste answer token here..." 
                      value={remoteSignal} 
                      onChange={(e) => setRemoteSignal(e.target.value)}
                    />
                    <Button onClick={finalizeConnection} disabled={!remoteSignal}>Connect</Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
             {!answer ? (
               <div className="space-y-4">
                 <p className="text-sm text-muted-foreground">Paste the connection invite from your peer.</p>
                 <Input 
                    placeholder="Paste invite token..." 
                    value={remoteSignal} 
                    onChange={(e) => setRemoteSignal(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button className="w-full" onClick={connectToOffer} disabled={!remoteSignal || loading}>
                    {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Scan className="w-4 h-4 mr-2" />}
                    Accept Invite
                  </Button>
               </div>
             ) : (
               <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Invite accepted! Send this answer back to your peer.</p>
                <div className="flex justify-center p-4 bg-white rounded-md">
                  <QRCodeSVG value={answer} size={180} />
                </div>
                <div className="flex gap-2">
                  <Input value={answer} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(answer)}>
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
