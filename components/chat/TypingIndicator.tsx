"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  peerName?: string;
  liveText?: string;
}

export default function TypingIndicator({ peerName, liveText }: Props) {
  const hasLive = !!liveText?.trim();

  return (
    <div className="flex items-end gap-2 px-3 py-1.5">
      <div className="max-w-[68%] flex flex-col items-start gap-1">
        {peerName && (
          <span className="text-[11px] text-muted-foreground ml-1 tracking-wide">
            {peerName}
          </span>
        )}

        <AnimatePresence mode="wait">
          {hasLive ? (
            /* ── Ambient / ghost outline ── */
            <motion.div
              key="ghost"
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="flex items-baseline px-3.5 py-2
                         rounded-[20px] rounded-bl-[5px]
                         border border-dashed border-border
                         text-[14px] leading-snug text-muted-foreground
                         break-words"
            >
              {liveText}
              <motion.span
                className="inline-block align-bottom w-[1.5px] h-[1em]
                           bg-muted-foreground rounded-sm ml-0.5"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.85, repeat: Infinity }}
              />
            </motion.div>
          ) : (
            /* ── Classic outline dot bubble ── */
            <motion.div
              key="dots"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.22, ease: [0.34, 1.5, 0.64, 1] }}
              className="flex items-center gap-[5px] px-4 py-3
                         rounded-[20px] rounded-bl-[5px]
                         border border-border
                         bg-transparent"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-[6px] h-[6px] rounded-full bg-muted-foreground"
                  animate={{
                    y: [0, -4, 0],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}