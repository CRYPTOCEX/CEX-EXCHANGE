"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

interface BulkActionsProps {
  hasOpenOrders: boolean;
  onCancelAll: () => Promise<void>;
  onCancelSymbol?: () => Promise<void>;
}

export const BulkActions = memo(function BulkActions({
  hasOpenOrders,
  onCancelAll,
  onCancelSymbol,
}: BulkActionsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCancelAll = async () => {
    setIsCancelling(true);
    try {
      await onCancelAll();
    } finally {
      setIsCancelling(false);
      setShowConfirm(false);
    }
  };

  if (!hasOpenOrders) return null;

  return (
    <div className="relative">
      {showConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--tp-text-muted)]">Cancel all orders?</span>
          <button
            onClick={handleCancelAll}
            disabled={isCancelling}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded",
              "bg-[var(--tp-red)] text-white",
              "hover:bg-[var(--tp-red-dim)]",
              "disabled:opacity-50",
              "transition-colors"
            )}
          >
            {isCancelling ? "..." : "Yes"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isCancelling}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded",
              "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors"
            )}
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className={cn(
            "px-2 py-1 text-[10px] font-medium rounded",
            "text-[var(--tp-red)]",
            "hover:bg-[var(--tp-red)]/10",
            "transition-colors"
          )}
        >
          Cancel All
        </button>
      )}
    </div>
  );
});

export default BulkActions;
