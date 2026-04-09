"use client";

import { useState } from "react";
import { useUserStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
} from "@/lib/encryption/crypto";
import { generateId } from "@/lib/utils/helpers";
import {
  Shield,
  Fingerprint,
  Loader2,
  Radio,
  Lock,
  Globe,
} from "lucide-react";

export default function IdentityCard() {
  const { setCurrentUser, setKeys } = useUserStore();
  const [name, setName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"form" | "generating">("form");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStep("generating");
    setIsGenerating(true);

    try {
      const keyPair = await generateKeyPair();
      if (!keyPair) throw new Error("Could not generate keys");

      const pubKey = await exportPublicKey(keyPair.publicKey);
      const privKey = await exportPrivateKey(keyPair.privateKey);
      const userId = generateId();

      setKeys({ privateKey: privKey, publicKey: pubKey });
      setCurrentUser({ id: userId, name: trimmed, publicKey: pubKey });
    } catch (err) {
      console.error("Failed to create identity:", err);
      setStep("form");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCreate();
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg">
              <Radio className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            OffLynk
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Decentralized · Encrypted · No servers
          </p>
        </div>

        {step === "form" ? (
          <div className="space-y-4">
            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Your display name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Ghost, Alice, Node-7…"
                className="h-12 text-base bg-card border-border/60 focus:border-border rounded-xl"
                autoFocus
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                This name is visible to peers you connect with.
              </p>
            </div>

            {/* CTA */}
            <Button
              className="w-full h-12 text-base rounded-xl font-semibold"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              <Fingerprint className="mr-2 h-5 w-5" />
              Generate Keys &amp; Start
            </Button>

            {/* Features */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { icon: Lock, label: "E2E Encrypted" },
                { icon: Globe, label: "No Server" },
                { icon: Radio, label: "Offline-First" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 border border-border/40 text-center"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-center text-[10px] text-muted-foreground opacity-60 pt-1">
              Keys are generated locally and never leave your device.
            </p>
          </div>
        ) : (
          /* Generating state */
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground mb-1">
                Generating your keys…
              </p>
              <p className="text-xs text-muted-foreground">
                Creating your RSA-2048 key pair. This takes a moment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
