"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

type DisplayMode = "both" | "bids" | "asks";

interface OrderBookHeaderProps {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  showCumulative: boolean;
  onShowCumulativeChange: (show: boolean) => void;
  compact?: boolean;
}

export const OrderBookHeader = memo(function OrderBookHeader({
  displayMode,
  onDisplayModeChange,
  showCumulative,
  onShowCumulativeChange,
  compact = false,
}: OrderBookHeaderProps) {
  // In compact/horizontal mode, hide the display mode toggle since we always show both
  return (
    <div
      className={cn(
        "tp-orderbook-header",
        "flex items-center justify-between gap-2",
        "px-2 py-1.5",
        "border-b border-[var(--tp-border)]",
        "bg-[var(--tp-bg-secondary)]"
      )}
    >
      {/* Display Mode Toggle - hide in compact mode */}
      {!compact && (
        <div className="flex items-center gap-1">
          <DisplayModeButton
            mode="both"
            active={displayMode === "both"}
            onClick={() => onDisplayModeChange("both")}
            label="Both"
          />
          <DisplayModeButton
            mode="bids"
            active={displayMode === "bids"}
            onClick={() => onDisplayModeChange("bids")}
            label="Bids"
          />
          <DisplayModeButton
            mode="asks"
            active={displayMode === "asks"}
            onClick={() => onDisplayModeChange("asks")}
            label="Asks"
          />
        </div>
      )}

      {/* Compact mode label */}
      {compact && (
        <span className="text-[10px] text-[var(--tp-text-muted)]">Side-by-Side</span>
      )}

      {/* Cumulative Toggle */}
      <button
        onClick={() => onShowCumulativeChange(!showCumulative)}
        className={cn(
          "text-[10px]",
          "px-1.5 py-0.5",
          "rounded",
          "transition-colors",
          showCumulative
            ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
            : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
        )}
        title={showCumulative ? "Show Total" : "Show Cumulative"}
      >
        Σ
      </button>
    </div>
  );
});

interface DisplayModeButtonProps {
  mode: DisplayMode;
  active: boolean;
  onClick: () => void;
  label: string;
}

function DisplayModeButton({ mode, active, onClick, label }: DisplayModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-0.5",
        "px-1.5 py-0.5",
        "text-[10px]",
        "rounded",
        "transition-colors",
        active
          ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
          : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
      )}
      title={`Show ${label}`}
    >
      <DisplayModeIcon mode={mode} />
    </button>
  );
}

function DisplayModeIcon({ mode }: { mode: DisplayMode }) {
  if (mode === "both") {
    return (
      <div className="flex flex-col gap-px w-3 h-3">
        <div className="flex-1 bg-[var(--tp-red)] rounded-t-sm" />
        <div className="flex-1 bg-[var(--tp-green)] rounded-b-sm" />
      </div>
    );
  }
  if (mode === "bids") {
    return <div className="w-3 h-3 bg-[var(--tp-green)] rounded-sm" />;
  }
  return <div className="w-3 h-3 bg-[var(--tp-red)] rounded-sm" />;
}

export default OrderBookHeader;
