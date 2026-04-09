"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Video, X, Square, Send, FlipHorizontal, Trash2, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VideoMessageData {
  blobUrl: string;
  mimeType: string;
  duration: number;
  size: number;
}

interface Props {
  onSend: (data: VideoMessageData) => void;
}

export function VideoRecorder({ onSend }: Props) {
  const [mounted, setMounted]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [recording, setRecording]   = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [facing, setFacing]         = useState<"user" | "environment">("user");
  const [streamReady, setStreamReady] = useState(false);
  const [duration, setDuration]     = useState(0);
  const [playing, setPlaying]       = useState(false);

  const videoRef         = useRef<HTMLVideoElement>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef       = useRef("");

  useEffect(() => {
    setMounted(true);
    return () => stopCamera();
  }, []);

  /* ── Camera lifecycle ── */
  const startCamera = useCallback(async () => {
    setStreamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      setStreamReady(true);
    } catch (err) {
      console.error("Camera denied", err);
    }
  }, [facing]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreamReady(false);
  }, []);

  useEffect(() => {
    if (open && !recordedBlob) startCamera();
    if (!open) stopCamera();
  }, [open, facing, recordedBlob, startCamera, stopCamera]);

  /* ── Recording ── */
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
      ? "video/webm; codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      blobUrlRef.current = URL.createObjectURL(blob);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = blobUrlRef.current;
        videoRef.current.controls = false;
        videoRef.current.muted = false;
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopCamera();
  };

  /* ── Actions ── */
  const handleSend = () => {
    if (!recordedBlob) return;
    onSend({ blobUrl: blobUrlRef.current, mimeType: recordedBlob.type, duration, size: recordedBlob.size });
    closeAll();
  };

  const handleDiscard = () => {
    // go back to camera preview to re-record
    if (videoRef.current) { videoRef.current.src = ""; videoRef.current.srcObject = null; }
    setRecordedBlob(null);
    setDuration(0);
    setPlaying(false);
    blobUrlRef.current = "";
  };

  const closeAll = () => {
    stopRecording();
    stopCamera();
    handleDiscard();
    setOpen(false);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else         { v.play();  setPlaying(true);  }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ── Modal ── */
  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{ scale: 0.92,    y: 16, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[340px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{ aspectRatio: "9/16", maxHeight: "78vh" }}
          >
            {/* ── Video element (preview + playback) ── */}
            {!streamReady && !recordedBlob && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm animate-pulse z-10">
                Starting camera…
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              onEnded={() => setPlaying(false)}
              className={`absolute inset-0 w-full h-full object-cover ${
                facing === "user" && !recordedBlob ? "scale-x-[-1]" : ""
              } ${!streamReady && !recordedBlob ? "hidden" : ""}`}
            />

            {/* ── Top bar ── */}
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <span className="text-white/70 text-[11px] font-semibold tracking-wider uppercase">
                E2E Video
              </span>
              {(recording || recordedBlob) && (
                <span className={`font-mono text-sm px-2 py-0.5 rounded-full ${recording ? "bg-red-500/80 text-white animate-pulse" : "bg-black/40 text-white/80"}`}>
                  {fmt(duration)}
                </span>
              )}
            </div>

            {/* ── Bottom controls ── */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-6 pb-7 pt-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">

              {/* Left: Close / Discard */}
              <button
                type="button"
                onClick={recordedBlob ? handleDiscard : closeAll}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                title={recordedBlob ? "Discard & re-record" : "Cancel"}
              >
                {recordedBlob ? <Trash2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>

              {/* Center: Main action */}
              {!recordedBlob ? (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!streamReady}
                  className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  {recording
                    ? <Square className="w-8 h-8 text-red-500 fill-red-500" />
                    : <div className="w-14 h-14 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-primary/40"
                >
                  <Send className="w-8 h-8 text-primary-foreground ml-1" />
                </button>
              )}

              {/* Right: Flip camera OR Play/Pause for playback */}
              {recordedBlob ? (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                  title="Play / Pause"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  disabled={recording}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm disabled:opacity-0"
                  title="Flip camera"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* ── Hard close (X) ── */}
            <button
              type="button"
              onClick={closeAll}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
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
        title="Record Video"
      >
        <Video className="w-5 h-5" />
      </button>
      {mounted && createPortal(modal, document.body)}
    </>
  );
}