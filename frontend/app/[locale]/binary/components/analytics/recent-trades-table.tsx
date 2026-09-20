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
import { Panel, PanelTitle, ToneChip, pnlTone, toneText } from "./analytics-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

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
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
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
  onViewAll,
}: RecentTradesTableProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const headCellClass =
    "px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";

  const displayedTrades = trades.slice(0, maxTrades);

  if (trades.length === 0) {
    return (
      <Panel className="p-6">
        <PanelTitle className="mb-4">{tCommon("recent_trades")}</PanelTitle>
        <div className="text-center py-8 text-muted-foreground">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p>{tCommon("no_trades_yet")}</p>
          <p className="text-xs mt-1">{t("your_recent_trades_will_appear_here")}</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <PanelTitle>{tCommon("recent_trades")}</PanelTitle>
        {onViewAll && trades.length > maxTrades && (
          <button
            onClick={onViewAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All ({trades.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-3">
            <tr>
              <th className={`${headCellClass} text-left`}>Time</th>
              <th className={`${headCellClass} text-left`}>Symbol</th>
              <th className={`${headCellClass} text-center`}>Side</th>
              <th className={`${headCellClass} text-right`}>Amount</th>
              <th className={`${headCellClass} text-right`}>P/L</th>
              <th className={`${headCellClass} text-center`}>Result</th>
            </tr>
          </thead>
          <tbody>
            {displayedTrades.map((trade) => {
              /*
                A LOSS COSTS THE STAKE. `BinaryOrderService.ts:2474` writes
                `profit = 0` on every losing row ("No profit on loss"), so
                `-Math.abs(profit)` was `-0` and a LOSS rendered **+0.00 in
                green** in the P&L column, immediately beside a Result column
                reading "LOSS". Two cells on one row disagreeing about whether
                the trader lost money.

                A DRAW is a genuine zero — the stake is returned — which is why
                the status is branched on rather than negated.
              */
              const profit = trade.profit || 0;
              const isWin = trade.status === "WIN";
              const pnl =
                isWin
                  ? profit
                  : trade.status === "LOSS"
                    ? -(profit ? Math.abs(profit) : Math.abs(trade.amount) || 0)
                    : 0;
              const bullish = isBullishSide(trade.side);

              return (
                <tr
                  key={trade.id}
                  className="border-t border-border hover:bg-surface-3/60 transition-colors"
                >
                  {/* Time */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">
                      {formatTime(trade.expiryTime)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(trade.expiryTime)}
                    </div>
                  </td>

                  {/* Symbol */}
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {formatSymbol(trade.symbol)}
                  </td>

                  {/* Side */}
                  <td className="px-4 py-3 text-center">
                    <ToneChip
                      tone={bullish ? "up" : "down"}
                      icon={bullish ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    >
                      {trade.side}
                    </ToneChip>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right text-sm text-foreground">
                    <MoneyFigure value={`${trade.amount.toFixed(2)} ${currency}`} />
                  </td>

                  {/* P/L */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold ${toneText[pnlTone(pnl)]}`}
                    >
                      <MoneyFigure value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ${currency}`} />
                    </span>
                  </td>

                  {/* Result */}
                  <td className="px-4 py-3 text-center">
                    <ToneChip
                      tone={isWin ? "up" : "down"}
                      icon={
                        isWin ? <TrendingUp size={12} /> : <TrendingDown size={12} />
                      }
                      className="font-semibold"
                    >
                      {trade.status}
                    </ToneChip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="px-6 py-3 bg-surface-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Showing {displayedTrades.length} of {trades.length} trades
          </span>
          <div className="flex items-center gap-4">
            <span className={toneText.up}>
              {displayedTrades.filter(t => t.status === "WIN").length} wins
            </span>
            <span className={toneText.down}>
              {displayedTrades.filter(t => t.status === "LOSS").length} losses
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
});

export default RecentTradesTable;
