"use client";
/**
 * EmojiPicker — lightweight, zero-dependency emoji picker
 * Organized into tabs. Inserted at cursor position in textarea.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  "😀": ["😀","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯"],
  "👍": ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👋","🤚","🖐️","✋","🖖","👏","🤲","🙌","🙏","✍️","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁️","👅","👄","💋","🩸"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💝","💘","💟","❤️‍🔥","❤️‍🩹","💯","💢","💥","💫","💦","💨","🕳️","💬","💭","💤","🔥","🌟","⭐","✨","🎉","🎊","🎈","🎁","🏆","🥇","🌈","☀️","🌙","⚡","🌊","💎"],
  "🐶": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟"],
  "🍕": ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥖","🫓","🥨","🧀","🥗","🥙","🌮","🌯","🫔","🥫","🍜","🍝","🍛","🍲","🍱","🍣","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🧁","🎂","🍰","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🫘"],
  "⚽": ["⚽","🏀","🏈","⚾","🥎","🏐","🏉","🥏","🎾","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🎯","🎱","🔫","🪀","🏓","🏸","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🏋️","🤸","⛹️","🤺","🤾","🏊","🚣","🧗","🚴","🏇","🤼","🤽","🤿","🎠","🎡"],
};

const CATEGORY_ICONS = Object.keys(EMOJI_CATEGORIES);

interface Props {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(CATEGORY_ICONS[0]);
  const ref = useRef<HTMLDivElement>(null);

  const emojis = EMOJI_CATEGORIES[cat as keyof typeof EMOJI_CATEGORIES] ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-lg"
        title="Emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-12 left-0 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Category tabs */}
              <div className="flex border-b border-border/60 overflow-x-auto">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setCat(icon)}
                    className={`shrink-0 px-3 py-2.5 text-lg transition-colors ${
                      cat === icon ? "bg-muted/60" : "hover:bg-muted/30"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-0 p-2 max-h-52 overflow-y-auto">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onSelect(emoji); setOpen(false); }}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-muted/50 rounded-lg transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
