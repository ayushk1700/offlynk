"use client";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, CheckCheck, Clock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/lib/firebase/profile";

interface Props { onBack: () => void; }

export function PrivacySettings({ onBack }: Props) {
  const { uid, privacyLastSeen, privacyReadReceipts, updatePrivacy, profile } = useAuthStore();

  const save = async (key: string, value: unknown) => {
    updatePrivacy(key as "privacyReadReceipts" | "privacyLastSeen", value as string | boolean);
    if (uid) await updateProfile(uid, { [key]: value });
  };

  const Option = ({ label, desc, value, selected, onSelect }: {
    label: string; desc?: string; value: string; selected: boolean; onSelect: () => void;
  }) => (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-muted-foreground/30"}`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </button>
  );

  const Toggle = ({ label, desc, icon, checked, onChange }: {
    label: string; desc?: string; icon: React.ReactNode; checked: boolean; onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/30 transition-colors text-left"
    >
      <span className="text-primary shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold text-lg">Privacy</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Last Seen */}
        <div className="mt-4 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 pb-2">Last Seen & Online</p>
          <div className="bg-card border-y border-border divide-y divide-border/50">
            {(["everyone", "contacts", "nobody"] as const).map((v) => (
              <Option
                key={v} value={v}
                label={v.charAt(0).toUpperCase() + v.slice(1)}
                desc={v === "nobody" ? "Nobody will see when you were last online" : undefined}
                selected={privacyLastSeen === v}
                onSelect={() => save("privacyLastSeen", v)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground px-4 pt-2 opacity-60">
            If you don't share your last seen, you won't be able to see others' last seen.
          </p>
        </div>

        {/* Read Receipts */}
        <div className="mt-4 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 pb-2">Messages</p>
          <div className="bg-card border-y border-border">
            <Toggle
              label="Read Receipts"
              desc="If turned off, you won't send or receive read receipts. Group chats always send read receipts."
              icon={<CheckCheck className="w-4 h-4" />}
              checked={privacyReadReceipts}
              onChange={() => save("privacyReadReceipts", !privacyReadReceipts)}
            />
          </div>
        </div>

        {/* Profile Photo */}
        <div className="mt-4 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 pb-2">Profile Photo</p>
          <div className="bg-card border-y border-border divide-y divide-border/50">
            {(["everyone", "contacts", "nobody"] as const).map((v) => (
              <Option
                key={v} value={v}
                label={v.charAt(0).toUpperCase() + v.slice(1)}
                selected={(profile?.privacyPhoto || "everyone") === v}
                onSelect={() => save("privacyPhoto", v)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
