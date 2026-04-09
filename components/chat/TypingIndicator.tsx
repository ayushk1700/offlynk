"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Name of the peer who is typing */
  peerName?: string;
  /** Live partial text being typed (ambient typing) */
  liveText?: string;
}

/**
 * TypingIndicator
 *
 * Two modes:
 *  - Classic (no liveText): animated three-dot bounce bubble.
 *  - Ambient (liveText present): shows the text being typed with a
 *    blinking cursor, giving a "ghost preview" effect.
 */
export default function TypingIndicator({ peerName, liveText }: Props) {
  const hasLive = liveText && liveText.trim().length > 0;

  return (
    <div className="flex items-end gap-2 px-4 py-1.5">
      {/* Avatar placeholder dot */}
      <div className="w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center shrink-0 mb-1">
        <span className="text-[9px] font-bold text-muted-foreground">
          {peerName ? peerName.charAt(0).toUpperCase() : "?"}
        </span>
      </div>

      <div className="max-w-[75%]">
        {/* Peer name label */}
        {peerName && (
          <p className="text-[10px] text-muted-foreground mb-1 ml-1">{peerName}</p>
        )}

        <motion.div
          layout
          className={`bg-card border border-border/80 rounded-2xl rounded-bl-sm overflow-hidden ${
            hasLive ? "px-3.5 py-2.5" : "px-4 py-3"
          }`}
        >
          <AnimatePresence mode="wait">
            {hasLive ? (
              /* ── Ambient text mode ── */
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-baseline gap-0"
              >
                <p className="text-sm text-foreground/80 leading-snug break-words whitespace-pre-wrap">
                  {liveText}
                </p>
                {/* Blinking cursor */}
                <motion.span
                  className="inline-block w-[2px] h-[1em] bg-primary/70 ml-px rounded-full"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : (
              /* ── Classic three-dot bounce mode ── */
              <motion.div
                key="dots"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-1 items-center"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
