"use client";

import { motion } from "framer-motion";
import { Search, User } from "lucide-react";

export function Radar({ className = "" }: { className?: string }) {
    return (
        <div className={`relative w-64 h-64 flex items-center justify-center ${className}`}>
            {/* Pulsing circles */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0.1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.8,
                        ease: "easeOut"
                    }}
                    className="absolute inset-0 border border-primary/40 rounded-full"
                />
            ))}

            {/* Scanning line */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-1/2 h-1/2 origin-bottom-right top-0 left-0 border-r border-primary/30"
                style={{
                    background: "conic-gradient(from 0deg, transparent, rgba(var(--primary-rgb), 0.1))"
                }}
            />

            {/* Core icon */}
            <div className="relative z-10 w-12 h-12 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center border border-primary/30 shadow-2xl">
                <Search className="w-6 h-6 text-primary" />
            </div>

            {/* Simulated "Peers" appearing */}
            <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute top-10 right-10 flex flex-col items-center"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-emerald-500 mt-1">PEER_NEARBY</span>
            </motion.div>
        </div>
    );
}
