"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/helpers";
import { Message } from "@/store/chatStore";

interface Props {
  status: Message["status"];
  className?: string;
}

/**
 * MeshLink Status (Geometric Theme)
 * Visualizes the P2P connection state between two nodes.
 */
export function MeshLinkStatus({ status, className }: Props) {
  const isPending = status === "pending" || status === "sending";
  const isSent = status === "sent";
  const isDelivered = status === "delivered";
  const isRead = status === "read";

  return (
    <div className={cn("relative flex items-center gap-2 w-6 h-3", className)}>
      {/* Node A (Sender) */}
      <motion.div
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isRead ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground/40",
          (isSent || isDelivered || isRead) && "bg-primary/80"
        )}
        animate={isPending ? { scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* The Link (Mesh Line) */}
      <div className="flex-1 relative h-[1.5px] bg-muted-foreground/10 rounded-full overflow-hidden min-w-[12px]">
        {/* Growing Progress Line */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 bg-primary",
            isRead && "shadow-[0_0_4px_hsl(var(--primary))]"
          )}
          initial={{ width: 0 }}
          animate={{
            width: isPending ? "20%" : (isSent ? "60%" : "100%"),
            height: isRead ? "2.5px" : "1.5px",
            opacity: isRead ? 1 : 0.8
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Pulse effect for Read state */}
        {isRead && (
          <motion.div
            className="absolute inset-0 bg-primary/30"
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Node B (Peer) */}
      <motion.div
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isRead ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground/40",
          (isDelivered || isRead) && "bg-primary/80"
        )}
        animate={isPending ? { opacity: [0.2, 0.5, 0.2] } : { opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
      />
    </div>
  );
}
