"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Wifi, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const LOADING_MESSAGES = [
    "Establishing secure orbits...",
    "Discovering local constellations...",
    "Syncing encrypted matter...",
    "Ready for launch"
];

interface SplashScreenProps {
    onComplete?: () => void;
    duration?: number;
}

export function SplashScreen({ onComplete, duration = 4000 }: SplashScreenProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    // Cycle through the loading messages smoothly
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
        }, duration + 600);

        return () => {
            clearInterval(timer);
            clearTimeout(completeTimer);
        };
    }, [duration, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
        >
            {/* ── Deep Space Background ── */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Randomly placed twinkling stars */}
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={`star-${i}`}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 2 + 1 + "px",
                            height: Math.random() * 2 + 1 + "px",
                            top: Math.random() * 100 + "%",
                            left: Math.random() * 100 + "%",
                        }}
                        animate={{
                            opacity: [0.1, Math.random() * 0.8 + 0.2, 0.1],
                            scale: [1, 1.5, 1],
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* ── Nebula Glows ── */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.3, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[25rem] h-[25rem] bg-primary/10 rounded-full blur-[80px]"
                />
            </div>

            {/* ── Core Visual: The Constellation ── */}
            <div className="relative flex items-center justify-center w-80 h-80 mb-6">

                {/* Orbital Rings */}
                {[0, 1, 2].map((ring) => (
                    <motion.div
                        key={`orbit-${ring}`}
                        className="absolute rounded-full border border-primary/20"
                        style={{
                            width: `${(ring + 1) * 30}%`,
                            height: `${(ring + 1) * 30}%`,
                        }}
                        animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                        transition={{
                            duration: 10 + ring * 5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        {/* Planets/Nodes on the orbit */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary/80 rounded-full shadow-[0_0_10px_hsl(var(--primary))]" />
                        {ring === 2 && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-indigo-400/80 rounded-full shadow-[0_0_15px_#818cf8]" />
                        )}
                    </motion.div>
                ))}

                {/* Central Star Core */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeOut", type: "spring", bounce: 0.4 }}
                    className="relative z-10 w-20 h-20 rounded-full bg-black border border-primary/30 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.4)]"
                >
                    {/* Inner glowing core */}
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-primary/20 blur-md"
                    />

                    <Lock className="w-8 h-8 text-primary relative z-10" />

                    {/* Core Sparkle */}
                    <motion.div
                        className="absolute -top-1 -right-1 z-20 text-indigo-300"
                        animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    >
                        <Sparkles className="w-5 h-5 fill-indigo-300/20" />
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Brand Text ── */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="text-center z-10 flex flex-col items-center"
            >
                <h1 className="text-4xl font-extrabold tracking-widest text-white mb-3 flex items-center gap-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    OFFLYNK
                </h1>

                <div className="flex items-center justify-center gap-3 text-xs font-semibold tracking-wider text-white/50 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" /> E2E Encrypted
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <Wifi className="w-3.5 h-3.5" /> Decentralized
                </div>
            </motion.div>

            {/* ── Dynamic Status Text ── */}
            <div className="absolute bottom-16 h-6 w-full max-w-xs flex items-center justify-center z-10">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={messageIndex}
                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                        transition={{ duration: 0.4 }}
                        className={cn(
                            "text-xs absolute text-center w-full uppercase tracking-[0.2em] font-medium",
                            messageIndex === LOADING_MESSAGES.length - 1
                                ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                                : "text-white/40"
                        )}
                    >
                        {LOADING_MESSAGES[messageIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}