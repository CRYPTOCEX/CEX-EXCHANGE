"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface PositionPnLProps {
  pnl: number;
  roe: number;
  showRoe?: boolean;
}

export const PositionPnL = memo(function PositionPnL({
  pnl,
  roe,
  showRoe = true,
}: PositionPnLProps) {
  const isPositive = pnl >= 0;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "text-sm font-mono font-semibold",
          isPositive ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
        )}
      >
        {isPositive ? "+" : ""}
        {pnl.toFixed(2)}
      </span>
      {showRoe && (
        <span
          className={cn(
            "text-[10px] font-mono px-1 py-0.5 rounded",
            isPositive
              ? "bg-[var(--tp-green)]/10 text-[var(--tp-green)]"
              : "bg-[var(--tp-red)]/10 text-[var(--tp-red)]"
          )}
        >
          {isPositive ? "+" : ""}
          {roe.toFixed(2)}%
        </span>
      )}
    </div>
  );
});

export default PositionPnL;
