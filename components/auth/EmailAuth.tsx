"use client";
/**
 * EmailAuth.tsx
 * A professional, minimal authentication module supporting:
 * 1. Email + Password (Firebase Auth, with offline/demo fallback)
 * 2. Google & GitHub Sign-In (social)
 * 3. Secure RSA Key Generation on signup/login
 * 4. Paper-texture minimalistic UI
 */
import React, { useState, useRef, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, Cpu,
  Loader2, Github, Shield,
  AlertCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/encryption/crypto";
import { createProfile } from "@/lib/firebase/profile";
import { generateId } from "@/lib/utils/helpers";
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

/* ── Social Provider Icons ───────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ── Professional Floating Input Component ───────────────────── */
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  rightEl?: React.ReactNode;
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, rightEl, value, onFocus, onBlur, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const active = focused || (value && String(value).length > 0);

    return (
      <div className="relative group">
        <label
          className={`absolute left-4 pointer-events-none transition-all duration-200 z-10 ${active
              ? "top-1.5 text-[10px] font-semibold text-primary/70"
              : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            }`}
        >
          {label}
        </label>
        <input
          ref={ref}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={`w-full h-14 pt-5 pb-1 px-4 rounded-2xl bg-card border transition-all outline-none text-sm text-foreground
            ${focused ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]" : "border-border hover:border-border/80"}
            ${rightEl ? "pr-12" : ""}
            ${className || ""}
          `}
          {...props}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {rightEl}
          </div>
        )}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

/* ── Main Auth Component ─────────────────────────────────────── */
type AuthTab = "login" | "signup";
type AuthStep = "auth" | "generating";
type SocialProvider = "google" | "github";

interface Props {
  onComplete: () => void;
}

export function EmailAuth({ onComplete }: Props) {
  /* ── State ── */
  const [tab, setTab] = useState<AuthTab>("login");
  const [step, setStep] = useState<AuthStep>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  const { setAuth } = useAuthStore();
  const { setCurrentUser, setKeys } = useUserStore();

  /* ── Helpers ── */
  const clearError = () => setError("");
  const trimEmail = (v: string) => v.trim().toLowerCase();
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  /* ── Core Key Generation & Profile Save ── */
  const generateAndSaveKeys = async (uid: string, emailAddr: string, name: string) => {
    setStep("generating");
    setAuth(uid, emailAddr);

    try {
      const keyPair = await generateKeyPair() as CryptoKeyPair;
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      const did = `did:offlynk:${uid}`;

      setCurrentUser({ id: uid, name, publicKey });
      setKeys({ publicKey, privateKey });

      if (isFirebaseConfigured && uid) {
        await createProfile(uid, {
          uid,
          email: emailAddr,
          displayName: name,
          photoURL: "",
          publicKey,
          did,
        }).catch((err) => console.warn("Failed to sync profile to Firebase:", err));
      }

      onComplete();
    } catch (err) {
      console.error("Profile setup error:", err);
      setStep("auth");
      setError("Failed to generate encryption keys. Please try again.");
    }
  };

  /* ── Email / Password Auth Flow ── */
  const handleEmailAuth = async () => {
    clearError();
    const em = trimEmail(email);

    if (tab === "signup" && !displayName.trim()) { setError("Please enter your display name"); return; }
    if (!isValidEmail(em)) { setError("Enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const auth = await getFirebaseAuth();

      if (!auth || !isFirebaseConfigured) {
        // Fallback: Local Demo Mode
        const uid = generateId() + generateId().slice(0, 8);
        await generateAndSaveKeys(uid, em, displayName.trim() || "Demo User");
        return;
      }

      const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = await import("firebase/auth");

      if (tab === "signup") {
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, em, password);
          await updateProfile(cred.user, { displayName: displayName.trim() });
        } catch (e: any) {
          if (e?.code === "auth/email-already-in-use") {
            setError("Account already exists. Try logging in instead.");
            setTab("login");
            return;
          }
          throw e;
        }
        await generateAndSaveKeys(cred.user.uid, em, displayName.trim());

      } else {
        let cred;
        try {
          cred = await signInWithEmailAndPassword(auth, em, password);
        } catch (e: any) {
          if (e?.code === "auth/user-not-found" || e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential") {
            setError("Incorrect email or password.");
            return;
          }
          throw e;
        }
        await generateAndSaveKeys(cred.user.uid, em, cred.user.displayName || "Unknown User");
      }
    } catch (e: any) {
      console.error("Auth error:", e);
      setError(e?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Social Sign-in Flow ── */
  const handleSocial = async (provider: SocialProvider) => {
    clearError();
    setSocialLoading(provider);
    try {
      const auth = await getFirebaseAuth();

      if (!auth || !isFirebaseConfigured) {
        const uid = generateId() + generateId().slice(0, 8);
        const fakeEmail = `${provider}_demo_${uid.slice(0, 6)}@demo.local`;
        await generateAndSaveKeys(uid, fakeEmail, `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`);
        return;
      }

      const { signInWithPopup, GoogleAuthProvider, GithubAuthProvider } = await import("firebase/auth");
      const prov = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
      const cred = await signInWithPopup(auth, prov);
      const user = cred.user;

      await generateAndSaveKeys(user.uid, user.email || `${provider}@social`, user.displayName || `${provider} User`);
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user") {
        setError(e?.message || "Social login failed. Please try again.");
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const onAuthKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEmailAuth();
  };

  /* ── Animations ── */
  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
    exit: { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background paper-texture p-4 relative overflow-hidden">
      {/* Subtle Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {/* ── Phase 1: Authentication Form ── */}
        {step === "auth" && (
          <motion.div
            key="auth"
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-sm z-10"
          >
            {/* Header & Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Lock className="w-7 h-7 text-primary-foreground" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 bg-card border border-border rounded-full flex items-center justify-center shadow-sm"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-primary/70" />
                </motion.div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">OffLynk</h1>
              <p className="text-sm text-muted-foreground">Private. Encrypted. Yours.</p>
            </div>

            {/* Login / Signup Toggle */}
            <div className="flex bg-muted/50 border border-border/50 rounded-2xl p-1 mb-6">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); clearError(); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${tab === t
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {t === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Input Fields */}
            <div className="space-y-3 mb-4">
              <AnimatePresence initial={false}>
                {tab === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                  >
                    <FloatingInput
                      ref={nameRef}
                      label="Your Name (Shown to friends)"
                      type="text"
                      value={displayName}
                      onChange={(e) => { setDisplayName(e.target.value.slice(0, 30)); clearError(); }}
                      onKeyDown={onAuthKey}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <FloatingInput
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                onKeyDown={onAuthKey}
                autoFocus
              />

              <FloatingInput
                label="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                onKeyDown={onAuthKey}
                rightEl={
                  <button
                    type="button"
                    tabIndex={-1} // Prevent tabbing to the eye icon
                    onPointerDown={(e) => {
                      e.preventDefault(); // Prevents input from losing focus
                      setShowPass(!showPass);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-2"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="flex items-start gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5 mb-3 overflow-hidden"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
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
                  {tab === "login" ? "Sign In" : "Create Account"}
                  <motion.div
                    className="absolute inset-0 bg-white/5"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </>
              )}
            </Button>

            {/* Social Auth Dividers */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium">or continue with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleSocial("google")}
                disabled={loading || !!socialLoading}
                className="flex items-center justify-center gap-2.5 h-12 bg-card border border-border rounded-2xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 shadow-sm"
              >
                {socialLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                Google
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleSocial("github")}
                disabled={loading || !!socialLoading}
                className="flex items-center justify-center gap-2.5 h-12 bg-card border border-border rounded-2xl text-sm font-semibold text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 shadow-sm"
              >
                {socialLoading === "github" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                GitHub
              </motion.button>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted · Keys stay on device</span>
            </div>
          </motion.div>
        )}

        {/* ── Phase 2: Key Generation State ── */}
        {step === "generating" && (
          <motion.div
            key="gen"
            variants={cardVariants}
            initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-sm flex flex-col items-center py-16 z-10"
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

            <h2 className="text-xl font-bold mb-2">Securing Connection</h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Generating your private RSA key pair for end-to-end encryption.
              <br />
              <span className="text-xs opacity-60 mt-1 inline-block">This only takes a moment.</span>
            </p>

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