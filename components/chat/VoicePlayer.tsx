"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Mic, Square, Trash2, Send, Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

export interface VoiceMessageData {
  blobUrl: string;
  mimeType: string;
  duration: number;
}

interface RecorderProps {
  onSend: (data: VoiceMessageData) => void;
}

export interface VoicePlayerProps {
  blobUrl: string;
  duration: number;
}

/* -------------------------------------------------------------------------- */
/* WAVEFORM BAR HEIGHTS (decorative)                                           */
/* -------------------------------------------------------------------------- */
const WAVE = [2, 4, 6, 8, 5, 9, 7, 5, 8, 6, 4, 7, 9, 6, 4, 3, 6, 8, 5, 7];

/* -------------------------------------------------------------------------- */
/* 1. VOICE RECORDER                                                           */
/* -------------------------------------------------------------------------- */

export function VoiceRecorder({ onSend }: RecorderProps) {
  const [mounted, setMounted]  = useState(false);
  const [open, setOpen]        = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [playback, setPlayback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef       = useRef<string>("");

  useEffect(() => { setMounted(true); }, []);

  /* ── Start recording immediately when modal opens ── */
  useEffect(() => {
    if (open && !recordedBlob) startRecording();
    return () => {
      if (!open) stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm; codecs=opus")
        ? "audio/webm; codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        blobUrlRef.current = URL.createObjectURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error("Mic access denied", err);
      setOpen(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stopEverything = () => {
    stopRecording();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayback(false);
    setRecordedBlob(null);
    setDuration(0);
  };

  const handleClose = () => {
    stopEverything();
    setOpen(false);
  };

  const handleDiscard = () => {
    // Discard recorded audio and start fresh
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayback(false);
    setRecordedBlob(null);
    blobUrlRef.current = "";
    setDuration(0);
    // Re-start recording
    startRecording();
  };

  const handleSend = () => {
    if (!recordedBlob) return;
    onSend({ blobUrl: blobUrlRef.current, mimeType: recordedBlob.type, duration });
    stopEverything();
    setOpen(false);
  };

  const togglePlayback = () => {
    if (!blobUrlRef.current) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrlRef.current);
      audioRef.current.onended = () => setPlayback(false);
    }
    if (playback) {
      audioRef.current.pause();
      setPlayback(false);
    } else {
      audioRef.current.play();
      setPlayback(true);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ── Modal UI ── */
  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-xs bg-card border border-border rounded-3xl shadow-2xl p-6 flex flex-col items-center"
          >
            {/* Close (X) button — top right */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-5">
              {recordedBlob ? "Review & Send" : "Recording…"}
            </p>

            {/* Timer */}
            <div className={`text-5xl font-mono font-light tabular-nums mb-5 ${recording ? "text-red-500" : "text-foreground"}`}>
              {fmt(duration)}
            </div>

            {/* Waveform */}
            <div className="flex items-end gap-[3px] h-10 mb-6">
              {WAVE.map((h, i) => (
                <motion.div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    recording ? "bg-red-500/80" : recordedBlob ? "bg-primary/70" : "bg-muted-foreground/30"
                  }`}
                  animate={recording ? { height: [`${h * 3}px`, `${h * 4.5}px`, `${h * 3}px`] } : { height: `${h * 3}px` }}
                  transition={{ duration: 0.5 + i * 0.05, repeat: recording ? Infinity : 0, ease: "easeInOut" }}
                />
              ))}
            </div>

            {/* Actions */}
            {!recordedBlob ? (
              /* Recording — only stop button */
              <div className="flex items-center justify-center gap-4 w-full">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="w-12 h-12 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
                <div className="w-12 h-12" /> {/* spacer */}
              </div>
            ) : (
              /* Recorded — playback / discard / send */
              <div className="flex items-center justify-center gap-4 w-full">
                {/* Discard & re-record */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDiscard}
                  className="w-12 h-12 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Discard & re-record"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>

                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="w-16 h-16 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-all active:scale-95 border border-border"
                >
                  {playback ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>

                {/* Send */}
                <button
                  type="button"
                  onClick={handleSend}
                  className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 transition-all active:scale-95"
                  title="Send voice message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Status label */}
            <p className="text-xs text-muted-foreground mt-4">
              {recording ? "Tap square to stop" : recordedBlob ? "Play, then send or discard" : ""}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Record Voice Message"
      >
        <Mic className="w-5 h-5" />
      </button>
      {mounted && createPortal(modal, document.body)}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. VOICE PLAYER (Chat Bubble Playback)                                      */
/* -------------------------------------------------------------------------- */

export function VoicePlayer({ blobUrl, duration }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const togglePlay = () => {
    if (!audioRef.current) audioRef.current = new Audio(blobUrl);
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    } else {
      audio.play();
      setIsPlaying(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      audio.onended = () => {
        setIsPlaying(false);
        setElapsed(0);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
      >
        {isPlaying
          ? <Pause className="w-4 h-4 text-current" />
          : <Play  className="w-4 h-4 text-current ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex items-end gap-[2px] h-5 flex-1">
        {WAVE.map((h, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full bg-current transition-opacity ${isPlaying ? "opacity-80 animate-pulse" : "opacity-40"}`}
            style={{ height: `${h * 20}%` }}
          />
        ))}
      </div>

      <span className="text-[11px] font-mono opacity-70 shrink-0">
        {fmt(isPlaying ? elapsed : duration)}
      </span>
    </div>
  );
}