"use client";
/**
 * SOSButton — floating emergency SOS button.
 * Switches active chat to the broadcast channel and
 * opens a pre-filled alert message.
 */
import { useState } from "react";
import { useChatStore } from "@/store";
import { ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SOSButton() {
  const { setActiveChat, activeChatId } = useChatStore();
  const [pulse, setPulse] = useState(false);

  const handleSOS = () => {
    setPulse(true);
    setActiveChat("broadcast");
    setTimeout(() => setPulse(false), 600);
  };

  // Hide when already in broadcast
  if (activeChatId === "broadcast") return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleSOS}
        className={[
          "fixed bottom-6 right-4 z-40 w-12 h-12 rounded-full",
          "bg-destructive text-destructive-foreground shadow-lg",
          "flex items-center justify-center",
          "ring-4 ring-destructive/20",
          pulse ? "animate-ping-once" : "",
        ].join(" ")}
        title="Emergency Broadcast (SOS)"
      >
        <ShieldAlert className="w-5 h-5" />
      </motion.button>
    </AnimatePresence>
  );
}
