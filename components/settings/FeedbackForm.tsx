"use client";
import { useState } from "react";
import { ArrowLeft, Send, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { saveFeedback } from "@/lib/firebase/profile";

const CATEGORIES = ["Bug Report", "Feature Request", "General Feedback", "Privacy Concern", "Other"];
const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "feedback@yourdomain.com";

interface Props { onBack: () => void; }

export function FeedbackForm({ onBack }: Props) {
  const [category, setCategory] = useState(CATEGORIES[2]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { uid } = useAuthStore();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      // Try Firestore first
      await saveFeedback(uid || "anonymous", message, category);
      setSent(true);
    } catch {
      // Fallback: open mailto
      const subject = encodeURIComponent(`[Off-Grid Chat] ${category}`);
      const body = encodeURIComponent(`${message}\n\n---\nUser: ${uid || "anonymous"}`);
      window.open(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`);
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg">Send Feedback</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary" />
            <h3 className="font-bold text-xl">Thank you!</h3>
            <p className="text-muted-foreground text-sm">Your feedback has been sent. It helps make Off-Grid Chat better.</p>
            <Button onClick={onBack} variant="outline">Back to Settings</Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      category === c ? "border-primary/50 bg-primary/10" : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 mb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Message</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your feedback, bug, or idea in detail…"
                className="w-full h-48 p-4 bg-card border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{message.length}/500</p>
            </div>

            <p className="text-[11px] text-muted-foreground opacity-60 mb-3">
              Feedback is stored securely in Firestore and sent to {FEEDBACK_EMAIL}. No personal data is shared without consent.
            </p>

            <Button
              className="w-full h-12 rounded-xl font-semibold"
              onClick={handleSubmit}
              disabled={!message.trim() || loading}
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Feedback
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
