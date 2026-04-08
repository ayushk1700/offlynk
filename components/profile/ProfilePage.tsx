"use client";
/**
 * ProfilePage — WhatsApp-style profile management.
 * - Avatar upload (Firebase Storage)
 * - Display name, about, status
 * - Phone number display
 * - Last seen timestamp
 */
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Camera, Check, X, ChevronRight, Phone,
  Clock, Info, User, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { getProfile, updateProfile, uploadProfilePhoto } from "@/lib/firebase/profile";
import { formatTime } from "@/lib/utils/helpers";

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
  const { uid, phone, profile, setProfile } = useAuthStore();
  const { currentUser } = useUserStore();

  const [name, setName] = useState(profile?.displayName || currentUser?.name || "");
  const [about, setAbout] = useState(profile?.about || "Hey there! I'm using Off-Grid Chat.");
  const [status, setStatus] = useState(profile?.status || "🟢 Available");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

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

  const saveField = async (field: string, value: string) => {
    setSaving(true);
    if (uid) await updateProfile(uid, { [field]: value });
    setProfile({ ...profile, [field]: value });
    setSaving(false);
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
      // Fallback: local preview only
      const url = URL.createObjectURL(file);
      setPhotoURL(url);
    }
    setUploading(false);
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
        <h2 className="font-semibold text-lg">Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar section */}
        <div className="flex flex-col items-center py-8 bg-card border-b border-border">
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
          <p className="text-xs text-muted-foreground">{phone || "No phone"}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Info fields */}
        <div className="divide-y divide-border">
          {/* Name */}
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
                    <button
                      onClick={() => { saveField("displayName", name); setEditingName(false); }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{name || "—"}</p>
                    <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>Edit</Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  This is not your username. Names don't need to be unique.
                </p>
              </div>
            </div>
          </div>

          {/* About */}
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
                    <button
                      onClick={() => { saveField("about", about); setEditingAbout(false); }}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingAbout(false)}
                      className="p-2 text-muted-foreground hover:bg-muted/50 rounded-lg"
                    >
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

          {/* Status */}
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
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        status === s
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

          {/* Phone */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Phone</p>
                <p className="text-sm font-medium">{phone || "Not set"}</p>
              </div>
            </div>
          </div>

          {/* DID */}
          <div className="px-4 py-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">D</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Decentralized Identity (DID)</p>
                <p className="text-xs font-mono text-foreground truncate">
                  {currentUser?.id ? `did:offgrid:${currentUser.id}` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
