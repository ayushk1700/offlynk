"use client";
/**
 * CameraCapture — tap the camera icon to take a photo and send it.
 * Uses getUserMedia → shows viewfinder → captures frame to canvas → JPEG blob.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, ZoomIn, FlipHorizontal, Aperture } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onCapture: (blob: Blob, dataUrl: string) => void;
}

export function CameraCapture({ onCapture }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera access denied");
    }
  }, [facing]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (open) startCamera();
    else stopCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onCapture(blob, dataUrl);
      setOpen(false);
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Take photo"
      >
        <Camera className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Viewfinder */}
            {error ? (
              <div className="flex-1 flex items-center justify-center text-white text-sm">{error}</div>
            ) : (
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={`flex-1 object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
              />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="absolute inset-x-0 bottom-0 pb-safe flex items-center justify-between px-6 py-8 bg-gradient-to-t from-black/80 to-transparent">
              {/* Close */}
              <Button
                variant="ghost" size="icon"
                onClick={() => { setOpen(false); stopCamera(); }}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Capture */}
              <button
                type="button"
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 active:scale-95 transition-all"
              >
                <div className="w-full h-full rounded-full bg-white/50" />
              </button>

              {/* Flip */}
              <Button
                variant="ghost" size="icon"
                onClick={() => setFacing((f) => f === "user" ? "environment" : "user")}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <FlipHorizontal className="w-6 h-6" />
              </Button>
            </div>

            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3">
              <span className="text-white text-xs bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
                <Aperture className="w-3 h-3" /> E2E Encrypted
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
