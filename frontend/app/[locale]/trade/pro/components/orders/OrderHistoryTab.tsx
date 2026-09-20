"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { Order } from "./OrderRow";
import { EmptyState } from "./EmptyState";
import { SkeletonText } from "@/components/ui/skeleton";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

/**
 * The workspace paints from its own `--tp-*` ramp, so this is how a tone is
 * rendered here. It makes no status decision — `statusTone()` does that.
 */
const TONE_TEXT: Record<BadgeTone, string> = {
  primary: "text-[var(--tp-blue)]",
  secondary: "text-[var(--tp-text-secondary)]",
  success: "text-[var(--tp-green)]",
  warning: "text-[var(--tp-yellow)]",
  destructive: "text-[var(--tp-red)]",
  info: "text-[var(--tp-blue)]",
  neutral: "text-[var(--tp-text-muted)]",
};

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
  const t = useTranslations("trade_pro");
  const tTrade = useTranslations("trade");
  /**
   * THE COLUMN HEADER ROW USED TO DISAPPEAR WHILE LOADING.
   * ==========================================================================
   *
   * `if (isLoading) return <three rows of grey boxes>` returned a tree with no
   * header at all, so the sticky `Time / Symbol / Side/Type / Price / Amount /
   * Filled / Status` row — 27px of `text-[10px] uppercase` plus a border — was
   * absent and then appeared, pushing the first three rows down by 27px inside
   * a docked panel that does not itself move. Those seven captions are
   * literals; there was never anything to wait for.
   *
   * The pending rows were also mis-sized: `px-3 py-3` (48px) against
   * `HistoryOrderRow`'s own padding, and the `< sm` card variant reserved
   * three lines where the real card renders more. They are now built from the
   * real row's grid so the two states agree.
   *
   * `orders.length === 0` keeps its own branch and is reached only once
   * loading is done — it was already ordered correctly, and the `isLoading`
   * check above still precedes it, so "No order history" cannot fire during a
   * fetch.
   */
  if (orders.length === 0 && !isLoading) {
    return <EmptyState type="orders" message={tTrade("no_order_history")} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - hidden on mobile where rows render as stacked cards */}
      <div className="hidden sm:grid grid-cols-7 gap-2 px-3 py-2 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] sticky top-0 z-10">
        <span>Time</span>
        <span>Symbol</span>
        <span>{t("side_type")}</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Filled</span>
        <span className="text-right">Status</span>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading
          ? [0, 1, 2].map((i) => (
              <div
                key={`pending-history-${i}`}
                className="border-b border-[var(--tp-border)]"
              >
                {/* Same grid, same padding, same `text-xs` as a real row, so
                    the placeholder line boxes ARE the row height. */}
                <div className="hidden sm:grid grid-cols-7 gap-2 px-3 py-2 text-xs">
                  <span>
                    <SkeletonText placeholder="00:00:00" />
                  </span>
                  <span>
                    <SkeletonText placeholder="BTC/USDT" />
                  </span>
                  <span>
                    <SkeletonText placeholder={t("buy_limit")} />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="00000.00" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="0.0000" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="100%" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="FILLED" />
                  </span>
                </div>
                <div className="sm:hidden px-3 py-2 space-y-1 text-xs">
                  <p>
                    <SkeletonText placeholder={t("btc_usdt_buy_limit")} />
                  </p>
                  <p>
                    <SkeletonText placeholder="0.0000 @ 00000.00" />
                  </p>
                  <p>
                    <SkeletonText placeholder="FILLED  00:00:00" />
                  </p>
                </div>
              </div>
            ))
          : orders.map((order) => (
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

  const getStatusColor = (status: Order["status"]) =>
    TONE_TEXT[statusTone(status)];

  // Normalize status display (standardize to CANCELLED)
  const getStatusDisplay = (status: Order["status"]) => {
    if (status === "CANCELED") return "CANCELLED";
    return status;
  };

  return (
    <>
      {/* Mobile card layout (< sm) */}
      <div className="sm:hidden px-3 py-3 border-b border-[var(--tp-border)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
            <span className={cn("text-sm font-semibold", isBuy ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]")}>
              {order.side}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">
              {order.type.replace("_", " ")}
            </span>
            <span className="text-xs text-[var(--tp-text-secondary)] truncate">{order.symbol}</span>
          </div>
          <span className={cn("shrink-0 text-[10px] font-semibold uppercase", getStatusColor(order.status))}>
            {getStatusDisplay(order.status)}
          </span>
        </div>

        <div className="mt-2 space-y-1 text-xs font-mono">
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Price</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-primary)]">
              {formatPrice(order.price, pricePrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Amount</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-secondary)]">
              {formatAmount(order.amount, amountPrecision)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--tp-text-muted)]">Filled</span>
            <span className="min-w-0 flex-1 text-right break-all text-[var(--tp-text-secondary)]">
              {formatAmount(order.filled, amountPrecision)}
            </span>
          </div>
        </div>

        <div className="mt-1.5 text-[10px] font-mono text-[var(--tp-text-muted)]">
          {formatTime(order.createdAt)}
        </div>
      </div>

      {/* Table row layout (>= sm): unchanged */}
      <div
        className={cn(
          "hidden sm:grid grid-cols-7 gap-2 items-center",
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
    </>
  );
});

export default OrderHistoryTab;
