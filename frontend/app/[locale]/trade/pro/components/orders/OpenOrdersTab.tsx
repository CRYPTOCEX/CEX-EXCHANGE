"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import { OrderRow, type Order } from "./OrderRow";
import { EmptyState } from "./EmptyState";
import { SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface OpenOrdersTabProps {
  orders: Order[];
  isLoading: boolean;
  /**
   * The open-order request came back with an error rather than a list.
   *
   * Without it, no rows means "No open orders" — and that is a claim about the
   * customer's money that this panel is in no position to make when the request
   * failed. `$fetch` never throws (it returns `{data, error}`), and both order
   * reads here pass `silent: true`, so a 500 arrives looking exactly like an
   * empty account: no toast, no banner, an empty list, and — because the Cancel
   * All button is rendered off the same list — no bulk exit either. A customer
   * with an order resting in the book was shown a panel telling them they had
   * none.
   */
  loadFailed?: boolean;
  onCancel: (id: string, createdAt: string) => void;
  onModify?: (id: string, updates: Partial<Order>) => void;
  showSymbol?: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const OpenOrdersTab = memo(function OpenOrdersTab({
  orders,
  isLoading,
  loadFailed = false,
  onCancel,
  onModify,
  showSymbol = true,
  pricePrecision,
  amountPrecision,
}: OpenOrdersTabProps) {
  const t = useTranslations("trade_pro");
  /**
   * ONE tree, and the header is no longer a SECOND COPY of itself.
   * ==========================================================================
   *
   * This tab already rendered a column header while loading — but a duplicate
   * one, and the duplicate had already drifted: it was missing `sticky top-0
   * z-10` and `bg-[var(--tp-bg-secondary)]`, so the pending header scrolled
   * away with the rows and the real one does not, and it sat on a transparent
   * ground. The root was `flex flex-col` against the real `flex flex-col
   * h-full`, so the pending tab did not fill its panel.
   *
   * The rows were `px-3 py-3` (a 40px row) against the real `OrderRow`, and
   * their cells were `h-4` boxes rather than placeholders inside the cells, so
   * they could not track the workspace font-scale setting.
   *
   * Now there is one header, one row grid, and `isLoading` swaps only what
   * goes in the cells.
   */
  if (!isLoading && orders.length === 0) {
    // "We could not read your orders" and "you have no orders" are different
    // statements, and only one of them is safe to make on its own authority.
    // EmptyState's copy is hardcoded English throughout this panel; the message
    // is passed the same way rather than through a new i18n key.
    return loadFailed ? (
      <EmptyState
        type="orders"
        message="Could not load your open orders — this is not the same as having none. Retry, or use Cancel All."
      />
    ) : (
      <EmptyState type="orders" />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - hidden on mobile where rows render as stacked cards */}
      <div
        className={cn(
          "hidden sm:grid gap-2 sticky top-0 z-10",
          showSymbol ? "grid-cols-8" : "grid-cols-7",
          "px-3 py-2",
          "text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide",
          "border-b border-[var(--tp-border)]",
          "bg-[var(--tp-bg-secondary)]"
        )}
      >
        <span>Time</span>
        {showSymbol && <span>Symbol</span>}
        <span>{t("side_type")}</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Filled</span>
        <span className="text-right">Total</span>
        <span className="text-right">Action</span>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading
          ? [0, 1, 2].map((i) => (
              <div
                key={`pending-open-${i}`}
                className="border-b border-[var(--tp-border)]"
              >
                <div
                  className={cn(
                    "hidden sm:grid gap-2",
                    showSymbol ? "grid-cols-8" : "grid-cols-7",
                    "px-3 py-2 text-xs"
                  )}
                >
                  <span>
                    <SkeletonText placeholder="00:00:00" />
                  </span>
                  {showSymbol && (
                    <span>
                      <SkeletonText placeholder="BTC/USDT" />
                    </span>
                  )}
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
                    <SkeletonText placeholder="0%" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="0000.00" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonText placeholder="Cancel" />
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
                    <SkeletonText placeholder="0% filled  00:00:00" />
                  </p>
                </div>
              </div>
            ))
          : orders.map((order) => (
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
