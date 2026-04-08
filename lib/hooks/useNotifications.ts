"use client";
/**
 * useNotifications.ts
 * Web Notifications API wrapper.
 */
import { useEffect, useState } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const request = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const notify = (title: string, body?: string) => {
    if (permission !== "granted") return;
    new Notification(title, { body, icon: "/icon.png" });
  };

  return { permission, request, notify };
}
