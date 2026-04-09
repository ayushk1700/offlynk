"use client";
/**
 * EmailAuth.tsx
 * Replaces PhoneAuth — supports:
 *   1. Email + Password (Firebase Auth, with demo fallback)
 *   2. Google Sign-In (social)
 *   3. GitHub Sign-In (social)
 *   4. Local / offline identity (always works, no Firebase required)
 *
 * After authentication, generates a local RSA key pair and writes
 * the profile to Firestore (if configured).
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Cpu, KeyRound,
  CheckCircle2, ChevronLeft, Loader2, Github, Shield,
  User as UserIcon, AlertCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/encryption/crypto";
import { createProfile } from "@/lib/firebase/profile";
import { generateId } from "@/lib/utils/helpers";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

/* ── Social provider icon ────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* ── Tab type ─────────────────────────────────────────────────── */
type AuthTab  = "login" | "signup";
type AuthStep = "auth" | "profile" | "generating";
type SocialProvider = "google" | "github";

interface Props { onComplete: () => void; }

export function EmailAuth({ onComplete }: Props) {
  /* ── field state ── */
  const [tab, setTab]               = useState<AuthTab>("login");
  const [step, setStep]             = useState<AuthStep>("auth");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [pendingUid, setPendingUid] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  // Floating label animation triggers
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const [nameFocused, setNameFocused]   = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const { setAuth } = useAuthStore();
  const { setCurrentUser, setKeys } = useUserStore();

  /* ── helpers ────────────────────────────────────────────────── */
  const clearError = () => setError("");

  const trimEmail = (v: string) => v.trim().toLowerCase();

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  /** After Firebase/social auth → set auth token, then go to profile step */
  function proceedToProfile(uid: string, emailAddr: string, nameHint?: string) {
    setPendingUid(uid);
    setPendingEmail(emailAddr);
    if (nameHint) setDisplayName(nameHint);
    setAuth(uid, emailAddr);
    setStep("profile");
    setTimeout(() => nameRef.current?.focus(), 100);
  }

  /* ── Email / Password auth ───────────────────────────────────── */
  const handleEmailAuth = async () => {
    clearError();
    const em = trimEmail(email);
    if (!isValidEmail(em))        { setError("Enter a valid email address"); return; }
    if (password.length < 6)      { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const auth = await getFirebaseAuth();

      if (!auth || !isFirebaseConfigured) {
        // ── Demo / offline mode ──
        const uid = generateId() + generateId().slice(0, 8);
        proceedToProfile(uid, em);
        return;
      }

      // Firebase Email/Password
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } =
        await import("firebase/auth");

      if (tab === "signup") {
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, em, password);
        } catch (e: unknown) {
          const err = e as { code?: string };
          if (err?.code === "auth/email-already-in-use") {
            setError("Account already exists. Try logging in instead.");
            setTab("login");
            return;
          }
          throw e;
        }
        proceedToProfile(cred.user.uid, em, cred.user.displayName || "");
      } else {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, em, password);
        } catch (e: unknown) {
          const err = e as { code?: string };
          if (err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password" ||
              err?.code === "auth/invalid-credential") {
            setError("Incorrect email or password.");
            return;
          }
          throw e;
        }
        proceedToProfile(cred.user.uid, em, cred.user.displayName || "");
      }
    } catch (e: unknown) {
      console.error("Auth error:", e);
      const err = e as { message?: string };
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Social sign-in ─────────────────────────────────────────── */
  const handleSocial = async (provider: SocialProvider) => {
    clearError();
    setSocialLoading(provider);
    try {
      const auth = await getFirebaseAuth();

      if (!auth || !isFirebaseConfigured) {
        // Demo mode
        const uid = generateId() + generateId().slice(0, 8);
        const fakeEmail = `${provider}_demo_${uid.slice(0,6)}@demo.local`;
        proceedToProfile(uid, fakeEmail, `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`);
        return;
      }

      const { signInWithPopup, GoogleAuthProvider, GithubAuthProvider } = await import("firebase/auth");
      const prov = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
      const cred = await signInWithPopup(auth, prov);
      const user = cred.user;
      proceedToProfile(user.uid, user.email || `${provider}@social`, user.displayName || "");
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "auth/popup-closed-by-user") {
        /* silently ignore */
      } else {
        setError(err?.message || "Social login failed. Please try again.");
      }
    } finally {
      setSocialLoading(null);
    }
  };

  /* ── Profile + key-generation step ──────────────────────────── */
  const completeProfile = async () => {
    if (!displayName.trim()) { setError("Enter your display name"); return; }
    setStep("generating");

    try {
      const keyPair    = await generateKeyPair() as CryptoKeyPair;
      const publicKey  = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      const uid    = pendingUid || useAuthStore.getState().uid || generateId();
      const did    = `did:offlynk:${uid}`;

      setCurrentUser({ id: uid, name: displayName.trim(), publicKey });
      setKeys({ publicKey, privateKey });

      if (isFirebaseConfigured && uid) {
        await createProfile(uid, {
          uid,
          email: pendingEmail || useAuthStore.getState().email || "",
          displayName: displayName.trim(),
          photoURL: "",
          publicKey,
          did,
        }).catch(console.warn);
      }

      onComplete();
    } catch (err) {
      console.error("Profile setup error:", err);
      setStep("profile");
      setError("Failed to generate keys. Please try again.");
    }
  };

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  const onAuthKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEmailAuth();
  };
  const onProfileKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") completeProfile();
  };

  /* ── Shared animation variants ──────────────────────────────── */
  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
    exit:    { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.2 } },
  };

  /* ── Floating label input helper ────────────────────────────── */
  const FloatingInput = ({
    id, label, type = "text", value, onChange, onFocus, onBlur, focused,
    autoFocus, rightEl, onKeyDown, ref: inputRef,
  }: {
    id: string; label: string; type?: string; value: string;
    onChange: (v: string) => void; onFocus: () => void; onBlur: () => void;
    focused: boolean; autoFocus?: boolean; rightEl?: React.ReactNode;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    ref?: React.RefObject<HTMLInputElement | null>;
  }) => {
    const active = focused || value.length > 0;
    return (
      <div className="relative group">
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
            active
              ? "top-1.5 text-[10px] font-semibold text-primary/70"
              : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          }`}
        >
          {label}
        </label>
        <input
          id={id}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={value}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`w-full h-14 pt-5 pb-1 px-4 rounded-2xl bg-card border transition-all outline-none text-sm text-foreground
            ${focused
              ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              : "border-border hover:border-border/80"
            }
            ${rightEl ? "pr-12" : ""}
          `}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background paper-texture p-4 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {/* ── Auth step ─────────────────────────────────────────── */}
        {step === "auth" && (
          <motion.div
            key="auth"
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-sm"
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-4">
                <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/15">
                  <Lock className="w-9 h-9 text-primary-foreground" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                >
                  <Sparkles className="w-3 h-3 text-primary/70" />
                </motion.div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">OffLynk</h1>
              <p className="text-sm text-muted-foreground">Private. Encrypted. Yours.</p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-muted/50 border border-border/50 rounded-2xl p-1 mb-6">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); clearError(); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                    tab === t
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Email field */}
            <div className="space-y-3 mb-4">
              <FloatingInput
                id="auth-email"
                label="Email address"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); clearError(); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                focused={emailFocused}
                autoFocus
                onKeyDown={onAuthKey}
              />

              <FloatingInput
                id="auth-password"
                label="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(v) => { setPassword(v); clearError(); }}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                focused={passFocused}
                onKeyDown={onAuthKey}
                rightEl={
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="flex items-start gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5 mb-3"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary CTA */}
            <Button
              className="w-full h-12 rounded-2xl text-base font-semibold mb-4 relative overflow-hidden group"
              onClick={handleEmailAuth}
              disabled={loading || !!socialLoading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  {tab === "login" ? "Sign In with Email" : "Create Account"}
                  <motion.div
                    className="absolute inset-0 bg-white/5"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium">or continue with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleSocial("google")}
                disabled={loading || !!socialLoading}
                className="flex items-center justify-center gap-2.5 h-12 bg-card border border-border rounded-2xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 shadow-sm"
              >
                {socialLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Google
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleSocial("github")}
                disabled={loading || !!socialLoading}
                className="flex items-center justify-center gap-2.5 h-12 bg-card border border-border rounded-2xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 shadow-sm"
              >
                {socialLoading === "github" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                GitHub
              </motion.button>
            </div>

            {/* Demo mode notice */}
            {!isFirebaseConfigured && (
              <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                <strong>Demo mode</strong> — Firebase not configured. Your identity is stored locally only.
              </div>
            )}

            {/* Security badge */}
            <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted · Keys never leave your device</span>
            </div>
          </motion.div>
        )}

        {/* ── Profile step ──────────────────────────────────────── */}
        {step === "profile" && (
          <motion.div
            key="profile"
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-sm"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/15 mx-auto mb-4">
                <UserIcon className="w-9 h-9 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">Your Name</h1>
              <p className="text-sm text-muted-foreground">Shown to people you chat with</p>
            </div>

            <FloatingInput
              id="profile-name"
              label="Display name"
              value={displayName}
              onChange={(v) => { setDisplayName(v.slice(0, 30)); clearError(); }}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              focused={nameFocused}
              autoFocus
              onKeyDown={onProfileKey}
              ref={nameRef}
            />
            <p className="text-xs text-muted-foreground text-right mt-1.5 mb-4">{displayName.length}/30</p>

            <AnimatePresence>
              {error && (
                <motion.p
                  key="perr"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-sm text-destructive mb-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              className="w-full h-12 rounded-2xl text-base font-semibold"
              onClick={completeProfile}
              disabled={!displayName.trim()}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> Let's Go
            </Button>

            <button
              onClick={() => { setStep("auth"); clearError(); }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </motion.div>
        )}

        {/* ── Generating keys step ──────────────────────────────── */}
        {step === "generating" && (
          <motion.div
            key="gen"
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-sm flex flex-col items-center py-16"
          >
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-3 rounded-full bg-primary/8 flex items-center justify-center">
                <Cpu className="w-8 h-8 text-primary/70" />
              </div>
            </div>

            <h2 className="text-xl font-bold mb-2">Setting Up…</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Generating your RSA-2048 key pair for end-to-end encryption.
              <br />
              <span className="text-xs opacity-60 mt-1 inline-block">Your keys never leave this device.</span>
            </p>

            {/* Animated dots */}
            <div className="flex gap-1.5 mt-8">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
