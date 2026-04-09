"use client";
/**
 * PermissionGate — shows a card requesting browser permissions
 * before the app becomes usable. Permissions: Notifications, Geolocation.
 */
import { useEffect, useState } from "react";
import { Bell, MapPin, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureStore } from "@/store/featureStore";
import { motion } from "framer-motion";

interface PermStatus {
  notifications: "default" | "granted" | "denied" | "unsupported";
  geolocation: "unknown" | "granted" | "denied" | "unsupported";
}

export function PermissionGate({ onDone }: { onDone: () => void }) {
  const { setLocation, setLocationEnabled } = useFeatureStore();
  const [status, setStatus] = useState<PermStatus>({
    notifications: "default",
    geolocation: "unknown",
  });
  const [requesting, setRequesting] = useState(false);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setStatus((s) => ({ ...s, notifications: "unsupported" }));
      return;
    }
    const result = await Notification.requestPermission();
    setStatus((s) => ({ ...s, notifications: result }));
  };

  const requestGeolocation = () => {
    if (!("geolocation" in navigator)) {
      setStatus((s) => ({ ...s, geolocation: "unsupported" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationEnabled(true);
        setStatus((s) => ({ ...s, geolocation: "granted" }));
      },
      () => setStatus((s) => ({ ...s, geolocation: "denied" })),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRequestAll = async () => {
    setRequesting(true);
    await requestNotifications();
    requestGeolocation();
    setTimeout(() => { setRequesting(false); onDone(); }, 1200);
  };

  const perms = [
    {
      icon: Bell,
      key: "notifications",
      label: "Notifications",
      desc: "Alerts for incoming messages when app is in background",
      status: status.notifications,
    },
    {
      icon: MapPin,
      key: "geolocation",
      label: "Location",
      desc: "Powers compass direction & emergency SOS coordinates",
      status: status.geolocation,
      optional: true,
    },
  ] as const;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-1">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            OffLynk needs a couple of permissions to work at its best.
          </p>
        </div>

        <div className="space-y-3">
          {perms.map((perm) => {
            const { icon: Icon, key, label, desc, status: s } = perm;
            const optional = "optional" in perm ? perm.optional : false;
            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  s === "granted"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-muted/20"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  s === "granted" ? "bg-primary/10" : "bg-muted/60"
                }`}>
                  {s === "granted" ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{label}</p>
                    {optional && (
                      <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                        optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  {s === "denied" && (
                    <p className="text-[10px] text-destructive mt-1">
                      Blocked — enable in browser settings
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleRequestAll} disabled={requesting}>
            <ChevronRight className="mr-2 w-4 h-4" />
            {requesting ? "Setting up…" : "Grant Permissions & Continue"}
          </Button>
          <button
            onClick={onDone}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Skip for now (some features will be limited)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
