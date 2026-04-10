"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { EmailAuth } from "@/components/auth/EmailAuth";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { LocalChatProvider } from "@/components/connection/LocalChatProvider";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { AnimatePresence } from "framer-motion";

type AppState = "evaluating" | "auth" | "permissions" | "app";

export default function HomePage() {
  const { currentUser } = useUserStore();
  const { isAuthenticated, setAuth, setLoading } = useAuthStore();
  const { initialize } = useChatStore();

  // App routing state
  const [appState, setAppState] = useState<AppState>("evaluating");

  // Splash screen state (fixes the undefined error)
  const [appReady, setAppReady] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.warn);
    }
  }, []);

  // Determine app state (Auth -> Permissions -> App)
  useEffect(() => {
    const check = async () => {
      // 1. Rehydrate Chat Database
      await initialize();

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
  }, [currentUser, isAuthenticated, setAuth, setLoading]);

  return (
    <>
      <AnimatePresence>
        {!appReady && (
          <SplashScreen
            key="splash"
            onComplete={() => setAppReady(true)}
            duration={3000} // Plays the animation for 3 seconds
          />
        )}
      </AnimatePresence>

      {/* The actual application content renders beneath the splash screen once ready */}
      {appReady && (
        <>
          {appState === "auth" && (
            <EmailAuth
              onComplete={() => {
                const permsDone = sessionStorage.getItem("perms-done") === "1";
                setAppState(permsDone ? "app" : "permissions");
              }}
            />
          )}

          {appState === "permissions" && (
            <PermissionGate
              onDone={() => {
                sessionStorage.setItem("perms-done", "1");
                setAppState("app");
              }}
            />
          )}

          {/* Fix: Render the actual app shell here, not EmailAuth */}
          {appState === "app" && (
            <LocalChatProvider>
              <AppShell />
            </LocalChatProvider>
          )}
        </>
      )}
    </>
  );
}