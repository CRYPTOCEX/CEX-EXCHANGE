"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  type: "orders" | "trades" | "positions";
  message?: string;
}

export const EmptyState = memo(function EmptyState({
  type,
  message,
}: EmptyStateProps) {
  const defaultMessages = {
    orders: "No open orders",
    trades: "No trade history",
    positions: "No open positions",
  };

  const icons = {
    orders: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--tp-text-muted)]/50">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
    trades: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--tp-text-muted)]/50">
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    positions: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--tp-text-muted)]/50">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      {icons[type]}
      <p className="mt-3 text-sm text-[var(--tp-text-muted)]">
        {message || defaultMessages[type]}
      </p>
    </div>
  );
});

export default EmptyState;
