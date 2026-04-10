"use client";

import { useState } from "react";
import { useChatStore, useUserStore } from "@/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const { peers, createGroup, setActiveChat } = useChatStore();
  const { currentUser } = useUserStore();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const peerList = Object.values(peers).filter(p => p.id !== 'broadcast' && p.type !== 'group');

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0 || !currentUser) return;
    const participants = [...selected, currentUser.id];
    const groupId = await createGroup(name.trim(), participants);
    setActiveChat(groupId);
    onClose();
    setName("");
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Create Local Group
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Name</label>
            <Input 
              placeholder="E.g. Squad ALPHA, Family..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Participants ({selected.length})</label>
            <ScrollArea className="h-48 border border-border/50 rounded-xl bg-muted/5 p-2">
              <div className="grid grid-cols-1 gap-1">
                {peerList.map(peer => (
                  <button
                    key={peer.id}
                    onClick={() => toggleSelect(peer.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      selected.includes(peer.id) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] bg-secondary">{peer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{peer.name}</p>
                    </div>
                    {selected.includes(peer.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-6 border-t border-border/40 bg-muted/30 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || selected.length === 0}
            className="rounded-xl px-8"
          >
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
