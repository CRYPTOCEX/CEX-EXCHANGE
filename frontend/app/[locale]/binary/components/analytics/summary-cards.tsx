"use client";

/**
 * Summary Cards Component
 *
 * Displays key trading metrics in card format.
 *
 * The tile itself lives in analytics-ui.tsx — it was rebuilt in four files.
 */

import { memo } from "react";
import { MoneyFigure } from "@/components/ui/money-figure";
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
import { StatTile, pnlTone, winRateTone } from "./analytics-ui";
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
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
  theme?: "dark" | "light";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SummaryCards = memo(function SummaryCards({
  stats,
  advancedMetrics,
  currentBalance,
  startingBalance,
  currency = "USDT",
}: SummaryCardsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const iconClass = "text-muted-foreground";
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
      <StatTile
        title={tCommon("total_trades")}
        value={stats.totalTrades.toString()}
        subtitle={`${stats.wins}W / ${stats.losses}L / ${stats.draws}D`}
        icon={<Activity size={iconSize} className={iconClass} />}
      />

      {/* Win Rate */}
      <StatTile
        title={tCommon("win_rate")}
        value={formatPercent(stats.winRate)}
        subtitle={t("winning_trades", { wins: String(stats.wins) })}
        icon={<Target size={iconSize} className={iconClass} />}
        tone={winRateTone(stats.winRate)}
      />

      {/* Total P/L */}
      <StatTile
        title={tCommon("total_p_l")}
        value={<MoneyFigure value={`${formatCurrency(stats.totalPnL)} ${currency}`} />}
        subtitle={`${formatPercent(balanceChangePercent)} from start`}
        icon={
          stats.totalPnL >= 0 ? (
            <TrendingUp size={iconSize} className="text-up" />
          ) : (
            <TrendingDown size={iconSize} className="text-down" />
          )
        }
        tone={pnlTone(stats.totalPnL)}
      />

      {/* Current Balance */}
      <StatTile
        title={tCommon("current_balance")}
        value={`${currentBalance.toFixed(2)} ${currency}`}
        subtitle={`Started: ${startingBalance.toFixed(2)}`}
        icon={<DollarSign size={iconSize} className={iconClass} />}
        tone={pnlTone(balanceChange)}
      />

      {/* Best Trade */}
      <StatTile
        title={t("best_trade")}
        value={<MoneyFigure value={`${formatCurrency(stats.bestTrade)} ${currency}`} />}
        subtitle={t("single_trade_profit")}
        icon={<Award size={iconSize} className="text-up" />}
        tone="up"
      />

      {/* Worst Trade */}
      <StatTile
        title={t("worst_trade")}
        value={<MoneyFigure value={`${formatCurrency(stats.worstTrade)} ${currency}`} />}
        subtitle={t("single_trade_loss")}
        icon={<AlertTriangle size={iconSize} className="text-down" />}
        tone="down"
      />

      {/* Profit Factor */}
      <StatTile
        title={tCommon("profit_factor")}
        value={
          advancedMetrics.profitFactor === Infinity
            ? "∞"
            : advancedMetrics.profitFactor.toFixed(2)
        }
        subtitle={tCommon("gross_profit_gross_loss")}
        icon={<Percent size={iconSize} className={iconClass} />}
        tone={advancedMetrics.profitFactor >= 1 ? "up" : "down"}
      />

      {/* Max Drawdown — a risk statistic, so the caution hue rides the icon
          and the figure keeps neutral ink. */}
      <StatTile
        title={tCommon("max_drawdown")}
        value={formatPercent(advancedMetrics.maxDrawdownPercent)}
        subtitle={`${advancedMetrics.maxDrawdown.toFixed(2)} ${currency}`}
        icon={<TrendingDown size={iconSize} className="text-warning" />}
      />
    </div>
  );
});

export default SummaryCards;
