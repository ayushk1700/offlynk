"use client";

import { useState } from "react";
import { useUserStore } from "@/store";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function AnonymousToggle() {
  const { currentUser, setCurrentUser } = useUserStore();
  const [anonymous, setAnonymous] = useState(false);

  const handleToggle = (val: boolean) => {
    setAnonymous(val);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: val ? "Anonymous" : currentUser.name,
      });
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className="flex items-center gap-2 flex-1 text-sm">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span>Anonymous Mode</span>
      </div>
      <div className="flex items-center gap-2">
        {anonymous ? (
          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Switch checked={anonymous} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
}
