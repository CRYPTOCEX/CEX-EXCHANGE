"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

export interface Order {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_MARKET" | "STOP_LIMIT";
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "CANCELED" | "CLOSED" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
}

interface OrderRowProps {
  order: Order;
  onCancel: (id: string, createdAt: string) => void;
  onModify?: (id: string, updates: Partial<Order>) => void;
  showSymbol?: boolean;
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

export const OrderRow = memo(function OrderRow({
  order,
  onCancel,
  onModify,
  showSymbol = true,
  pricePrecision,
  amountPrecision,
}: OrderRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isBuy = order.side === "BUY";
  const fillPercentage = order.amount > 0 ? (order.filled / order.amount) * 100 : 0;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "grid gap-2 items-center",
        showSymbol ? "grid-cols-8" : "grid-cols-7",
        "px-3 py-2",
        "text-xs font-mono",
        "border-b border-[var(--tp-border)]",
        "hover:bg-[var(--tp-bg-tertiary)]/50",
        "transition-colors"
      )}
    >
      {/* Time */}
      <span className="text-[var(--tp-text-muted)]">{formatTime(order.createdAt)}</span>

      {/* Symbol */}
      {showSymbol && (
        <span className="text-[var(--tp-text-secondary)]">{order.symbol}</span>
      )}

      {/* Side & Type */}
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "font-medium",
            isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
          )}
        >
          {order.side}
        </span>
        <span className="text-[var(--tp-text-muted)]">{order.type.replace("_", " ")}</span>
      </div>

      {/* Price */}
      <span className="text-[var(--tp-text-primary)] text-right">
        {formatPrice(order.price, pricePrecision)}
      </span>

      {/* Amount */}
      <span className="text-[var(--tp-text-secondary)] text-right">
        {formatAmount(order.amount, amountPrecision)}
      </span>

      {/* Filled */}
      <div className="text-right">
        <span className="text-[var(--tp-text-secondary)]">{formatAmount(order.filled, amountPrecision)}</span>
        <div className="w-full h-1 bg-[var(--tp-bg-tertiary)] rounded-full mt-1">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isBuy ? "bg-[var(--tp-green)]" : "bg-[var(--tp-red)]"
            )}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Total */}
      <span className="text-[var(--tp-text-muted)] text-right">
        {formatPrice(order.price * order.amount, pricePrecision)}
      </span>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1">
        {onModify && (
          <button
            onClick={() => onModify(order.id, {})}
            className={cn(
              "p-1 rounded",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors",
              !isHovered && "opacity-0"
            )}
            title="Modify order"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onCancel(order.id, order.createdAt)}
          className={cn(
            "p-1 rounded",
            "text-[var(--tp-text-muted)] hover:text-[var(--tp-red)]",
            "hover:bg-[var(--tp-red)]/10",
            "transition-colors"
          )}
          title="Cancel order"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default OrderRow;
