"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global boundary caught an error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-50">
          <div className="flex max-w-md flex-col items-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold">Critical System Error</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The application encountered a fatal error that could not be recovered from. Please reload the application to restore functionality.
            </p>
            
            {/* Development-only context */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 w-full rounded-md bg-zinc-900 border border-zinc-800 p-4 text-left">
                <p className="text-xs font-mono text-red-400 break-words overflow-auto max-h-32">
                  {error.message || "Unknown fatal error"}
                </p>
              </div>
            )}

            <button
              onClick={() => reset()}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
