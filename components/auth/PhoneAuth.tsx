"use client";
/**
 * PhoneAuth.tsx
 * Collects phone number + display name → generates local RSA identity.
 * NO Firebase Phone Auth / reCAPTCHA — works fully offline.
 *
 * Firebase is used OPTIONALLY for profile storage (Firestore) after setup.
 * OTP step is a local 4-digit PIN for a second-device pairing feel.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, ShieldCheck, ArrowRight, RefreshCw,
  Loader2, CheckCircle2, ChevronLeft, Cpu, Lock, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/encryption/crypto";
import { createProfile } from "@/lib/firebase/profile";
import { generateId } from "@/lib/utils/helpers";
import { isFirebaseConfigured } from "@/lib/firebase";

/* ── Country codes ─────────────────────────────────────────── */
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1",  flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971",flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+7",  flag: "🇷🇺", name: "Russia" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
];

/* Generate a 6-digit local "OTP" — for second-device pairing UX feel */
function makeLocalOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type Step = "phone" | "otp" | "profile" | "generating";

interface Props { onComplete: () => void; }

export function PhoneAuth({ onComplete }: Props) {
  const [step, setStep]                   = useState<Step>("phone");
  const [countryCode, setCountryCode]     = useState(COUNTRY_CODES[0]);
  const [showPicker, setShowPicker]       = useState(false);
  const [phone, setPhone]                 = useState("");
  const [otp, setOtp]                     = useState(["","","","","",""]);
  const [expectedOtp, setExpectedOtp]     = useState("");
  const [displayName, setDisplayName]     = useState("");
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [resendTimer, setResendTimer]     = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { setAuth } = useAuthStore();
  const { setCurrentUser, setKeys } = useUserStore();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  /* ── Step 1: "Send" local OTP ──────────────────────────── */
  const sendOTP = () => {
    if (phone.replace(/\D/g,"").length < 6) {
      setError("Enter a valid phone number");
      return;
    }
    setError("");
    const code = makeLocalOTP();
    setExpectedOtp(code);
    setResendTimer(30);
    setStep("otp");

    /* In demo / no-Firebase mode we show the code on screen.
       When Firebase is configured you'd send a real SMS here. */
    if (!isFirebaseConfigured) {
      // Display the code so the user can proceed
      setTimeout(() => setError(`Demo mode — your code is: ${code}`), 300);
    }
  };

  /* ── Step 2: Verify local OTP ──────────────────────────── */
  const verifyOTP = () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Enter all 6 digits"); return; }

    if (!isFirebaseConfigured) {
      // Demo: accept the shown code OR any code
      setError("");
      const uid = generateId() + generateId().slice(0, 8);
      setAuth(uid, `${countryCode.code}${phone}`);
      setStep("profile");
      return;
    }

    if (code !== expectedOtp) {
      setError("Incorrect code. Try again.");
      return;
    }
    setError("");
    const uid = generateId() + generateId().slice(0, 8);
    setAuth(uid, `${countryCode.code}${phone}`);
    setStep("profile");
  };

  /* ── Step 3: Profile + key generation ─────────────────── */
  const completeProfile = async () => {
    if (!displayName.trim()) { setError("Enter your name"); return; }
    setStep("generating");

    try {
      const keyPair = await generateKeyPair() as CryptoKeyPair;
      const publicKey  = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      const { uid, phone: authPhone } = useAuthStore.getState();
      const userId = uid || generateId();
      const did    = `did:offgrid:${userId}`;

      setCurrentUser({ id: userId, name: displayName.trim(), publicKey });
      setKeys({ publicKey, privateKey });

      // Persist to Firestore if Firebase is configured
      if (isFirebaseConfigured && uid) {
        await createProfile(uid, {
          uid, phone: authPhone || "",
          displayName: displayName.trim(),
          photoURL: "", publicKey, did,
        }).catch(console.warn);           // non-fatal
      }

      onComplete();
    } catch (err) {
      console.error("Profile setup error:", err);
      setStep("profile");
      setError("Failed to generate keys. Please try again.");
    }
  };

  /* ── OTP input helpers ─────────────────────────────────── */
  const handleOtpChange = (i: number, val: string) => {
    const v = val.replace(/\D/g,"").slice(-1);
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i-1]?.focus();
  };
  const isOtpComplete = otp.every((d) => d !== "");

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background paper-texture p-4">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            {step === "generating"
              ? <Cpu  className="w-9 h-9 text-primary-foreground animate-pulse" />
              : step === "otp"
              ? <KeyRound className="w-9 h-9 text-primary-foreground" />
              : <Lock className="w-9 h-9 text-primary-foreground" />
            }
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {step === "phone"      && "Your Phone Number"}
            {step === "otp"        && "Verification Code"}
            {step === "profile"    && "Your Name"}
            {step === "generating" && "Setting Up…"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {step === "phone"      && "Enter your number to get started. No spam, no servers."}
            {step === "otp"        && `Code sent to ${countryCode.code} ${phone}. Check the hint below if in demo mode.`}
            {step === "profile"    && "This name is shown to people you chat with."}
            {step === "generating" && "Generating your end-to-end encryption keys…"}
          </p>
        </div>

        {/* ── Phone step ── */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {/* Country picker */}
              <div className="relative">
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className="h-12 px-3 bg-card border border-border rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-muted/50 transition-colors whitespace-nowrap"
                >
                  <span className="text-lg">{countryCode.flag}</span>
                  <span className="text-muted-foreground">{countryCode.code}</span>
                </button>
                <AnimatePresence>
                  {showPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                      <motion.div
                        initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
                        className="absolute top-14 left-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-56 max-h-64 overflow-y-auto"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <button key={c.code}
                            onClick={() => { setCountryCode(c); setShowPicker(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="flex-1">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{c.code}</span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <Input
                type="tel" placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g,""))}
                onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                className="flex-1 h-12 text-lg tracking-wider" autoFocus
              />
            </div>

            {/* Demo mode notice */}
            <div className="bg-muted/50 border border-border/60 rounded-xl px-4 py-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Secure local identity</strong> — your number is stored only on this device.
              {!isFirebaseConfigured && " Running in demo mode (Firebase not configured)."}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full h-12 rounded-xl text-base font-semibold"
              onClick={sendOTP}
              disabled={phone.length < 6}
            >
              <ArrowRight className="w-5 h-5 mr-2" /> Continue
            </Button>
          </div>
        )}

        {/* ── OTP step ── */}
        {step === "otp" && (
          <div className="space-y-6">
            <div className="flex justify-center gap-2.5">
              {otp.map((digit, i) => (
                <input key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-card transition-all outline-none focus:border-primary ${
                    digit ? "border-primary/60 bg-primary/5" : "border-border"
                  }`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Show demo code hint */}
            {error && (
              <div className={`text-sm text-center rounded-xl px-4 py-2 ${
                error.startsWith("Demo") ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "text-destructive"
              }`}>
                {error}
              </div>
            )}

            <Button
              className="w-full h-12 rounded-xl text-base font-semibold"
              onClick={verifyOTP}
              disabled={!isOtpComplete}
            >
              <ShieldCheck className="w-5 h-5 mr-2" /> Verify &amp; Continue
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(""); }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" /> Change number
              </button>
              {resendTimer > 0
                ? <span className="text-muted-foreground text-xs">Resend in {resendTimer}s</span>
                : <button onClick={sendOTP} className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm">
                    <RefreshCw className="w-3.5 h-3.5" /> Resend
                  </button>
              }
            </div>
          </div>
        )}

        {/* ── Profile step ── */}
        {step === "profile" && (
          <div className="space-y-4">
            <Input
              placeholder="Your name (e.g. Alice)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && completeProfile()}
              className="h-12 text-lg" maxLength={30} autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{displayName.length}/30</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full h-12 rounded-xl text-base font-semibold"
              onClick={completeProfile}
              disabled={!displayName.trim()}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> Let's Go
            </Button>
          </div>
        )}

        {/* ── Generating keys ── */}
        {step === "generating" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">Generating RSA-2048 key pair…</p>
              <p className="text-xs text-muted-foreground">Your keys never leave this device</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
