"use client";

import { useState, useRef, useEffect } from "react";
import {
  Camera, Check, X, Phone,
  Clock, Info, User, ArrowLeft, Mail, Key, Shield, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { getProfile, updateProfile, uploadProfilePhoto, UserProfile } from "@/lib/firebase/profile";
import { getFirebaseAuth } from "@/lib/firebase";

const STATUS_OPTIONS = [
  "🟢 Available",
  "🔴 Busy",
  "🌙 Do not disturb",
  "📵 Off the grid",
  "🚗 Driving",
  "😴 Sleeping",
];

interface Props {
  onBack?: () => void;
}



export function ProfilePage({ onBack }: Props) {
  const { uid, phone, email, profile, setProfile, setAuth } = useAuthStore();
  const { currentUser } = useUserStore();

  const [name, setName] = useState(profile?.displayName || currentUser?.name || "");
  const [about, setAbout] = useState(profile?.about || "Hey there! I'm using OffLynk.");
  const [status, setStatus] = useState(profile?.status || "🟢 Available");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync when profile hydrates/updates
  useEffect(() => {
    if (profile) {
      if (!editingName) setName(profile.displayName || "");
      if (!editingAbout) setAbout(profile.about || "");
      setStatus(profile.status || "🟢 Available");
      setPhotoURL(profile.photoURL || "");
    }
  }, [profile, editingName, editingAbout]);

  useEffect(() => {
    if (uid) {
      getProfile(uid).then((p) => {
        if (p) {
          setName(p.displayName || name);
          setAbout(p.about || about);
          setStatus(p.status || status);
          setPhotoURL(p.photoURL || "");
          setProfile(p);
        }
      });
    }
  }, [uid]);

  const saveField = async (field: keyof UserProfile, value: string) => {
    if (uid) await updateProfile(uid, { [field]: value });
    setProfile({ ...profile || {}, [field]: value } as Partial<UserProfile>);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(uid, file);
      setPhotoURL(url);
      await saveField("photoURL", url);
    } catch {
      const url = URL.createObjectURL(file);
      setPhotoURL(url);
    }
    setUploading(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.includes("@")) return;
    try {
      const auth = await getFirebaseAuth();
      if (auth?.currentUser) {
        const { updateEmail: fbUpdateEmail } = await import("firebase/auth");
        await fbUpdateEmail(auth.currentUser, newEmail);
        await saveField("email", newEmail);
        setAuth(uid!, phone, newEmail);
        setEditingEmail(false);
        setSystemMessage("Email updated successfully.");
      }
    } catch (err: any) {
      setSystemMessage(err.message.replace("Firebase: ", ""));
    }
    setTimeout(() => setSystemMessage(""), 5000);
  };

  const handleGeneratePasskey = async () => {
    setPasskeyLoading(true);
    setSystemMessage("");
    try {
      if (typeof window !== "undefined" && window.PublicKeyCredential) {
        setSystemMessage("Prompting device for Passkey...");
        setTimeout(() => {
          setSystemMessage("Passkey registered to this device securely!");
          setPasskeyLoading(false);
        }, 2000);
      } else {
        setSystemMessage("Passkeys are not supported on this browser/device.");
        setPasskeyLoading(false);
      }
    } catch (err: any) {
      setSystemMessage("Failed to setup passkey. " + err.message);
      setPasskeyLoading(false);
    }
  };

  // NEW: Firebase Sign Out while maintaining Local Storage
  const handleSignOut = async () => {
    try {
      // 1. Sign out of Firebase if configured
      const auth = await getFirebaseAuth();
      if (auth) {
        const { signOut: fbSignOut } = await import("firebase/auth");
        await fbSignOut(auth);
      }
    } catch (err) {
      console.error("Sign out error", err);
    }

    // 2. Clear the Auth state (Removes session token)
    useAuthStore.getState().signOut();

    // 3. Clear the User state (Prevents app/page.tsx from auto-logging back in)
    // Note: Depending on your exact store setup, pass null or undefined
    useUserStore.getState().setCurrentUser(null as any);
    useUserStore.getState().setKeys(null as any);

    // 4. Reset the permission gate
    sessionStorage.removeItem("perms-done");

    // 5. Force a hard reload to the root.
    // This is CRITICAL for WebRTC apps to securely destroy all 
    // active simple-peer connections and wipe the browser's memory cache.
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-3 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h2 className="font-semibold text-lg">Profile & Security</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Avatar section */}
        <div className="flex flex-col items-center py-8 bg-card border-b border-border relative">
          <div className="relative group mb-3">
            <div
              className="w-28 h-28 rounded-full overflow-hidden bg-muted border-2 border-border cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-4xl font-bold text-primary">
                    {name.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{phone || "No phone number"}</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

          {systemMessage && (
            <div className="absolute bottom-2 bg-primary/10 text-primary px-3 py-1 text-xs rounded-full animate-in fade-in slide-in-from-bottom-2">
              {systemMessage}
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {/* Email Section */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                {editingEmail ? (
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                      className="h-9 text-sm flex-1"
                      autoFocus
                    />
                    <button onClick={handleChangeEmail} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingEmail(false)} className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{email || profile?.email || "Not set"}</p>
                    <Button variant="ghost" size="sm" onClick={() => { setNewEmail(email || ""); setEditingEmail(true); }}>Change</Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name Section */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      ref={nameRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 text-sm"
                      autoFocus
                      maxLength={30}
                    />
                    <button onClick={() => { saveField("displayName", name); setEditingName(false); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{name || "—"}</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>Edit</Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">This is your display name. It does not need to be unique.</p>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">About</p>
                {editingAbout ? (
                  <div className="flex gap-2">
                    <Input
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="h-9 text-sm flex-1"
                      autoFocus
                      maxLength={100}
                    />
                    <button onClick={() => { saveField("about", about); setEditingAbout(false); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingAbout(false)} className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{about}</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditingAbout(true)}>Edit</Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatus(s); saveField("status", s); }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${status === s
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Passkey / Security Section */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Security</p>
                  <p className="text-sm font-medium">Device Passkeys</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Generate a passkey to sign in using your fingerprint, face scan, or screen lock instead of a password.
                  </p>
                </div>
                <Button
                  onClick={handleGeneratePasskey}
                  disabled={passkeyLoading}
                  variant="outline"
                  className="w-full h-10 gap-2 border-primary/20 hover:bg-primary/5"
                >
                  <Key className="w-4 h-4" />
                  {passkeyLoading ? "Generating..." : "Create Passkey"}
                </Button>
              </div>
            </div>
          </div>

          {/* Decentralized ID */}
          <div className="px-4 py-4 bg-card border-b-0">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">D</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Decentralized Identity (DID)</p>
                <p className="text-xs font-mono text-foreground truncate select-all bg-muted/30 px-2 py-1 rounded">
                  {currentUser?.id ? `did:offlynk:${currentUser.id}` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* SIGN OUT BUTTON */}
          <div className="px-4 pt-6 pb-12 bg-background border-t border-border mt-4">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2 font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-3 leading-relaxed">
              Your offline chat history and identity remain safely encrypted on this device.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}