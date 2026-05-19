"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

interface ChartOverlayProps {
  type: "loading" | "error" | "offline";
  message?: string;
  onRetry?: () => void;
}

export const ChartOverlay = memo(function ChartOverlay({
  type,
  message,
  onRetry,
}: ChartOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        "flex flex-col items-center justify-center",
        "bg-[var(--tp-bg-primary)]/90",
        "z-10"
      )}
    >
      {type === "loading" && (
        <>
          <Loader2
            className="w-8 h-8 text-[var(--tp-blue)] animate-spin mb-3"
          />
          <p className="text-sm text-[var(--tp-text-secondary)]">
            {message || "Loading chart..."}
          </p>
        </>
      )}

      {type === "error" && (
        <>
          <AlertTriangle
            className="w-8 h-8 text-[var(--tp-red)] mb-3"
          />
          <p className="text-sm text-[var(--tp-text-secondary)] mb-4">
            {message || "Failed to load chart"}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                "flex items-center gap-2",
                "px-3 py-1.5",
                "text-sm",
                "bg-[var(--tp-bg-secondary)] hover:bg-[var(--tp-bg-tertiary)]",
                "rounded-lg",
                "transition-colors"
              )}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </>
      )}

      {type === "offline" && (
        <>
          <AlertTriangle
            className="w-8 h-8 text-[var(--tp-yellow)] mb-3"
          />
          <p className="text-sm text-[var(--tp-text-secondary)]">
            {message || "Connection lost. Reconnecting..."}
          </p>
        </>
      )}
    </div>
  );
});
