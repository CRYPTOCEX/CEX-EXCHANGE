"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../../utils/cn";
import type { OrderSide } from "../SideToggle";

interface MarginDisplayProps {
  total: number;
  leverage: number;
  side: OrderSide;
  maintenanceMarginRate?: number;
}

export const MarginDisplay = memo(function MarginDisplay({
  total,
  leverage,
  side,
  maintenanceMarginRate = 0.005, // 0.5% default
}: MarginDisplayProps) {
  // Calculate required margin (initial margin)
  const requiredMargin = useMemo(() => {
    if (!total || !leverage) return 0;
    return total / leverage;
  }, [total, leverage]);

  // Calculate maintenance margin
  const maintenanceMargin = useMemo(() => {
    return total * maintenanceMarginRate;
  }, [total, maintenanceMarginRate]);

  // Calculate liquidation estimate (simplified)
  const liquidationEstimate = useMemo(() => {
    if (!total || !leverage) return null;
    // This is a simplified calculation
    // Real liquidation price depends on position mode, other positions, etc.
    const marginRatio = 1 / leverage;
    const liquidationMove = marginRatio - maintenanceMarginRate;
    return liquidationMove * 100;
  }, [leverage, maintenanceMarginRate]);

  if (total <= 0) return null;

  return (
    <div className="space-y-1 px-1">
      {/* Required Margin */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--tp-text-muted)]">Required Margin</span>
        <span className="font-mono text-[var(--tp-text-secondary)]">
          {requiredMargin.toFixed(2)} USDT
        </span>
      </div>

      {/* Maintenance Margin */}
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[var(--tp-text-muted)]">Maintenance</span>
        <span className="font-mono text-[var(--tp-text-muted)]">
          {maintenanceMargin.toFixed(2)} USDT
        </span>
      </div>

      {/* Liquidation Warning */}
      {liquidationEstimate && leverage > 10 && (
        <div
          className={cn(
            "flex items-center gap-1 mt-1 px-2 py-1",
            "bg-[var(--tp-red)]/10 rounded",
            "text-[10px] text-[var(--tp-red)]"
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          <span>
            Liquidation at ~{liquidationEstimate.toFixed(1)}% {side === "buy" ? "drop" : "rise"}
          </span>
        </div>
      )}
    </div>
  );
});

export default MarginDisplay;
