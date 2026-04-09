"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-md flex-col items-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Something went wrong!</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred in the application. You can try recovering by refreshing the page or returning home.
        </p>

        {/* Development only error description */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 w-full rounded-md bg-muted p-4 text-left border border-border">
            <p className="text-xs font-mono text-destructive break-words overflow-auto max-h-32">
              {error.message || "Unknown error"}
            </p>
          </div>
        )}

        <div className="mt-6 flex w-full flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
          <button
            onClick={() => reset()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-card border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors shadow-sm"
          >
            <Home className="h-4 w-4" /> Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
