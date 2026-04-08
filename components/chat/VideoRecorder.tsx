"use client";
/**
 * VideoRecorder — WhatsApp-style video message.
 * Tap to start, tap stop icon to preview, send or discard.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Video, Square, Trash2, Play, Pause, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VideoMessageData {
  blobUrl: string;
  duration: number;
  mimeType: string;
  size: number;
}

interface RecorderProps {
  onSend: (data: VideoMessageData) => void;
  onCancel?: () => void;
}

export function VideoRecorder({ onSend, onCancel }: RecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [secs, setSecs] = useState(0);
  const [preview, setPreview] = useState<VideoMessageData | null>(null);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "environment" }, audio: true });
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setPreview({ blobUrl, duration: secs, mimeType, size: blob.size });
        setState("preview");
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(200);
      mediaRef.current = recorder;
      setState("recording");
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => {
        if (s >= 60) { stopRecording(); return s; } // max 60s
        return s + 1;
      }), 1000);
    } catch {
      setError("Camera/microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const send = () => {
    if (preview) { onSend(preview); setPreview(null); setState("idle"); setSecs(0); }
  };

  const discard = () => {
    if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    setPreview(null); setState("idle"); setSecs(0);
    onCancel?.();
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Record video message"
      >
        <Video className="w-5 h-5" />
      </button>
    );
  }

  if (state === "recording") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
        >
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          {/* Overlay controls */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-10 bg-gradient-to-t from-black/80 to-transparent pt-12">
            <div className="flex items-center gap-2 mb-6">
              <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <div className="w-3 h-3 rounded-full bg-destructive" />
              </motion.div>
              <span className="text-white font-mono text-lg font-bold">{fmtSecs(secs)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Square className="w-7 h-7 text-white fill-white" />
            </button>
            <p className="text-white/60 text-xs mt-3">Tap to stop</p>
          </div>
          {error && (
            <div className="absolute top-4 inset-x-4 bg-destructive/90 rounded-xl px-4 py-2 text-sm text-white text-center">{error}</div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (state === "preview" && preview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        <video
          ref={previewRef}
          src={preview.blobUrl}
          className="flex-1 object-contain"
          controls
          autoPlay
        />
        <div className="flex items-center justify-between px-6 py-6 bg-black">
          <button
            type="button" onClick={discard}
            className="flex items-center gap-2 text-white/70 hover:text-white"
          >
            <Trash2 className="w-6 h-6" />
          </button>
          <span className="text-white/60 text-sm font-mono">{fmtSecs(preview.duration)}</span>
          <button
            type="button" onClick={send}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <SendHorizonal className="w-6 h-6 text-primary-foreground" />
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}

/* ── VideoPlayer bubble ────────────────────────────────────── */
export function VideoPlayer({ blobUrl, duration }: { blobUrl: string; duration: number }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  return (
    <div className="relative rounded-xl overflow-hidden max-w-[220px] cursor-pointer" onClick={toggle}>
      <video ref={ref} src={blobUrl} className="w-full max-h-44 object-cover" onEnded={() => setPlaying(false)} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        {!playing && (
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        )}
      </div>
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
        {fmtSecs(duration)}
      </div>
    </div>
  );
}
