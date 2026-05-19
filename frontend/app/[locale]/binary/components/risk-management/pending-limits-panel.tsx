"use client";

/**
 * Pending Limit Orders Panel
 *
 * Displays and manages pending limit orders.
 */

import { memo, useMemo } from "react";
import {
  Target,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import type { LimitOrder } from "./risk-management-types";
import type { OrderSide } from "@/types/binary-trading";
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
  theme = "dark",
  compact = false,
}: PendingLimitsPanelProps) {
  const t = useTranslations("binary_components");
  // Filter to only pending orders
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "WAITING"),
    [orders]
  );

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  if (pendingOrders.length === 0) {
    return null;
  }

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div
        className={`px-3 py-2 border-b ${borderClass} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Target size={14} className="text-blue-500" />
          <span className={`text-xs font-medium ${textClass}`}>
            Pending Limits ({pendingOrders.length})
          </span>
        </div>
      </div>

      {/* Orders list */}
      <div className="divide-y divide-zinc-800">
        {pendingOrders.map((order) => {
          const priceDistance = order.limitPrice - currentPrice;
          const pricePercent = ((priceDistance / currentPrice) * 100).toFixed(2);
          const isAbove = priceDistance > 0;
          const timeRemaining = formatTimeRemaining(order.expiresAt);
          const isExpiringSoon = order.expiresAt - Date.now() < 5 * 60 * 1000;

          return (
            <div
              key={order.id}
              className={`px-3 py-2 ${
                theme === "dark" ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Order info */}
                <div className="flex items-center gap-2">
                  {isBullishSide(order.side) ? (
                    <TrendingUp size={14} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={14} className="text-red-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isBullishSide(order.side) ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {order.side}
                      </span>
                      <span className={`text-xs ${textClass}`}>
                        {order.amount.toFixed(0)} USDT
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] ${subtitleClass}`}>
                        {formatCondition(order.condition)} {order.limitPrice.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isAbove ? "text-emerald-500" : "text-red-500"
                        }`}
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
                        ? "bg-amber-500/10 text-amber-500"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <Clock size={10} />
                    {timeRemaining}
                  </div>
                  <button
                    onClick={() => onCancel(order.id)}
                    className={`p-1 rounded ${
                      theme === "dark"
                        ? "hover:bg-zinc-700 text-zinc-500 hover:text-red-500"
                        : "hover:bg-zinc-200 text-zinc-400 hover:text-red-500"
                    } transition-colors`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Progress to trigger */}
              {!compact && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className={subtitleClass}>{t("distance_to_trigger")}</span>
                    <span className={textClass}>
                      {Math.abs(priceDistance).toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`h-1 rounded-full overflow-hidden ${
                      theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isBullishSide(order.side) ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.max(
                          5,
                          100 - Math.abs(parseFloat(pricePercent)) * 10
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default PendingLimitsPanel;
