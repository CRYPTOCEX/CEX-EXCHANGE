"use client";

/**
 * Recent Trades Table Component
 *
 * Displays the most recent completed trades.
 */

import { memo } from "react";
import { Clock, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import type { CompletedOrder } from "@/store/trade/use-binary-store";
import type { OrderSide } from "@/types/binary-trading";
import { useTranslations } from "next-intl";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

// ============================================================================
// TYPES
// ============================================================================

interface RecentTradesTableProps {
  trades: CompletedOrder[];
  maxTrades?: number;
  currency?: string;
  theme?: "dark" | "light";
  onViewAll?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatSymbol(symbol: string): string {
  return symbol.replace("USDT", "").replace("/", "");
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RecentTradesTable = memo(function RecentTradesTable({
  trades,
  maxTrades = 10,
  currency = "USDT",
  theme = "dark",
  onViewAll,
}: RecentTradesTableProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const headerBgClass = theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100";
  const hoverBgClass = theme === "dark" ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50";
  const rowBorderClass = theme === "dark" ? "border-zinc-800/50" : "border-zinc-100";

  const displayedTrades = trades.slice(0, maxTrades);

  if (trades.length === 0) {
    return (
      <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}>
          {tCommon("recent_trades")}
        </h3>
        <div className={`text-center py-8 ${subtitleClass}`}>
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p>{tCommon("no_trades_yet")}</p>
          <p className="text-xs mt-1">{t("your_recent_trades_will_appear_here")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide`}>
          {tCommon("recent_trades")}
        </h3>
        {onViewAll && trades.length > maxTrades && (
          <button
            onClick={onViewAll}
            className={`text-xs ${subtitleClass} hover:text-white transition-colors`}
          >
            View All ({trades.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={headerBgClass}>
            <tr>
              <th className={`px-4 py-2 text-left text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Time
              </th>
              <th className={`px-4 py-2 text-left text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Symbol
              </th>
              <th className={`px-4 py-2 text-center text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Side
              </th>
              <th className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Amount
              </th>
              <th className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                P/L
              </th>
              <th className={`px-4 py-2 text-center text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTrades.map((trade, index) => {
              const profit = trade.profit || 0;
              const isWin = trade.status === "WIN";
              const pnl = isWin ? profit : -Math.abs(profit);

              return (
                <tr
                  key={trade.id}
                  className={`border-t ${rowBorderClass} ${hoverBgClass} transition-colors`}
                >
                  {/* Time */}
                  <td className="px-4 py-3">
                    <div className={`text-sm ${textClass}`}>
                      {formatTime(trade.expiryTime)}
                    </div>
                    <div className={`text-xs ${subtitleClass}`}>
                      {formatDate(trade.expiryTime)}
                    </div>
                  </td>

                  {/* Symbol */}
                  <td className={`px-4 py-3 text-sm font-medium ${textClass}`}>
                    {formatSymbol(trade.symbol)}
                  </td>

                  {/* Side */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        isBullishSide(trade.side)
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {isBullishSide(trade.side) ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                      {trade.side}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`px-4 py-3 text-right text-sm ${textClass}`}>
                    {trade.amount.toFixed(2)} {currency}
                  </td>

                  {/* P/L */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        pnl >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(2)} {currency}
                    </span>
                  </td>

                  {/* Result */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        isWin
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {isWin ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {trade.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className={`px-6 py-3 ${headerBgClass} border-t ${rowBorderClass}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={subtitleClass}>
            Showing {displayedTrades.length} of {trades.length} trades
          </span>
          <div className="flex items-center gap-4">
            <span className="text-green-500">
              {displayedTrades.filter(t => t.status === "WIN").length} wins
            </span>
            <span className="text-red-500">
              {displayedTrades.filter(t => t.status === "LOSS").length} losses
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RecentTradesTable;
