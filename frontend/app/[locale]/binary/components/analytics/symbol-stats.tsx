"use client";

/**
 * Symbol Statistics Component
 *
 * Performance breakdown by trading symbol.
 */

import { memo, useState, Fragment } from "react";
import { TrendingUp, TrendingDown, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import type { SymbolStats } from "@/types/binary-trading";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface SymbolStatsProps {
  data: SymbolStats[];
  currency?: string;
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
  theme = "dark",
}: SymbolStatsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [sortBy, setSortBy] = useState<"pnl" | "winrate" | "trades">("pnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const headerBgClass = theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100";
  const hoverBgClass = theme === "dark" ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50";
  const rowBorderClass = theme === "dark" ? "border-zinc-800/50" : "border-zinc-100";

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
      <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}>
          {t("statistics_by_symbol")}
        </h3>
        <div className={`text-center py-8 ${subtitleClass}`}>
          <BarChart2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>{t("no_symbol_data_yet")}</p>
          <p className="text-xs mt-1">{t("trade_different_symbols_to_see_performance")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      <div className="px-6 py-4">
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide`}>
          {t("statistics_by_symbol")}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={headerBgClass}>
            <tr>
              <th className={`px-4 py-2 text-left text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                Symbol
              </th>
              <th
                className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide cursor-pointer select-none`}
                onClick={() => toggleSort("trades")}
              >
                <div className="flex items-center justify-end gap-1">
                  Trades
                  <SortIcon field="trades" />
                </div>
              </th>
              <th
                className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide cursor-pointer select-none`}
                onClick={() => toggleSort("winrate")}
              >
                <div className="flex items-center justify-end gap-1">
                  {tCommon("win_rate")}
                  <SortIcon field="winrate" />
                </div>
              </th>
              <th
                className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide cursor-pointer select-none`}
                onClick={() => toggleSort("pnl")}
              >
                <div className="flex items-center justify-end gap-1">
                  P/L
                  <SortIcon field="pnl" />
                </div>
              </th>
              <th className={`px-4 py-2 text-right text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                {t("avg_win")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((stat, index) => {
              const isExpanded = expanded === stat.symbol;
              const isProfitable = stat.totalPnL >= 0;
              const isGoodWinRate = stat.winRate >= 50;

              return (
                <Fragment key={stat.symbol}>
                  <tr
                    className={`border-t ${rowBorderClass} ${hoverBgClass} transition-colors cursor-pointer`}
                    onClick={() => setExpanded(isExpanded ? null : stat.symbol)}
                  >
                    {/* Symbol */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isProfitable ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className={`font-medium ${textClass}`}>
                          {formatSymbol(stat.symbol)}
                        </span>
                      </div>
                    </td>

                    {/* Trades */}
                    <td className={`px-4 py-3 text-right text-sm ${textClass}`}>
                      {stat.totalTrades}
                      <span className={`text-xs ${subtitleClass} ml-1`}>
                        ({stat.wins}W/{stat.losses}L)
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          isGoodWinRate ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {stat.winRate.toFixed(1)}%
                      </span>
                    </td>

                    {/* P/L */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isProfitable ? (
                          <TrendingUp size={14} className="text-green-500" />
                        ) : (
                          <TrendingDown size={14} className="text-red-500" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            isProfitable ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {isProfitable ? "+" : ""}
                          {stat.totalPnL.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Avg Win */}
                    <td className={`px-4 py-3 text-right text-sm ${textClass}`}>
                      {stat.avgWinAmount.toFixed(2)} {currency}
                    </td>
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && (
                    <tr className={`${theme === "dark" ? "bg-zinc-800/30" : "bg-zinc-50"}`}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className={`text-xs ${subtitleClass} block`}>{t("best_trade")}</span>
                            <span className="text-green-500 font-semibold">
                              +{stat.bestTrade.toFixed(2)} {currency}
                            </span>
                          </div>
                          <div>
                            <span className={`text-xs ${subtitleClass} block`}>{t("worst_trade")}</span>
                            <span className="text-red-500 font-semibold">
                              {stat.worstTrade.toFixed(2)} {currency}
                            </span>
                          </div>
                          <div>
                            <span className={`text-xs ${subtitleClass} block`}>{t("avg_loss")}</span>
                            <span className={textClass}>
                              -{stat.avgLossAmount.toFixed(2)} {currency}
                            </span>
                          </div>
                          <div>
                            <span className={`text-xs ${subtitleClass} block`}>{t("profit_factor")}</span>
                            <span className={textClass}>
                              {stat.profitFactor === Infinity ? "∞" : stat.profitFactor.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Win rate bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={subtitleClass}>{t("win_loss_distribution")}</span>
                            <span className={subtitleClass}>
                              {stat.wins}W / {stat.losses}L
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-700 overflow-hidden flex">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${stat.winRate}%` }}
                            />
                            <div
                              className="h-full bg-red-500 transition-all"
                              style={{ width: `${100 - stat.winRate}%` }}
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
      <div className={`px-6 py-3 ${headerBgClass} border-t ${rowBorderClass}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={subtitleClass}>
            {data.length} symbol{data.length !== 1 ? "s" : ""} traded
          </span>
          <div className="flex items-center gap-4">
            <span className="text-green-500">
              {data.filter(s => s.totalPnL > 0).length} profitable
            </span>
            <span className="text-red-500">
              {data.filter(s => s.totalPnL < 0).length} unprofitable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SymbolStatistics;
