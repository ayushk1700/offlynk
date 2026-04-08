"use client";
/**
 * SettingsPage — WhatsApp-style settings with sections:
 * - Account (change number, privacy, security, passkeys, delete)
 * - Privacy (last seen, read receipts, photo visiblity)
 * - Notifications
 * - Help (FAQ, contact, feedback)
 */
import { useState } from "react";
import {
  ArrowLeft, ChevronRight, ShieldCheck, Lock, Phone,
  Bell, HelpCircle, MessageSquare, Trash2, Key, Eye,
  EyeOff, CheckCheck, User, LogOut, Moon, Sun, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useFeatureStore } from "@/store/featureStore";
import { useTheme } from "@/components/layout/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { FeedbackForm } from "./FeedbackForm";
import { PrivacySettings } from "./PrivacySettings";

type SubPage = null | "privacy" | "account" | "feedback";

interface Props {
  onBack?: () => void;
  onOpenProfile?: () => void;
}

export function SettingsPage({ onBack, onOpenProfile }: Props) {
  const { phone, uid, signOut } = useAuthStore();
  const { autoReconnect, setAutoReconnect } = useFeatureStore();
  const { theme, setTheme } = useTheme();
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (subPage === "privacy") return <PrivacySettings onBack={() => setSubPage(null)} />;
  if (subPage === "feedback") return <FeedbackForm onBack={() => setSubPage(null)} />;

  const handleDeleteAccount = () => {
    signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

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
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left ${danger ? "text-destructive" : ""}`}
      onClick={onClick}
    >
      <span className={`shrink-0 ${danger ? "text-destructive" : "text-primary"}`}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="text-xs text-muted-foreground mr-2">{value}</span>}
      {toggle !== undefined ? (
        <div
          className={`w-11 h-6 rounded-full transition-colors relative ${toggled ? "bg-primary" : "bg-muted"}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${toggled ? "left-6" : "left-1"}`} />
        </div>
      ) : (
        onClick && <ChevronRight className={`w-4 h-4 ${danger ? "text-destructive/50" : "text-muted-foreground"}`} />
      )}
    </button>
  );

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
          variant="ghost" size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-8 h-8"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile row */}
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 px-4 py-4 bg-card border-b border-border hover:bg-muted/30 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {phone?.charAt(phone.length - 2)?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{phone || "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">Hey there! I'm using Off-Grid Chat.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ACCOUNT section */}
        <Section title="Account">
          <Row icon={<Phone className="w-4 h-4" />} label="Change Number" onClick={() => {}} />
          <Row icon={<Key className="w-4 h-4" />} label="Passkeys" value="Not set" onClick={() => {}} />
          <Row icon={<ShieldCheck className="w-4 h-4" />} label="Two-step Verification" onClick={() => {}} />
          <Row icon={<Trash2 className="w-4 h-4" />} label="Delete Account" onClick={() => setShowDeleteConfirm(true)} danger />
        </Section>

        {/* PRIVACY section */}
        <Section title="Privacy">
          <Row icon={<Eye className="w-4 h-4" />} label="Privacy Settings" onClick={() => setSubPage("privacy")} />
        </Section>

        {/* APP section */}
        <Section title="App">
          <Row
            icon={<RefreshCw className="w-4 h-4" />}
            label="Auto Reconnect"
            toggle
            toggled={autoReconnect}
            onClick={() => setAutoReconnect(!autoReconnect)}
          />
          <Row
            icon={theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            label="Dark Mode"
            toggle
            toggled={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
        </Section>

        {/* HELP section */}
        <Section title="Help">
          <Row icon={<HelpCircle className="w-4 h-4" />} label="Help Center" onClick={() => {}} />
          <Row icon={<MessageSquare className="w-4 h-4" />} label="Send Feedback" onClick={() => setSubPage("feedback")} />
          <Row icon={<Lock className="w-4 h-4" />} label="Privacy Policy" onClick={() => {}} />
        </Section>

        {/* Sign out */}
        <div className="px-4 py-6">
          <Button
            variant="outline"
            className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3 opacity-50">
            Off-Grid Chat v1.0 · No servers · Open source
          </p>
        </div>
      </div>

      {/* Delete account confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg mb-2 text-destructive">Delete Account?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete your account, all messages, and encryption keys. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
