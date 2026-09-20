"use client";

import React, { memo, useState, useMemo, useEffect } from "react";
import { BarChart3, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { $fetch } from "@/lib/api";
import { API_ENDPOINTS } from "../../utils/constants";
import { PnLChart } from "./PnLChart";
import { WinRateCard } from "./WinRateCard";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { TradeDistribution } from "./TradeDistribution";
import { VolumeStats } from "./VolumeStats";
import { useTranslations } from "next-intl";

interface AnalyticsPanelProps {
  className?: string;
  /**
   * Supplied when the panel is presented as a full view — it then renders the
   * dismiss control in the header row it already owns, so the overlay does not
   * have to stack a second header just to hold a close button.
   */
  onClose?: () => void;
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

/** Shape returned by GET /api/exchange/trading/analytics. */
interface AnalyticsResponse {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  /*
    NULLABLE, because the endpoint reports null when no order source carries a
    per-order P&L — which is every install today. See the note on `tradeStats`.
    `totalTrades` and `totalVolume` are NOT nullable: those are real.
  */
  winRate: number | null;
  totalPnl: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  totalVolume: number;
  largestWin: number | null;
  largestLoss: number | null;
  expectancy: number | null;
  /** Whether the P&L-derived figures above mean anything. */
  pnlMeasured?: boolean;
  bySymbol: Record<string, { trades: number; pnl: number; volume: number }>;
  byMarketType: Record<string, { trades: number; pnl: number; volume: number }>;
  series: Array<{
    timestamp: number;
    pnl: number;
    cumulative: number;
    trades: number;
    volume: number;
  }>;
  byHour: Array<{ hour: number; trades: number; pnl: number; volume: number }>;
}

/**
 * The API's `period` parameter for each selectable range. These strings must match
 * the enum the endpoint accepts — an unrecognised value falls through to all-time,
 * which would silently show the wrong window rather than erroring.
 */
const RANGE_TO_PERIOD: Record<TimeRange, string> = {
  "1D": "day",
  "1W": "week",
  "1M": "month",
  "3M": "quarter",
  "1Y": "year",
  ALL: "all",
};

export const AnalyticsPanel = memo(function AnalyticsPanel({
  className,
  onClose,
}: AnalyticsPanelProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real trading history. `$fetch` always resolves {data,error} and never throws,
  // so this reads the envelope rather than wrapping it in try/catch.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const { data: res, error } = await $fetch<AnalyticsResponse>({
        url: `${API_ENDPOINTS.ANALYTICS}?period=${RANGE_TO_PERIOD[timeRange]}`,
        silentSuccess: true,
        silent: true,
      });
      if (cancelled) return;
      setData(error || !res ? null : res);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const pnlData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        timestamp: p.timestamp,
        pnl: p.pnl,
        cumulative: p.cumulative,
      })),
    [data]
  );

  const tradeStats = useMemo(
    () => ({
      totalTrades: data?.totalTrades ?? 0,
      winningTrades: data?.winningTrades ?? 0,
      losingTrades: data?.losingTrades ?? 0,
      /*
        `?? null`, NOT `?? 0`. The endpoint now returns null for every
        P&L-derived figure when no order source carries a P&L — which is every
        install today, because no order table on this platform stores one.
        Coercing that to 0 is what published "Total P&L +$0.00 / Win Rate 0.0% /
        Profit Factor 0.00" to every trader, and — since `avgWin / avgLoss` was
        `0 / 0` — Risk/Reward "1:NaN" and Edge "NaN%" beneath a red
        "negative edge" verdict.
      */
      avgWin: data?.avgWin ?? null,
      avgLoss: data?.avgLoss ?? null,
      largestWin: data?.largestWin ?? null,
      largestLoss: data?.largestLoss ?? null,
      // Not derivable from closed-order rows today: they carry no open timestamp.
      avgHoldTime: "—",
      profitFactor: data?.profitFactor ?? null,
      expectancy: data?.expectancy ?? null,
      pnlMeasured: data?.pnlMeasured ?? false,
    }),
    [data]
  );

  const volumeByPair = useMemo(
    () =>
      Object.entries(data?.bySymbol ?? {})
        .map(([pair, v]) => ({ pair, volume: v.volume, trades: v.trades, pnl: v.pnl }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8),
    [data]
  );

  const tradesByHour = useMemo(
    () =>
      data?.byHour ??
      Array.from({ length: 24 }, (_, hour) => ({ hour, trades: 0, pnl: 0 })),
    [data]
  );

  // Null means "not measured", which is a different claim from zero — see the
  // note on `tradeStats` above.
  const totalPnL = data?.totalPnl ?? null;
  const pnlMeasured = data?.pnlMeasured ?? false;
  // Last bucket in the series is the most recent day with activity.
  const todayPnL = pnlMeasured && pnlData.length ? pnlData[pnlData.length - 1].pnl : null;
  const winRate = data?.winRate ?? null;

  return (
    <div className={cn("tp-analytics-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/*
        Header — deliberately the same shape as `OverlayHeader` in binary-ui,
        which the Pattern Library's full view uses: icon well (p-2 rounded-xl,
        20px glyph) + text-lg title + text-xs subtitle, on px-6 py-4. Written
        out rather than imported because this row also carries the time-range
        selector, and OverlayHeader takes only trailing actions. Same metrics
        means both full views open at the same header height and share one
        24px gutter; the tokens are the --tp-* aliases of the very same
        Obsidian tokens (--tp-blue = primary, --tp-border = border).
      */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--tp-blue-bg)]">
            <BarChart3 size={20} className="text-[var(--tp-blue)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--tp-text-primary)]">
              {tCommon("trading_analytics")}
            </h2>
            <p className="text-xs text-[var(--tp-text-muted)]">
              {t("performance_overview_and_statistics")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex gap-1 bg-[var(--tp-bg-tertiary)] rounded-lg p-1">
            {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                aria-pressed={timeRange === range}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                  timeRange === range
                    ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
                    : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/*
            Same button as `OverlayIconButton` (the Pattern Library's close),
            expressed in this panel's token vocabulary: p-2 / rounded-lg / 18px
            glyph, secondary ink lifting to primary on a surface-3 hover well.
            `cursor-pointer` is spelled out because Tailwind v4 dropped the
            preflight `button { cursor: pointer }`.
          */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close_analytics")}
              title={t("close_analytics")}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-[var(--tp-text-secondary)] transition-colors hover:bg-[var(--tp-bg-tertiary)] hover:text-[var(--tp-text-primary)]"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards — px-6 so the cards line up with the header gutter. */}
      <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-[var(--tp-border)]">
        <SummaryCard
          label={tCommon("total_p_l")}
          value={totalPnL}
          format="currency"
        />
        <SummaryCard
          label={t("todays_p_l")}
          value={todayPnL}
          format="currency"
        />
        <SummaryCard label={tCommon("win_rate")} value={winRate} format="percent" />
        <SummaryCard
          label={tCommon("profit_factor")}
          value={tradeStats.profitFactor}
          format="number"
        />
      </div>

      {/* Charts Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-[var(--tp-text-muted)]">
            {t("loading_analytics")}…
          </div>
        ) : tradeStats.totalTrades === 0 ? (
          // No closed trades in this window. Say so rather than drawing an empty
          // chart that reads as a real flat result.
          <div className="h-full flex flex-col items-center justify-center gap-1 text-center">
            <div className="text-sm text-[var(--tp-text-secondary)]">
              {t("no_closed_trades_in_this_period")}
            </div>
            <div className="text-xs text-[var(--tp-text-muted)]">
              {t("analytics_appear_once_you_have_completed_trades")}
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* P&L Chart - Full width */}
          <div className="col-span-2">
            <PnLChart data={pnlData} timeRange={timeRange} />
          </div>

          {/* Win Rate */}
          <WinRateCard stats={tradeStats} />

          {/* Performance Metrics */}
          <PerformanceMetrics stats={tradeStats} />

          {/* Trade Distribution by Pair */}
          <TradeDistribution data={volumeByPair} />

          {/* Volume Stats */}
          <VolumeStats hourlyData={tradesByHour} />
        </div>
        )}
      </div>
    </div>
  );
});

// Summary Card Component
interface SummaryCardProps {
  label: string;
  /** Null means the figure could not be measured — see the note in the card. */
  value: number | null;
  format: "currency" | "percent" | "number";
}

const SummaryCard = memo(function SummaryCard({
  label,
  value,
  format,
}: SummaryCardProps) {
  /*
    A NULL IS NOT A ZERO. It reaches this card when the endpoint could not
    measure the figure at all, and rendering it as `+$0.00` in green was the
    whole defect: a trader could not tell "you have made nothing" from "we do
    not know". The em dash is also deliberately NOT tinted — a colour is a
    verdict, and there is none here.
  */
  const measured = value !== null && value !== undefined && Number.isFinite(value);

  const formatValue = () => {
    if (!measured) return "—";
    switch (format) {
      case "currency":
        return `${value! >= 0 ? "+" : ""}$${Math.abs(value!).toFixed(2)}`;
      case "percent":
        return `${value!.toFixed(1)}%`;
      case "number":
        return value!.toFixed(2);
    }
  };

  const isPositive = measured && value! >= 0;

  return (
    <div className="bg-[var(--tp-bg-tertiary)] rounded-lg p-3">
      <div className="text-xs text-[var(--tp-text-muted)] mb-1">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold font-mono",
          !measured
            ? "text-[var(--tp-text-muted)]"
            : format === "currency" || format === "percent"
            ? isPositive
              ? "text-[var(--tp-green)]"
              : "text-[var(--tp-red)]"
            : "text-[var(--tp-text-primary)]"
        )}
      >
        {formatValue()}
      </div>
    </div>
  );
});

export default AnalyticsPanel;
