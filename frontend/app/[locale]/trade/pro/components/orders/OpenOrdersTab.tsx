"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { OrderRow, type Order } from "./OrderRow";
import { EmptyState } from "./EmptyState";

interface OpenOrdersTabProps {
  orders: Order[];
  isLoading: boolean;
  onCancel: (id: string, createdAt: string) => void;
  onModify?: (id: string, updates: Partial<Order>) => void;
  showSymbol?: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const OpenOrdersTab = memo(function OpenOrdersTab({
  orders,
  isLoading,
  onCancel,
  onModify,
  showSymbol = true,
  pricePrecision,
  amountPrecision,
}: OpenOrdersTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {/* Header */}
        <div
          className={cn(
            "grid gap-2",
            showSymbol ? "grid-cols-8" : "grid-cols-7",
            "px-3 py-2",
            "text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide",
            "border-b border-[var(--tp-border)]"
          )}
        >
          <span>Time</span>
          {showSymbol && <span>Symbol</span>}
          <span>Side/Type</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Filled</span>
          <span className="text-right">Total</span>
          <span className="text-right">Action</span>
        </div>
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "grid gap-2",
              showSymbol ? "grid-cols-8" : "grid-cols-7",
              "px-3 py-3",
              "border-b border-[var(--tp-border)]"
            )}
          >
            {Array.from({ length: showSymbol ? 8 : 7 }).map((_, j) => (
              <div key={j} className="h-4 bg-[var(--tp-bg-tertiary)] rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return <EmptyState type="orders" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "grid gap-2 sticky top-0 z-10",
          showSymbol ? "grid-cols-8" : "grid-cols-7",
          "px-3 py-2",
          "text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide",
          "border-b border-[var(--tp-border)]",
          "bg-[var(--tp-bg-secondary)]"
        )}
      >
        <span>Time</span>
        {showSymbol && <span>Symbol</span>}
        <span>Side/Type</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Filled</span>
        <span className="text-right">Total</span>
        <span className="text-right">Action</span>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onCancel={onCancel}
            onModify={onModify}
            showSymbol={showSymbol}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        ))}
      </div>
    </div>
  );
});

export default OpenOrdersTab;
