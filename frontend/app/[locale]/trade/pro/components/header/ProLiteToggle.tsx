"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { useLayout } from "../../providers/LayoutProvider";
import { Zap, Sparkles } from "lucide-react";

export const ProLiteToggle = memo(function ProLiteToggle() {
  const { layoutMode, setLayoutMode } = useLayout();

  return (
    <button
      onClick={() => setLayoutMode(layoutMode === "pro" ? "lite" : "pro")}
      className={cn(
        "flex items-center gap-1.5",
        "px-2.5 py-1.5 rounded-lg",
        "text-xs font-medium",
        "transition-colors",
        "cursor-pointer",
        layoutMode === "pro"
          ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)] hover:bg-[var(--tp-blue)]/30"
          : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)]"
      )}
      title={`Switch to ${layoutMode === "pro" ? "Lite" : "Pro"} mode`}
    >
      {layoutMode === "pro" ? (
        <>
          <Zap size={12} />
          <span>Pro</span>
        </>
      ) : (
        <>
          <Sparkles size={12} />
          <span>Lite</span>
        </>
      )}
    </button>
  );
});
