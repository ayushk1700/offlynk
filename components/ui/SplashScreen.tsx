"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Wifi, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const LOADING_MESSAGES = [
    "Initializing cryptographic engine...",
    "Scanning for local mesh peers...",
    "Establishing secure tunnels...",
    "Synchronizing offline storage...",
    "Ready."
];

interface SplashScreenProps {
    onComplete?: () => void;
    duration?: number; // Total time before onComplete fires (if provided)
}

export function SplashScreen({ onComplete, duration = 3500 }: SplashScreenProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    // Cycle through the loading messages
    useEffect(() => {
        const messageInterval = duration / (LOADING_MESSAGES.length - 1);

        const timer = setInterval(() => {
            setMessageIndex((prev) => {
                if (prev === LOADING_MESSAGES.length - 1) {
                    clearInterval(timer);
                    return prev;
                }
                return prev + 1;
            });
        }, messageInterval);

        // Trigger completion callback
        const completeTimer = setTimeout(() => {
            onComplete?.();
        }, duration + 500); // Add a small buffer for the final text to be read

        return () => {
            clearInterval(timer);
            clearTimeout(completeTimer);
        };
    }, [duration, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background paper-texture overflow-hidden"
        >
            {/* ── Ambient Background Glows ── */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[100px]"
                />
            </div>

            {/* ── Core Visual: The Mesh Node ── */}
            <div className="relative flex items-center justify-center w-64 h-64 mb-12">

                {/* Pulsing Radar Rings */}
                {[1, 2, 3].map((ring) => (
                    <motion.div
                        key={`ring-${ring}`}
                        className="absolute border border-primary/20 rounded-full"
                        style={{ width: `${ring * 100}%`, height: `${ring * 100}%` }}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: [0, 0.5, 0] }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            delay: ring * 0.4,
                            ease: "easeOut",
                        }}
                    />
                ))}

                {/* Orbiting "Peers" */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute w-48 h-48 rounded-full border border-dashed border-primary/20"
                >
                    <motion.div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary/40 rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                    <motion.div className="absolute -bottom-1.5 left-1/4 w-3 h-3 bg-primary/60 rounded-full shadow-[0_0_10px_hsl(var(--primary))]" />
                    <motion.div className="absolute top-1/2 -right-2 w-5 h-5 bg-primary/30 rounded-full shadow-[0_0_20px_hsl(var(--primary))]" />
                </motion.div>

                {/* Central Logo Box */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-10 w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30"
                >
                    <Lock className="w-10 h-10 text-primary-foreground" />

                    {/* Sparkle attachment */}
                    <motion.div
                        className="absolute -top-2 -right-2 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center shadow-sm"
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <Sparkles className="w-4 h-4 text-primary/80" />
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Brand Text ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center z-10"
            >
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center justify-center gap-2">
                    OffLynk
                </h1>

                <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground/80 mb-8">
                    <ShieldCheck className="w-4 h-4" /> E2E Encrypted
                    <span className="w-1 h-1 bg-border rounded-full mx-1" />
                    <Wifi className="w-4 h-4" /> Decentralized
                </div>
            </motion.div>

            {/* ── Dynamic Status Text ── */}
            <div className="h-6 relative w-full max-w-xs flex items-center justify-center z-10">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={messageIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                            "text-sm absolute text-center w-full",
                            messageIndex === LOADING_MESSAGES.length - 1
                                ? "text-primary font-semibold"
                                : "text-muted-foreground font-mono text-xs uppercase tracking-widest"
                        )}
                    >
                        {LOADING_MESSAGES[messageIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}