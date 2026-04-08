"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";
import { PhoneAuth } from "@/components/auth/PhoneAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { LocalChatProvider } from "@/components/connection/LocalChatProvider";
import { isFirebaseConfigured } from "@/lib/firebase";

type AppState = "loading" | "auth" | "permissions" | "app";

export default function HomePage() {
  const { currentUser } = useUserStore();
  const { isAuthenticated, setAuth, setLoading } = useAuthStore();
  const [appState, setAppState] = useState<AppState>("loading");
  const [permDone, setPermDone] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.warn);
    }
  }, []);

  // Determine app state
  useEffect(() => {
    const check = async () => {
      // If no local identity → go to auth
      if (!currentUser) {
        setAppState("auth");
        setLoading(false);
        return;
      }

      // Local identity exists but no Firebase auth — set a local auth token
      if (!isAuthenticated) {
        setAuth(currentUser.id, "local");
      }

      // Check if permissions were already granted
      const permsDone = sessionStorage.getItem("perms-done") === "1";
      if (!permsDone) {
        setAppState("permissions");
      } else {
        setAppState("app");
      }
      setLoading(false);
    };

    // Small delay for hydration
    const t = setTimeout(check, 200);
    return () => clearTimeout(t);
  }, [currentUser, isAuthenticated]);

  if (appState === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background paper-texture">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Off-Grid Chat…</p>
        </div>
      </div>
    );
  }

  if (appState === "auth") {
    return (
      <PhoneAuth
        onComplete={() => {
          const permsDone = sessionStorage.getItem("perms-done") === "1";
          setAppState(permsDone ? "app" : "permissions");
        }}
      />
    );
  }

  if (appState === "permissions") {
    return (
      <PermissionGate
        onDone={() => {
          sessionStorage.setItem("perms-done", "1");
          setAppState("app");
        }}
      />
    );
  }

  return (
    <LocalChatProvider>
      <AppShell />
    </LocalChatProvider>
  );
}
