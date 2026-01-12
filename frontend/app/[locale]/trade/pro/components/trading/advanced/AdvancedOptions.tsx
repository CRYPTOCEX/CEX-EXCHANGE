"use client";

import React, { memo, useState } from "react";
import { cn } from "../../../utils/cn";
import type { OrderType } from "../OrderTypeSelector";
import type { MarketType } from "../../../types/common";

export interface AdvancedOptionsState {
  postOnly: boolean;
  reduceOnly: boolean;
  timeInForce: "GTC" | "IOC" | "FOK";
}

interface AdvancedOptionsProps {
  options: AdvancedOptionsState;
  onChange: (options: AdvancedOptionsState) => void;
  orderType: OrderType;
  marketType: MarketType;
}

export const AdvancedOptions = memo(function AdvancedOptions({
  options,
  onChange,
  orderType,
  marketType,
}: AdvancedOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show for limit orders
  if (orderType === "market") return null;

  const handleToggle = (key: keyof AdvancedOptionsState, value: any) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="border-t border-[var(--tp-border)] pt-2 mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-1 text-xs text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
      >
        <span>Advanced Options</span>
        <svg
          className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Options panel */}
      {isExpanded && (
        <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Time in Force */}
          <div className="space-y-1">
            <label className="text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide">
              Time in Force
            </label>
            <div className="flex gap-1">
              {(["GTC", "IOC", "FOK"] as const).map((tif) => (
                <button
                  key={tif}
                  onClick={() => handleToggle("timeInForce", tif)}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-medium rounded",
                    "transition-colors",
                    options.timeInForce === tif
                      ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
                      : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
                  )}
                  title={getTIFDescription(tif)}
                >
                  {tif}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--tp-text-muted)]">
              {getTIFDescription(options.timeInForce)}
            </p>
          </div>

          {/* Post Only */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-xs text-[var(--tp-text-secondary)]">Post Only</label>
              <p className="text-[10px] text-[var(--tp-text-muted)]">
                Order will only be placed as maker
              </p>
            </div>
            <ToggleSwitch
              checked={options.postOnly}
              onChange={(checked) => handleToggle("postOnly", checked)}
            />
          </div>

          {/* Reduce Only (futures) */}
          {marketType === "futures" && (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-xs text-[var(--tp-text-secondary)]">Reduce Only</label>
                <p className="text-[10px] text-[var(--tp-text-muted)]">
                  Only reduce existing position
                </p>
              </div>
              <ToggleSwitch
                checked={options.reduceOnly}
                onChange={(checked) => handleToggle("reduceOnly", checked)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function getTIFDescription(tif: "GTC" | "IOC" | "FOK"): string {
  switch (tif) {
    case "GTC":
      return "Good Till Cancelled - Order remains until filled or cancelled";
    case "IOC":
      return "Immediate or Cancel - Fill what's possible, cancel rest";
    case "FOK":
      return "Fill or Kill - Must be filled completely or cancelled";
    default:
      return "";
  }
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors",
        checked ? "bg-[var(--tp-blue)]" : "bg-[var(--tp-bg-tertiary)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform",
          "bg-white shadow-sm",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

export default AdvancedOptions;
