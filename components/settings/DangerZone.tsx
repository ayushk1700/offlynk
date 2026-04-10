"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/userStore";
import { deleteAccountFromCloud } from "@/lib/firebase/deleteAccount";
import { wipeLocalDeviceData } from "@/store/userStore"; // Path to the utility above
import { Button } from "@/components/ui/button";

export function DangerZone() {
    const { currentUser } = useUserStore();
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [password, setPassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        if (confirmText !== "DELETE") return;

        if (!currentUser) {
            setError("User session not found.");
            return;
        }

        setIsDeleting(true);
        setError("");

        // Safety timeout: if cloud deletion hangs due to network issues,
        // we still want to let the user "leave" the account locally.
        const safetyTimer = setTimeout(() => {
            console.warn("Cloud deletion taking too long, forcing local wipe.");
            wipeLocalDeviceData();
        }, 15000);

        try {
            await deleteAccountFromCloud(currentUser.id, password || undefined);
            clearTimeout(safetyTimer);
            await wipeLocalDeviceData();
        } catch (err: any) {
            clearTimeout(safetyTimer);
            
            // If it's a "recent login" error, we should tell them to re-log
            if (err.message?.includes("recent login")) {
                setError("For security, you must have logged in recently to delete your account. Please sign out and sign back in.");
            } else {
                setError(err.message || "Deletion failed. Please check your connection or password.");
            }
            setIsDeleting(false);
        }
    };

    return (
        <div className="mt-12 p-6 border border-destructive/30 bg-destructive/5 rounded-3xl">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-destructive/10 text-destructive rounded-2xl">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Permanently delete your OffLynk account, RSA encryption keys, and all network data from this device and the cloud. This action cannot be undone.
                    </p>

                    {!isConfirming ? (
                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={() => setIsConfirming(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                        </Button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Confirm Password (If set)
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-destructive/30 focus:border-destructive outline-none text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Type "DELETE" to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => { setConfirmText(e.target.value); setError(""); }}
                                    placeholder="DELETE"
                                    className="w-full h-11 px-4 rounded-xl bg-background border border-destructive/30 focus:border-destructive outline-none text-sm"
                                />
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive font-medium">
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="destructive"
                                    className="flex-1 rounded-xl"
                                    onClick={handleDelete}
                                    disabled={isDeleting || confirmText !== "DELETE"}
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently Delete"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => { setIsConfirming(false); setError(""); setConfirmText(""); setPassword(""); }}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}