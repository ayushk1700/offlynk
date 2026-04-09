"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Camera, X, FlipHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void;
}

export function CameraCapture({ onCapture }: Props) {
  const [mounted, setMounted]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [error, setError]         = useState("");
  const [facing, setFacing]       = useState<"user" | "environment">("environment");
  const [isFlashing, setIsFlashing] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setStreamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreamReady(true);
    } catch {
      setError("Camera access denied");
    }
  }, [facing]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreamReady(false);
  }, []);

  useEffect(() => {
    if (open) startCamera();
    else stopCamera();
    return stopCamera;
  }, [open, facing, startCamera, stopCamera]);

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setTimeout(() => {
        onCapture(blob, dataUrl);
        setOpen(false);
        stopCamera();
      }, 200);
    }, "image/jpeg", 0.92);
  };

  const handleClose = () => { stopCamera(); setOpen(false); };

  const cameraUI = (
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
            {/* Viewfinder */}
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm px-8 text-center">
                {error}
              </div>
            ) : (
              <>
                {!streamReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm animate-pulse z-10">
                    Starting camera…
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    !streamReady ? "hidden" : ""
                  } ${facing === "user" ? "scale-x-[-1]" : ""}`}
                />
              </>
            )}

            {/* Shutter flash */}
            <AnimatePresence>
              {isFlashing && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white z-30 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <canvas ref={canvasRef} className="hidden" />

            {/* Top bar — close button */}
            <div className="absolute top-0 inset-x-0 z-20 px-4 pt-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
                E2E Encrypted
              </span>
            </div>
            {/* Hard X close */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-10 pb-8 pt-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              {/* Cancel */}
              <button
                type="button"
                onClick={handleClose}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Shutter */}
              <button
                type="button"
                onClick={capture}
                disabled={!!error || !streamReady}
                className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                aria-label="Take photo"
              >
                <div className="w-14 h-14 rounded-full bg-white shadow-lg transition-transform active:scale-90" />
              </button>

              {/* Flip */}
              <button
                type="button"
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                disabled={!!error}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm disabled:opacity-40"
                aria-label="Flip camera"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>
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
        title="Take photo"
      >
        <Camera className="w-5 h-5" />
      </button>
      {mounted && createPortal(cameraUI, document.body)}
    </>
  );
}