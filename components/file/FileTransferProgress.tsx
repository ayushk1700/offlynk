"use client";
/**
 * FileTransferProgress — real-time progress UI for active file transfers.
 * Shows incoming and outgoing transfers with cancel support.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Download, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { incomingTransfers, TransferMeta } from "@/lib/webrtc/fileTransfer";

interface TransferDisplay {
  id: string;
  name: string;
  size: number;
  progress: number;
  direction: "in" | "out";
  status: "active" | "done" | "error";
}

// Module-level transfer registry for outgoing
export const outgoingTransfers = new Map<string, { name: string; size: number; progress: number }>();

export function useFileTransfers() {
  const [transfers, setTransfers] = useState<TransferDisplay[]>([]);

  useEffect(() => {
    const update = () => {
      const items: TransferDisplay[] = [];
      incomingTransfers.forEach((t) => {
        items.push({
          id: t.meta.id, name: t.meta.name, size: t.meta.size,
          progress: t.receivedCount / t.meta.totalChunks * 100,
          direction: "in", status: "active",
        });
      });
      outgoingTransfers.forEach((t, id) => {
        items.push({ id, name: t.name, size: t.size, progress: t.progress, direction: "out", status: t.progress >= 100 ? "done" : "active" });
      });
      setTransfers(items);
    };

    const interval = setInterval(update, 300);
    return () => clearInterval(interval);
  }, []);

  return transfers;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export function FileTransferBar() {
  const transfers = useFileTransfers();
  if (transfers.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 bg-card border-t border-border">
      <AnimatePresence>
        {transfers.slice(0, 3).map((t) => (
          <motion.div
            key={t.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center gap-3">
              {t.direction === "in"
                ? <Download className="w-4 h-4 text-primary shrink-0" />
                : <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-medium truncate">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    {Math.round(t.progress)}% · {fmtBytes(t.size)}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${t.progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
              {t.status === "done" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
