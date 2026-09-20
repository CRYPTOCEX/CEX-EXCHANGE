"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";

export interface Order {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_MARKET" | "STOP_LIMIT";
  price: number;
  // Trigger price for conditional (stop) orders.
  stopPrice?: number;
  amount: number;
  filled: number;
  remaining: number;
  status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "CANCELED" | "CLOSED" | "EXPIRED";
  // True for a resting conditional (stop) order (lives in stop_orders until its
  // trigger price is reached).
  isStop?: boolean;
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
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPrice, setEditPrice] = useState<string>(String(order.price));
  const [editAmount, setEditAmount] = useState<string>(String(order.amount));
  const [editStopPrice, setEditStopPrice] = useState<string>(
    order.stopPrice != null ? String(order.stopPrice) : ""
  );
  const isBuy = order.side === "BUY";
  const fillPercentage = order.amount > 0 ? (order.filled / order.amount) * 100 : 0;
  const isStopType =
    order.type === "STOP_LIMIT" || order.type === "STOP_MARKET" || !!order.isStop;

  // LIMIT orders and resting STOP orders can be modified (both via
  // cancel + replace in handleModify). MARKET fills immediately — not editable.
  // A stop-market row has no limit price, only the trigger.
  const canModify =
    !!onModify && (order.type === "LIMIT" || isStopType);
  const hasLimitPrice = order.type === "LIMIT" || order.type === "STOP_LIMIT";

  const openEdit = () => {
    setEditPrice(String(order.price));
    setEditAmount(String(order.amount));
    setEditStopPrice(order.stopPrice != null ? String(order.stopPrice) : "");
    setShowEdit(true);
  };

  const saveEdit = () => {
    const updates: Partial<Order> = { amount: Number(editAmount) };
    if (hasLimitPrice) updates.price = Number(editPrice);
    if (isStopType) updates.stopPrice = Number(editStopPrice);
    onModify?.(order.id, updates);
    setShowEdit(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Inline edit form (shown for both mobile and desktop when the pencil is clicked).
  if (showEdit) {
    return (
      <div className="px-3 py-3 border-b border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]/40">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              "text-xs font-semibold",
              isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
            )}
          >
            {order.side}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">
            {order.type.replace("_", " ")}
          </span>
          <span className="text-xs text-[var(--tp-text-secondary)]">{order.symbol}</span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {isStopType && (
            <label className="flex flex-col gap-0.5 min-w-[90px] flex-1">
              <span className="text-[10px] uppercase tracking-wide text-[var(--tp-yellow)]">Trigger</span>
              <input
                type="number"
                inputMode="decimal"
                value={editStopPrice}
                step={pricePrecision !== undefined ? Math.pow(10, -pricePrecision) : "any"}
                onChange={(e) => setEditStopPrice(e.target.value)}
                className="w-full px-2 py-1 text-xs font-mono bg-[var(--tp-bg-secondary)] border border-[var(--tp-border)] rounded text-[var(--tp-text-primary)] outline-none focus:border-[var(--tp-blue)]"
              />
            </label>
          )}
          {hasLimitPrice && (
          <label className="flex flex-col gap-0.5 min-w-[90px] flex-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">
              {isStopType ? tCommon("limit_price") : tCommon("price")}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={editPrice}
              step={pricePrecision !== undefined ? Math.pow(10, -pricePrecision) : "any"}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full px-2 py-1 text-xs font-mono bg-[var(--tp-bg-secondary)] border border-[var(--tp-border)] rounded text-[var(--tp-text-primary)] outline-none focus:border-[var(--tp-blue)]"
            />
          </label>
          )}
          <label className="flex flex-col gap-0.5 min-w-[90px] flex-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Amount</span>
            <input
              type="number"
              inputMode="decimal"
              value={editAmount}
              step={amountPrecision !== undefined ? Math.pow(10, -amountPrecision) : "any"}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full px-2 py-1 text-xs font-mono bg-[var(--tp-bg-secondary)] border border-[var(--tp-border)] rounded text-[var(--tp-text-primary)] outline-none focus:border-[var(--tp-blue)]"
            />
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={saveEdit}
              className="px-2 py-1 text-[10px] font-medium rounded bg-[var(--tp-blue)] text-[var(--tp-blue-fg)] hover:opacity-90"
            >
              Save
            </button>
            <button
              onClick={() => setShowEdit(false)}
              className="px-2 py-1 text-[10px] font-medium rounded text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-elevated)]"
            >
              Cancel
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--tp-text-muted)]">
          {t("modifying_cancels_this_order_and_places")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout (< sm): stacked to avoid the dense grid overflowing
          and overlapping on narrow screens */}
      <div className="sm:hidden px-3 py-3 border-b border-[var(--tp-border)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
            <span
              className={cn(
                "text-sm font-semibold",
                isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}
            >
              {order.side}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">
              {order.type.replace("_", " ")}
            </span>
            {showSymbol && (
              <span className="text-xs text-[var(--tp-text-secondary)] truncate">
                {order.symbol}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5 -mr-1 -mt-0.5">
            {canModify && (
              <button
                onClick={openEdit}
                className={cn(
                  "p-1.5 rounded",
                  "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
                  "hover:bg-[var(--tp-bg-elevated)] transition-colors"
                )}
                title={tCommon("modify_order")}
                aria-label={tCommon("modify_order")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onCancel(order.id, order.createdAt)}
              className={cn(
                "p-1.5 rounded",
                "text-[var(--tp-text-muted)] hover:text-[var(--tp-red)]",
                "hover:bg-[var(--tp-red)]/10 transition-colors"
              )}
              title={tCommon("cancel_order")}
              aria-label={tCommon("cancel_order")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-xs font-mono">
          {isStopType && order.stopPrice != null && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Trigger</span>
              <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-yellow)]">
                {formatPrice(order.stopPrice, pricePrecision)}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">
              {order.type === "STOP_MARKET" ? tCommon("market") : tCommon("price")}
            </span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-primary)]">
              {order.type === "STOP_MARKET" ? "—" : formatPrice(order.price, pricePrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Amount</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-secondary)]">
              {formatAmount(order.amount, amountPrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Total</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-secondary)]">
              {formatPrice(order.price * order.amount, pricePrecision)}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-baseline justify-between gap-2 text-[10px] mb-1">
            <span className="min-w-0 break-all text-[var(--tp-text-muted)]">
              Filled{" "}
              <span className="font-mono text-[var(--tp-text-secondary)]">
                {formatAmount(order.filled, amountPrecision)}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[var(--tp-text-muted)]">{fillPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1 bg-[var(--tp-bg-tertiary)] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isBuy ? "bg-[var(--tp-green)]" : "bg-[var(--tp-red)]"
              )}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table row layout (>= sm): unchanged dense grid for tablet/desktop */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden sm:grid gap-2 items-center",
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

      {/* Price (+ trigger for stop orders) */}
      <span className="text-[var(--tp-text-primary)] text-right">
        {order.type === "STOP_MARKET" ? "—" : formatPrice(order.price, pricePrecision)}
        {isStopType && order.stopPrice != null && (
          <span
            className="block text-[9px] text-[var(--tp-yellow)]"
            title={tCommon("trigger_price")}
          >
            ⤳ {formatPrice(order.stopPrice, pricePrecision)}
          </span>
        )}
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
        {canModify && (
          <button
            onClick={openEdit}
            className={cn(
              "p-1 rounded",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors",
              !isHovered && "opacity-0"
            )}
            title={tCommon("modify_order")}
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
          title={tCommon("cancel_order")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      </div>
    </>
  );
});

export default OrderRow;
