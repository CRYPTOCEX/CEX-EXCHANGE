"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface QuickAmountButtonsProps {
  onSelect: (percentage: number) => void;
  selectedPercentage?: number;
}

const percentages = [25, 50, 75, 100];

export const QuickAmountButtons = memo(function QuickAmountButtons({
  onSelect,
  selectedPercentage,
}: QuickAmountButtonsProps) {
  return (
    <div className="flex gap-1">
      {percentages.map((pct) => (
        <button
          key={pct}
          onClick={() => onSelect(pct)}
          className={cn(
            "flex-1 py-0.5",
            "text-[10px] font-medium",
            "rounded",
            "transition-colors",
            selectedPercentage === pct
              ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
              : "bg-[var(--tp-bg-tertiary)] hover:bg-[var(--tp-bg-elevated)] text-[var(--tp-text-secondary)]"
          )}
        >
          {pct}%
        </button>
      ))}
    </div>
  );
});

export default QuickAmountButtons;
