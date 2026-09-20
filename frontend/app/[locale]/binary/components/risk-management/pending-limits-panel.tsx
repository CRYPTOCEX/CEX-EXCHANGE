"use client";

/**
 * Pending Limit Orders Panel
 *
 * Displays and manages pending limit orders.
 *
 * Colour: order side and price distance are direction (`up` / `down`). The
 * "expiring soon" chip is the only status here and is `warning` — with the hue
 * on the clock icon, because a 10px label on a warning tint measures 2.99:1 in
 * light mode.
 */

import { memo, useMemo } from "react";
import { Target, X, Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { LimitOrder } from "./risk-management-types";
import type { OrderSide } from "@/types/binary-trading";
import { Meter, Panel, PanelTitle, toneInk } from "./risk-ui";
import { useTranslations } from "next-intl";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

// ============================================================================
// TYPES
// ============================================================================

interface PendingLimitsPanelProps {
  orders: LimitOrder[];
  currentPrice: number;
  onCancel: (orderId: string) => void;
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return "Expired";

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCondition(condition: LimitOrder["condition"]): string {
  switch (condition) {
    case "above":
      return "Above";
    case "below":
      return "Below";
    case "cross_above":
      return "Cross ↑";
    case "cross_below":
      return "Cross ↓";
    default:
      return condition;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PendingLimitsPanel = memo(function PendingLimitsPanel({
  orders,
  currentPrice,
  onCancel,
  compact = false,
}: PendingLimitsPanelProps) {
  const t = useTranslations("binary_components");
  // Filter to only pending orders
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "WAITING"),
    [orders]
  );

  if (pendingOrders.length === 0) {
    return null;
  }

  return (
    <Panel
      headerClassName="px-3 py-2"
      bodyClassName="divide-y divide-border"
      header={
        <PanelTitle icon={<Target size={14} />} tone="accent" size="xs">
          Pending Limits ({pendingOrders.length})
        </PanelTitle>
      }
    >
      {pendingOrders.map((order) => {
        const priceDistance = order.limitPrice - currentPrice;
        const pricePercent = ((priceDistance / currentPrice) * 100).toFixed(2);
        const isAbove = priceDistance > 0;
        const timeRemaining = formatTimeRemaining(order.expiresAt);
        const isExpiringSoon = order.expiresAt - Date.now() < 5 * 60 * 1000;
        const bullish = isBullishSide(order.side);

        return (
          <div key={order.id} className="px-3 py-2 hover:bg-surface-2">
            <div className="flex items-center justify-between">
              {/* Order info */}
              <div className="flex items-center gap-2">
                {bullish ? (
                  <TrendingUp size={14} className="text-up" />
                ) : (
                  <TrendingDown size={14} className="text-down" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        bullish ? "text-up" : "text-down"
                      }`}
                    >
                      {order.side}
                    </span>
                    <span className="text-xs text-foreground">
                      {order.amount.toFixed(0)} USDT
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatCondition(order.condition)} {order.limitPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] ${isAbove ? "text-up" : "text-down"}`}
                    >
                      ({isAbove ? "+" : ""}
                      {pricePercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Time and cancel */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                    isExpiringSoon
                      ? "bg-warning/10 text-foreground"
                      : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <Clock
                    size={10}
                    className={isExpiringSoon ? toneInk("warning") : undefined}
                  />
                  {timeRemaining}
                </div>
                <button
                  type="button"
                  onClick={() => onCancel(order.id)}
                  aria-label={t("cancel_limit_order")}
                  className="p-1 rounded text-muted-foreground transition-colors hover:bg-surface-3 hover:text-destructive"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Progress to trigger */}
            {!compact && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">
                    {t("distance_to_trigger")}
                  </span>
                  <span className="text-foreground">
                    {Math.abs(priceDistance).toFixed(2)}
                  </span>
                </div>
                <Meter
                  height="h-1"
                  tone={bullish ? "up" : "down"}
                  percent={Math.max(5, 100 - Math.abs(parseFloat(pricePercent)) * 10)}
                />
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
});

export default PendingLimitsPanel;
