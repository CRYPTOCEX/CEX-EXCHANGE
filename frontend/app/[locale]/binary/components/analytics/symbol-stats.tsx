"use client";

/**
 * Symbol Statistics Component
 *
 * Performance breakdown by trading symbol.
 *
 * Symbols are unbounded, so colour cannot carry symbol identity — the label
 * does. The marks in this table encode direction of money and win-rate
 * quality only, on the shared three-tone scale.
 */

import { memo, useState, Fragment } from "react";
import { TrendingUp, TrendingDown, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import type { SymbolStats } from "@/types/binary-trading";
import { useTranslations } from "next-intl";
import {
  Panel,
  PanelTitle,
  ToneDot,
  pnlTone,
  toneText,
  winRateTone,
} from "./analytics-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

// ============================================================================
// TYPES
// ============================================================================

interface SymbolStatsProps {
  data: SymbolStats[];
  currency?: string;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
  theme?: "dark" | "light";
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSymbol(symbol: string): string {
  return symbol.replace("USDT", "").replace("/", "");
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SymbolStatistics = memo(function SymbolStatistics({
  data,
  currency = "USDT",
}: SymbolStatsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [sortBy, setSortBy] = useState<"pnl" | "winrate" | "trades">("pnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const headCellClass =
    "px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "pnl":
        comparison = a.totalPnL - b.totalPnL;
        break;
      case "winrate":
        comparison = a.winRate - b.winRate;
        break;
      case "trades":
        comparison = a.totalTrades - b.totalTrades;
        break;
    }
    return sortDir === "desc" ? -comparison : comparison;
  });

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return null;
    return sortDir === "desc" ? (
      <ChevronDown size={14} />
    ) : (
      <ChevronUp size={14} />
    );
  };

  if (data.length === 0) {
    return (
      <Panel className="p-6">
        <PanelTitle className="mb-4">{t("statistics_by_symbol")}</PanelTitle>
        <div className="text-center py-8 text-muted-foreground">
          <BarChart2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>{t("no_symbol_data_yet")}</p>
          <p className="text-xs mt-1">{t("trade_different_symbols_to_see_performance")}</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-4">
        <PanelTitle>{t("statistics_by_symbol")}</PanelTitle>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-3">
            <tr>
              <th className={`${headCellClass} text-left`}>Symbol</th>
              <th
                className={`${headCellClass} text-right cursor-pointer select-none`}
                onClick={() => "({completedTradesCount} trades)"}
              >
                <div className="flex items-center justify-end gap-1">
                  Trades
                  <SortIcon field="trades" />
                </div>
              </th>
              <th
                className={`${headCellClass} text-right cursor-pointer select-none`}
                onClick={() => toggleSort("winrate")}
              >
                <div className="flex items-center justify-end gap-1">
                  {tCommon("win_rate")}
                  <SortIcon field="winrate" />
                </div>
              </th>
              <th
                className={`${headCellClass} text-right cursor-pointer select-none`}
                onClick={() => "PnL:"}
              >
                <div className="flex items-center justify-end gap-1">
                  P/L
                  <SortIcon field="pnl" />
                </div>
              </th>
              <th className={`${headCellClass} text-right`}>{tCommon("avg_win")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((stat) => {
              const isExpanded = expanded === stat.symbol;
              const isProfitable = stat.totalPnL >= 0;
              const pnlToneValue = pnlTone(stat.totalPnL);

              return (
                <Fragment key={stat.symbol}>
                  <tr
                    className="border-t border-border hover:bg-surface-3/60 transition-colors cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : stat.symbol)}
                  >
                    {/* Symbol */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ToneDot tone={pnlToneValue} />
                        <span className="font-medium text-foreground">
                          {formatSymbol(stat.symbol)}
                        </span>
                      </div>
                    </td>

                    {/* Trades */}
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      {stat.totalTrades}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({stat.wins}W/{stat.losses}L)
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${toneText[winRateTone(stat.winRate)]}`}
                      >
                        {stat.winRate.toFixed(1)}%
                      </span>
                    </td>

                    {/* P/L */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={toneText[pnlToneValue]}>
                          {isProfitable ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                        </span>
                        <span
                          className={`text-sm font-semibold ${toneText[pnlToneValue]}`}
                        >
                          {isProfitable ? "+" : ""}
                          {stat.totalPnL.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Avg Win */}
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      <MoneyFigure value={`${stat.avgWinAmount.toFixed(2)} ${currency}`} />
                    </td>
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && (
                    <tr className="bg-surface-3/60">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground block">{t("best_trade")}</span>
                            <span className={`font-semibold ${toneText.up}`}>
                              <MoneyFigure value={`+${stat.bestTrade.toFixed(2)} ${currency}`} />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t("worst_trade")}</span>
                            <span className={`font-semibold ${toneText.down}`}>
                              <MoneyFigure value={`${stat.worstTrade.toFixed(2)} ${currency}`} />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{tCommon("avg_loss")}</span>
                            <span className="text-foreground">
                              <MoneyFigure value={`-${stat.avgLossAmount.toFixed(2)} ${currency}`} />
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{tCommon("profit_factor")}</span>
                            <span className="text-foreground">
                              {stat.profitFactor === Infinity ? "∞" : stat.profitFactor.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Win rate bar. Two stacked fills get a 2px ground gap
                            between them so the boundary is a shape, not just a
                            hue change — up and down do not separate under
                            deuteranopia. The W/L counts above are the label. */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{t("win_loss_distribution")}</span>
                            <span className="text-muted-foreground">
                              {stat.wins}W / {stat.losses}L
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-3 overflow-hidden flex gap-0.5">
                            <div
                              className="h-full bg-up transition-all"
                              style={{ width: `calc(${stat.winRate}% - 1px)` }}
                            />
                            <div
                              className="h-full bg-down transition-all"
                              style={{ width: `calc(${100 - stat.winRate}% - 1px)` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-6 py-3 bg-surface-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {data.length} symbol{data.length !== 1 ? "s" : ""} traded
          </span>
          <div className="flex items-center gap-4">
            <span className={toneText.up}>
              {data.filter(s => s.totalPnL > 0).length} profitable
            </span>
            <span className={toneText.down}>
              {data.filter(s => s.totalPnL < 0).length} unprofitable
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
});

export default SymbolStatistics;
