"use client";

/**
 * Summary Cards Component
 *
 * Displays key trading metrics in card format.
 */

import { memo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Activity,
  Award,
  AlertTriangle,
  Percent,
} from "lucide-react";
import type { TradingStats } from "@/types/binary-trading";
import type { AdvancedMetrics } from "./use-trading-analytics";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface SummaryCardsProps {
  stats: TradingStats;
  advancedMetrics: AdvancedMetrics;
  currentBalance: number;
  startingBalance: number;
  currency?: string;
  theme?: "dark" | "light";
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  theme?: "dark" | "light";
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  theme = "dark",
}: StatCardProps) {
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const iconBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
        ? "text-red-500"
        : textClass;

  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-lg p-4 flex flex-col transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
          {title}
        </span>
        <div className={`${iconBgClass} p-2 rounded-lg`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold ${trendColor} mb-1`}>{value}</div>
      {subtitle && (
        <div className={`text-xs ${subtitleClass}`}>{subtitle}</div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SummaryCards = memo(function SummaryCards({
  stats,
  advancedMetrics,
  currentBalance,
  startingBalance,
  currency = "USDT",
  theme = "dark",
}: SummaryCardsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const iconClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const iconSize = 18;

  // Calculate balance change
  const balanceChange = currentBalance - startingBalance;
  const balanceChangePercent = startingBalance > 0
    ? ((currentBalance - startingBalance) / startingBalance) * 100
    : 0;

  // Format values
  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Trades */}
      <StatCard
        title={tCommon("total_trades")}
        value={stats.totalTrades.toString()}
        subtitle={`${stats.wins}W / ${stats.losses}L / ${stats.draws}D`}
        icon={<Activity size={iconSize} className={iconClass} />}
        theme={theme}
      />

      {/* Win Rate */}
      <StatCard
        title={tCommon("win_rate")}
        value={formatPercent(stats.winRate)}
        subtitle={`${stats.wins} winning trades`}
        icon={<Target size={iconSize} className={iconClass} />}
        trend={stats.winRate >= 50 ? "up" : "down"}
        theme={theme}
      />

      {/* Total P/L */}
      <StatCard
        title={tCommon("total_p_l")}
        value={`${formatCurrency(stats.totalPnL)} ${currency}`}
        subtitle={`${formatPercent(balanceChangePercent)} from start`}
        icon={
          stats.totalPnL >= 0 ? (
            <TrendingUp size={iconSize} className="text-green-500" />
          ) : (
            <TrendingDown size={iconSize} className="text-red-500" />
          )
        }
        trend={stats.totalPnL >= 0 ? "up" : "down"}
        theme={theme}
      />

      {/* Current Balance */}
      <StatCard
        title={tCommon("current_balance")}
        value={`${currentBalance.toFixed(2)} ${currency}`}
        subtitle={`Started: ${startingBalance.toFixed(2)}`}
        icon={<DollarSign size={iconSize} className={iconClass} />}
        trend={balanceChange >= 0 ? "up" : "down"}
        theme={theme}
      />

      {/* Best Trade */}
      <StatCard
        title={t("best_trade")}
        value={`${formatCurrency(stats.bestTrade)} ${currency}`}
        subtitle="Single trade profit"
        icon={<Award size={iconSize} className="text-green-500" />}
        trend="up"
        theme={theme}
      />

      {/* Worst Trade */}
      <StatCard
        title={t("worst_trade")}
        value={`${formatCurrency(stats.worstTrade)} ${currency}`}
        subtitle="Single trade loss"
        icon={<AlertTriangle size={iconSize} className="text-red-500" />}
        trend="down"
        theme={theme}
      />

      {/* Profit Factor */}
      <StatCard
        title={t("profit_factor")}
        value={
          advancedMetrics.profitFactor === Infinity
            ? "∞"
            : advancedMetrics.profitFactor.toFixed(2)
        }
        subtitle="Gross profit / gross loss"
        icon={<Percent size={iconSize} className={iconClass} />}
        trend={advancedMetrics.profitFactor >= 1 ? "up" : "down"}
        theme={theme}
      />

      {/* Max Drawdown */}
      <StatCard
        title={tCommon("max_drawdown")}
        value={formatPercent(advancedMetrics.maxDrawdownPercent)}
        subtitle={`${advancedMetrics.maxDrawdown.toFixed(2)} ${currency}`}
        icon={<TrendingDown size={iconSize} className="text-orange-500" />}
        trend="down"
        theme={theme}
      />
    </div>
  );
});

export default SummaryCards;
