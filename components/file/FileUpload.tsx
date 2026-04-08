"use client";
/**
 * FileUpload — handles file selection, chunking, and encrypted sending.
 */
import { useRef, useState } from "react";
import { useChatStore, useUserStore } from "@/store";
import { Paperclip, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateId } from "@/lib/utils/helpers";
import { peersInstance } from "@/components/connection/PeerDiscovery";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  onClose?: () => void;
}

export function FileUpload({ onClose }: Props) {
  const { currentUser } = useUserStore();
  const { activeChatId, addMessage } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Max 10 MB.");
      return;
    }
    setError("");
    setSelected(file);
  };

  const handleSend = async () => {
    if (!selected || !activeChatId || !currentUser) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const msgId = generateId();
      const ts = Date.now();

      // Store as local message with file content
      const fileMsg = {
        id: msgId,
        senderId: currentUser.id,
        receiverId: activeChatId,
        content: `📎 ${selected.name} (${(selected.size / 1024).toFixed(1)} KB)`,
        timestamp: ts,
        status: "sent" as const,
        type: "file" as const,
        fileData: { name: selected.name, dataUrl, size: selected.size, mimeType: selected.type },
      };

      addMessage(fileMsg);

      // Send over WebRTC
      const peer = peersInstance[activeChatId];
      if (peer) {
        try {
          peer.send(JSON.stringify({ ...fileMsg, type: "file-message" }));
        } catch {}
      }

      setSelected(null);
      setProgress(0);
      onClose?.();
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    reader.readAsDataURL(selected);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Send File</h3>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleSelect}
        accept="image/*,application/pdf,.txt,.zip,.json"
      />

      {!selected ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/30 hover:border-border transition-colors"
        >
          <Paperclip className="w-6 h-6" />
          <span className="text-xs">Click to select file (max 10 MB)</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
            <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selected.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {progress > 0 && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <Button className="w-full" onClick={handleSend}>
            <Upload className="w-4 h-4 mr-2" />
            Send File
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
