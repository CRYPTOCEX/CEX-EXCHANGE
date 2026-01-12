"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

interface OrderBookSkeletonProps {
  rows?: number;
}

export const OrderBookSkeleton = memo(function OrderBookSkeleton({
  rows = 15,
}: OrderBookSkeletonProps) {
  return (
    <div className="tp-orderbook-skeleton flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-[var(--tp-border)]">
        <div className="flex gap-1">
          <div className="w-6 h-4 bg-[var(--tp-bg-tertiary)] rounded" />
          <div className="w-6 h-4 bg-[var(--tp-bg-tertiary)] rounded" />
          <div className="w-6 h-4 bg-[var(--tp-bg-tertiary)] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-12 h-4 bg-[var(--tp-bg-tertiary)] rounded" />
          <div className="w-4 h-4 bg-[var(--tp-bg-tertiary)] rounded" />
        </div>
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-2 px-2 py-1 border-b border-[var(--tp-border)]">
        <div className="w-16 h-5 bg-[var(--tp-bg-tertiary)] rounded" />
        <div className="w-12 h-5 bg-[var(--tp-bg-tertiary)] rounded" />
        <div className="w-10 h-5 bg-[var(--tp-bg-tertiary)] rounded" />
      </div>

      {/* Table Header skeleton */}
      <div className="grid grid-cols-3 gap-2 px-2 py-1 border-b border-[var(--tp-border-subtle)]">
        <div className="w-10 h-3 bg-[var(--tp-bg-tertiary)] rounded" />
        <div className="w-12 h-3 bg-[var(--tp-bg-tertiary)] rounded ml-auto" />
        <div className="w-10 h-3 bg-[var(--tp-bg-tertiary)] rounded ml-auto" />
      </div>

      {/* Asks skeleton */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={`ask-${i}`} index={i} side="ask" totalRows={rows} />
        ))}
      </div>

      {/* Spread skeleton */}
      <div className="flex items-center justify-center gap-3 py-1.5 px-2 border-y border-[var(--tp-border)]">
        <div className="w-20 h-5 bg-[var(--tp-bg-tertiary)] rounded" />
        <div className="w-24 h-3 bg-[var(--tp-bg-tertiary)] rounded" />
      </div>

      {/* Bids skeleton */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={`bid-${i}`} index={i} side="bid" totalRows={rows} />
        ))}
      </div>
    </div>
  );
});

interface RowSkeletonProps {
  index: number;
  side: "bid" | "ask";
  totalRows: number;
}

function RowSkeleton({ index, side, totalRows }: RowSkeletonProps) {
  // Vary widths for a more realistic look
  const widthPercent = 30 + Math.random() * 40;
  const opacity = 1 - index / totalRows * 0.5;

  return (
    <div
      className={cn(
        "relative",
        "grid grid-cols-3 gap-2",
        "px-2 py-0.5"
      )}
    >
      {/* Background bar */}
      <div
        className={cn(
          "absolute inset-y-0",
          side === "bid" ? "right-0 bg-[var(--tp-green)]/5" : "left-0 bg-[var(--tp-red)]/5"
        )}
        style={{ width: `${widthPercent}%`, opacity }}
      />

      {/* Price */}
      <div className="w-16 h-3 bg-[var(--tp-bg-tertiary)] rounded" style={{ opacity }} />

      {/* Amount */}
      <div className="w-12 h-3 bg-[var(--tp-bg-tertiary)] rounded ml-auto" style={{ opacity }} />

      {/* Total */}
      <div className="w-10 h-3 bg-[var(--tp-bg-tertiary)] rounded ml-auto" style={{ opacity }} />
    </div>
  );
}

export default OrderBookSkeleton;
