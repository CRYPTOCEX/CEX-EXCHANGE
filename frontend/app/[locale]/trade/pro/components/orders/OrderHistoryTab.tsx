"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { Order } from "./OrderRow";
import { EmptyState } from "./EmptyState";

interface OrderHistoryTabProps {
  orders: Order[];
  isLoading: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const OrderHistoryTab = memo(function OrderHistoryTab({
  orders,
  isLoading,
  pricePrecision,
  amountPrecision,
}: OrderHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-7 gap-2 px-3 py-3 border-b border-[var(--tp-border)]"
          >
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="h-4 bg-[var(--tp-bg-tertiary)] rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return <EmptyState type="orders" message="No order history" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-7 gap-2 px-3 py-2 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] sticky top-0 z-10">
        <span>Time</span>
        <span>Symbol</span>
        <span>Side/Type</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Filled</span>
        <span className="text-right">Status</span>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        {orders.map((order) => (
          <HistoryOrderRow
            key={order.id}
            order={order}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        ))}
      </div>
    </div>
  );
});

interface HistoryOrderRowProps {
  order: Order;
  pricePrecision?: number;
  amountPrecision?: number;
}

// Format price with precision or smart fallback
const formatPrice = (price: number, precision?: number): string => {
  if (precision !== undefined) return price.toFixed(precision);
  // Fallback to smart formatting
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
};

// Format amount with precision or smart fallback
const formatAmount = (amount: number, precision?: number): string => {
  if (precision !== undefined) return amount.toFixed(precision);
  // Fallback to smart formatting
  if (amount >= 1000) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(6);
};

const HistoryOrderRow = memo(function HistoryOrderRow({
  order,
  pricePrecision,
  amountPrecision,
}: HistoryOrderRowProps) {
  const isBuy = order.side === "BUY";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "FILLED":
        return "text-[var(--tp-green)]";
      case "CLOSED":
        return "text-[var(--tp-text-secondary)]";
      case "CANCELLED":
      case "CANCELED":
        return "text-[var(--tp-red)]";
      case "EXPIRED":
        return "text-[var(--tp-yellow)]";
      case "PARTIALLY_FILLED":
        return "text-[var(--tp-blue)]";
      default:
        return "text-[var(--tp-text-muted)]";
    }
  };

  // Normalize status display (standardize to CANCELLED)
  const getStatusDisplay = (status: Order["status"]) => {
    if (status === "CANCELED") return "CANCELLED";
    return status;
  };

  return (
    <div
      className={cn(
        "grid grid-cols-7 gap-2 items-center",
        "px-3 py-2",
        "text-xs font-mono",
        "border-b border-[var(--tp-border)]",
        "hover:bg-[var(--tp-bg-tertiary)]/50"
      )}
    >
      <span className="text-[var(--tp-text-muted)]">{formatTime(order.createdAt)}</span>
      <span className="text-[var(--tp-text-secondary)]">{order.symbol}</span>
      <div>
        <span className={cn("font-medium", isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
          {order.side}
        </span>
        <span className="text-[var(--tp-text-muted)] ml-1">{order.type.replace("_", " ")}</span>
      </div>
      <span className="text-[var(--tp-text-primary)] text-right">{formatPrice(order.price, pricePrecision)}</span>
      <span className="text-[var(--tp-text-secondary)] text-right">{formatAmount(order.amount, amountPrecision)}</span>
      <span className="text-[var(--tp-text-secondary)] text-right">{formatAmount(order.filled, amountPrecision)}</span>
      <span className={cn("text-right text-[10px] uppercase", getStatusColor(order.status))}>
        {getStatusDisplay(order.status)}
      </span>
    </div>
  );
});

export default OrderHistoryTab;
