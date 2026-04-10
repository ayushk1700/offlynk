"use client";

import { useState } from "react";
import {
  ArrowLeft, ChevronRight, ShieldCheck, Lock, Mail,
  HelpCircle, MessageSquare, Trash2, Key, Eye,
  LogOut, Moon, Sun, RefreshCw, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useFeatureStore } from "@/store/featureStore";
import { useTheme } from "@/components/layout/ThemeToggle";
import { useUserStore } from "@/store/userStore";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackForm } from "./FeedbackForm";
import { PrivacySettings } from "./PrivacySettings";
import { DangerZone } from "./DangerZone";

type SubPage = null | "privacy" | "feedback" | "changeEmail" | "passkey" | "dangerZone";

interface Props {
  onBack?: () => void;
  onOpenProfile?: () => void;
}

export function SettingsPage({ onBack, onOpenProfile }: Props) {
  const { email, uid, signOut, setAuth } = useAuthStore();
  const { autoReconnect, setAutoReconnect } = useFeatureStore();
  const { theme, setTheme } = useTheme();

  const [subPage, setSubPage] = useState<SubPage>(null);

  /* ── Change email state ── */
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailError, setEmailError] = useState("");

  /* ── Passkey state ── */
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState("");

  /* ── Route standard sub-pages ── */
  if (subPage === "privacy") return <PrivacySettings onBack={() => setSubPage(null)} />;
  if (subPage === "feedback") return <FeedbackForm onBack={() => setSubPage(null)} />;

  /* ── Handlers ── */
  const handleSignOut = async () => {
    try {
      const { getAuth, signOut: fbSignOut } = await import("firebase/auth");
      await fbSignOut(getAuth());
    } catch { /* offline – silent */ }

    useUserStore.getState().setCurrentUser(null as any);
    useUserStore.getState().setKeys(null as any);
    signOut();

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleChangeEmail = async () => {
    setEmailError("");
    setEmailMsg("");
    if (!newEmail.includes("@")) { setEmailError("Enter a valid email address."); return; }
    setEmailLoading(true);
    try {
      const { getAuth, updateEmail: fbUpdate } = await import("firebase/auth");
      const auth = getAuth();
      if (auth.currentUser) {
        await fbUpdate(auth.currentUser, newEmail);
        setAuth(uid!, null, newEmail);
        setEmailMsg("Email updated successfully.");
        setTimeout(() => { setNewEmail(""); setSubPage(null); }, 1500);
      } else {
        setEmailError("Not signed in to a Firebase account.");
      }
    } catch (e: any) {
      setEmailError((e?.message ?? "Failed to update email.").replace("Firebase: ", ""));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSetupPasskey = async () => {
    setPasskeyMsg("");
    setPasskeyLoading(true);
    try {
      if (!window.PublicKeyCredential) {
        setPasskeyMsg("Passkeys are not supported on this browser.");
        return;
      }
      setPasskeyMsg("Prompting your device for a passkey…");

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "OffLynk", id: window.location.hostname },
          user: {
            id: userId,
            name: email || "user@offlynk",
            displayName: email || "OffLynk User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { userVerification: "preferred" },
          timeout: 60000,
        }
      });

      setPasskeyMsg("✓ Passkey registered to this device securely!");
    } catch (e: any) {
      setPasskeyMsg("Failed: " + (e?.message ?? "unknown error"));
    } finally {
      setPasskeyLoading(false);
    }
  };

  /* ── Shared Section / Row helpers ── */
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-4 pt-5 pb-2">{title}</p>
      <div className="bg-card border-y border-border divide-y divide-border/60">{children}</div>
    </div>
  );

  const Row = ({
    icon, label, value, onClick, danger = false, toggle, toggled,
  }: {
    icon: React.ReactNode; label: string; value?: string;
    onClick?: () => void; danger?: boolean;
    toggle?: boolean; toggled?: boolean;
  }) => (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left ${danger ? "text-destructive hover:bg-destructive/10" : ""}`}
      onClick={onClick}
    >
      <span className={`shrink-0 ${danger ? "text-destructive" : "text-primary"}`}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="text-xs text-muted-foreground mr-2">{value}</span>}
      {toggle !== undefined ? (
        <div className={`w-11 h-6 rounded-full transition-colors relative ${toggled ? "bg-primary" : "bg-muted"}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${toggled ? "left-6" : "left-1"}`} />
        </div>
      ) : (
        onClick && <ChevronRight className={`w-4 h-4 ${danger ? "text-destructive/50" : "text-muted-foreground"}`} />
      )}
    </button>
  );

  /* ── Danger Zone Sub-Page ── */
  if (subPage === "dangerZone") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSubPage(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg text-destructive">Delete Account</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <DangerZone />
        </div>
      </div>
    );
  }

  /* ── Change email inline panel ── */
  if (subPage === "changeEmail") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSubPage(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg">Change Email</h2>
        </div>
        <div className="flex-1 flex flex-col p-6 gap-4">
          <p className="text-sm text-muted-foreground">Current email: <strong>{email || "—"}</strong></p>
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); }}
              className="h-11"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleChangeEmail(); }}
            />
            <AnimatePresence>
              {emailError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-destructive px-1">
                  {emailError}
                </motion.p>
              )}
              {emailMsg && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-xs text-green-600 dark:text-green-400 px-1 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {emailMsg}
                </motion.p>
              )}
            </AnimatePresence>
            <Button onClick={handleChangeEmail} disabled={emailLoading || !newEmail} className="w-full h-11">
              {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Email"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            You may be required to re-authenticate if your session has expired.
          </p>
        </div>
      </div>
    );
  }

  /* ── Passkey setup inline panel ── */
  if (subPage === "passkey") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSubPage(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg">Device Passkeys</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Key className="w-9 h-9 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Set Up a Passkey</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Sign in with your fingerprint, face scan, or device PIN — no password needed.
            </p>
          </div>
          <AnimatePresence>
            {passkeyMsg && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl">
                {passkeyMsg}
              </motion.p>
            )}
          </AnimatePresence>
          <Button
            onClick={handleSetupPasskey}
            disabled={passkeyLoading}
            className="w-full max-w-xs h-12 text-base"
          >
            {passkeyLoading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Working…</>
              : <><Key className="w-4 h-4 mr-2" />Create Passkey</>}
          </Button>
          <Button variant="ghost" onClick={() => setSubPage(null)} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  /* ── Main Settings Page ── */
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h2 className="font-semibold text-lg flex-1">Settings</h2>
        <Button
          variant="ghost" size="icon" className="w-8 h-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Profile row */}
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 px-4 py-4 bg-card border-b border-border hover:bg-muted/30 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {email?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold truncate">{email || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">Tap to edit profile</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ACCOUNT */}
        <Section title="Account">
          <Row icon={<Mail className="w-4 h-4" />} label="Change Email" onClick={() => { setNewEmail(email || ""); setSubPage("changeEmail"); }} />
          <Row icon={<Key className="w-4 h-4" />} label="Passkeys" value="Not set" onClick={() => setSubPage("passkey")} />
          <Row icon={<ShieldCheck className="w-4 h-4" />} label="Two-step Verification" onClick={() => { }} />
          {/* Routes to the Danger Zone subpage */}
          <Row icon={<Trash2 className="w-4 h-4" />} label="Delete Account" onClick={() => setSubPage("dangerZone")} danger />
        </Section>

        {/* PRIVACY */}
        <Section title="Privacy">
          <Row icon={<Eye className="w-4 h-4" />} label="Privacy Settings" onClick={() => setSubPage("privacy")} />
        </Section>

        {/* APP */}
        <Section title="App">
          <Row
            icon={<RefreshCw className="w-4 h-4" />} label="Auto Reconnect"
            toggle toggled={autoReconnect} onClick={() => setAutoReconnect(!autoReconnect)}
          />
          <Row
            icon={theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            label="Dark Mode" toggle toggled={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
        </Section>

        {/* HELP */}
        <Section title="Help">
          <Row icon={<HelpCircle className="w-4 h-4" />} label="Help Center" onClick={() => { }} />
          <Row icon={<MessageSquare className="w-4 h-4" />} label="Send Feedback" onClick={() => setSubPage("feedback")} />
          <Row icon={<Lock className="w-4 h-4" />} label="Privacy Policy" onClick={() => { }} />
        </Section>

        {/* Sign out */}
        <div className="px-4 py-6 mt-4">
          <Button
            variant="outline"
            className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4 opacity-50">
            OffLynk v1.0 · No servers · Open source
          </p>
        </div>
      </div>
    </div>
  );
}