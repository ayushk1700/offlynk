"use client";
/**
 * VoiceRecorder — WhatsApp-style voice message recorder.
 * Hold mic button → records audio → release → sends as voice message.
 * Also plays received voice messages with waveform visualizer.
 */
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Play, Pause, Square, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VoiceMessageData {
  blobUrl: string;
  duration: number;   // seconds
  mimeType: string;
}

/* ────────────────────────────────────────────────────────────
 * VoiceRecorder — the record button in MessageInput
 * ────────────────────────────────────────────────────────────*/
interface RecorderProps {
  onSend: (data: VoiceMessageData) => void;
  onCancel?: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: RecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [secs, setSecs] = useState(0);
  const [preview, setPreview] = useState<VoiceMessageData | null>(null);
  const [error, setError] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        setPreview({ blobUrl, duration: secs, mimeType });
        setState("preview");
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(100);
      mediaRef.current = recorder;
      setState("recording");
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied");
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
        onMouseDown={startRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Hold to record voice message"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-1.5">
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
        </motion.div>
        <span className="text-sm font-mono text-destructive">{fmtSecs(secs)}</span>
        <button type="button" onClick={stopRecording} className="ml-1 text-muted-foreground hover:text-foreground">
          <Square className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (state === "preview" && preview) {
    return (
      <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-1.5">
        <VoicePlayer blobUrl={preview.blobUrl} duration={preview.duration} compact />
        <button type="button" onClick={discard} className="text-muted-foreground hover:text-destructive ml-1">
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button" onClick={send}
          className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs font-semibold"
        >
          Send
        </button>
      </div>
    );
  }

  return null;
}

/* ────────────────────────────────────────────────────────────
 * VoicePlayer — plays received voice messages in a bubble
 * ────────────────────────────────────────────────────────────*/
interface PlayerProps {
  blobUrl: string;
  duration: number;
  compact?: boolean;
}

export function VoicePlayer({ blobUrl, duration, compact = false }: PlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSecs, setCurrentSecs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(blobUrl);
      audio.ontimeupdate = () => {
        setCurrentSecs(Math.round(audio.currentTime));
        setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = () => { setPlaying(false); setProgress(0); setCurrentSecs(0); };
      audioRef.current = audio;
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "min-w-[180px]"}`}>
      <button
        type="button" onClick={toggle}
        className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center shrink-0 transition-colors"
      >
        {playing ? <Pause className="w-3.5 h-3.5 text-primary" /> : <Play className="w-3.5 h-3.5 text-primary" />}
      </button>

      {!compact && (
        <div className="flex-1 min-w-0">
          {/* Fake waveform visual */}
          <div className="flex items-center gap-px h-6">
            {Array.from({ length: 30 }).map((_, i) => {
              const h = [3,5,8,6,10,7,4,9,5,7,8,6,4,10,7,5,8,6,3,7,9,5,7,4,8,6,5,9,7,4][i] ?? 5;
              const filled = (i / 30) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-colors ${filled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  style={{ height: `${h * 2}px` }}
                />
              );
            })}
          </div>
        </div>
      )}

      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
        {playing ? fmtSecs(currentSecs) : fmtSecs(duration)}
      </span>
    </div>
  );
}
