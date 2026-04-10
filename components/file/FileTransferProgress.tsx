"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  File, FileText, ImageIcon, Video, Music, 
  Download, Upload, CheckCircle2, XCircle, X,
  FileArchive, ShieldCheck
} from "lucide-react";
import { incomingTransfers } from "@/lib/webrtc/fileTransfer";

interface TransferDisplay {
  id: string;
  name: string;
  size: number;
  progress: number;
  direction: "in" | "out";
  status: "active" | "done" | "error";
  mimeType: string;
  previewUrl?: string;
}

// Module-level transfer registry for outgoing (updated by chat service)
export const outgoingTransfers = new Map<string, { 
  name: string; 
  size: number; 
  progress: number; 
  mimeType: string;
  previewUrl?: string;
}>();

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * File Icon Selector based on MIME type
 */
function FileIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith("image/")) return <ImageIcon className={className} />;
  if (mime.startsWith("video/")) return <Video className={className} />;
  if (mime.startsWith("audio/")) return <Music className={className} />;
  if (mime.includes("pdf")) return <FileText className={className} />;
  if (mime.includes("zip") || mime.includes("rar")) return <FileArchive className={className} />;
  return <File className={className} />;
}

/**
 * Liquid Progress Bubble
 * Uses the Gooey SVG filter for an organic, metallic feel.
 */
function LiquidMetalBubble({ progress, active, previewUrl, mimeType }: { progress: number; active: boolean; previewUrl?: string; mimeType: string }) {
  const isImage = mimeType.startsWith("image/");

  return (
    <div className="relative w-14 h-14 flex items-center justify-center filter-gooey shrink-0">
      {/* Background Pulse */}
      {active && (
        <motion.div
          className="absolute inset-0 bg-primary/25 rounded-full"
          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      {/* The Liquid Blob */}
      <motion.div
        className="relative w-11 h-11 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_12px_rgba(0,0,0,0.4)]"
        animate={{
          borderRadius: [
            "42% 58% 70% 30% / 45% 45% 55% 55%",
            "58% 42% 38% 62% / 55% 55% 45% 45%",
            "45% 55% 50% 50% / 40% 60% 40% 60%",
            "42% 58% 70% 30% / 45% 45% 55% 55%"
          ],
          scale: active ? 1 + (progress / 800) : 1
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{
          background: isImage && previewUrl 
            ? `url(${previewUrl}) center/cover no-repeat` 
            : "linear-gradient(135deg, #f4f4f5 0%, #a1a1aa 50%, #52525b 100%)"
        }}
      >
        {/* Metallic Sheen Overlay for images */}
        {isImage && previewUrl && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-black/20 mix-blend-overlay" />
        )}
      </motion.div>
      
      {/* Progress Ring (Liquid outline) */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <motion.circle
          cx="28" cy="28" r="23"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-primary/30"
          strokeDasharray="144"
          animate={{ strokeDashoffset: 144 - (144 * progress) / 100 }}
          transition={{ duration: 0.5 }}
        />
      </svg>

      {/* Text Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[9px] font-black dark:text-zinc-900 text-white drop-shadow-md">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export function FileTransferBar() {
  const [transfers, setTransfers] = useState<TransferDisplay[]>([]);

  useEffect(() => {
    const update = () => {
      const items: TransferDisplay[] = [];
      
      // Hook into incoming transfers
      incomingTransfers.forEach((t) => {
        items.push({
          id: t.meta.id,
          name: t.meta.name,
          size: t.meta.size,
          progress: (t.receivedCount / t.meta.totalChunks) * 100,
          direction: "in",
          status: "active",
          mimeType: t.meta.mimeType
        });
      });

      // Hook into outgoing transfers
      outgoingTransfers.forEach((v, k) => {
        items.push({
          id: k,
          name: v.name,
          size: v.size,
          progress: v.progress,
          direction: "out",
          status: v.progress >= 100 ? "done" : "active",
          mimeType: v.mimeType,
          previewUrl: v.previewUrl
        });
      });

      setTransfers(items);
    };

    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, []);

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 pointer-events-none flex justify-end">
      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        <AnimatePresence>
          {transfers.slice(0, 3).map((t) => (
            <motion.div
              key={t.id}
              initial={{ x: 50, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
              className="pointer-events-auto group relative overflow-hidden bg-card/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 animate-ink"
            >
              {/* Progress Liquid Metal Bubble */}
              <LiquidMetalBubble 
                progress={t.progress} 
                active={t.status === "active"}
                previewUrl={t.previewUrl}
                mimeType={t.mimeType}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileIcon mime={t.mimeType} className="w-3 h-3 text-muted-foreground/70" />
                  <h4 className="text-[12px] font-bold truncate tracking-tight">{t.name}</h4>
                </div>
                
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                  {t.direction === "in" ? (
                    <span className="flex items-center text-indigo-400">
                      <Download className="w-2 h-2 mr-1" /> Inbound
                    </span>
                  ) : (
                    <span className="flex items-center text-teal-400">
                      <Upload className="w-2 h-2 mr-1" /> Outbound
                    </span>
                  )}
                  <span>•</span>
                  <span>{fmtBytes(t.size)}</span>
                </div>
              </div>

              {/* Status Indicator / Cancel */}
              <div className="shrink-0 pr-1">
                {t.status === "done" ? (
                  <motion.div
                    initial={{ rotate: -90, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="p-1 bg-primary/20 rounded-full"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary shadow-sm" />
                  </motion.div>
                ) : (
                  <button 
                    onClick={() => { /* Cancel */ }}
                    className="p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Advanced Read Receipt Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/20">
                <motion.div
                  className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  initial={{ width: 0 }}
                  animate={{ width: `${t.progress}%` }}
                />
              </div>
              
              {/* Liquid Gloss Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent rounded-2xl" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Exported hook for other components to use
export function useFileTransfers() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const check = () => {
      setCount(incomingTransfers.size + outgoingTransfers.size);
    };
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
