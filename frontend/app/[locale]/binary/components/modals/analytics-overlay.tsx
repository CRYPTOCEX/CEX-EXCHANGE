"use client";

/**
 * Analytics Overlay Component
 *
 * Full-screen overlay for displaying the analytics dashboard.
 * Replaces the modal version for a better UX.
 */

import { memo, useEffect, useState, useMemo } from "react";
import { X, BarChart2, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { AnalyticsDashboard } from "../analytics";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import {
  FullBleedOverlay,
  OverlayHeader,
  OverlayIconButton,
  OverlayStatsBar,
  OverlayStat,
  ToneMark,
} from "../binary-ui";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "dark" | "light";
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnalyticsOverlay = memo(function AnalyticsOverlay({
  isOpen,
  onClose,
  theme = "dark",
  isMobile = false,
}: AnalyticsOverlayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { fetchCompletedOrders, completedOrders, tradingMode } = useBinaryStore();

  // Filter completed orders by current trading mode
  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter(order => order.isDemo === (tradingMode === "demo"));
  }, [completedOrders, tradingMode]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCompletedOrders();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  /**
   * Quick stats.
   *
   * These counted `o.pnl`, a field `CompletedOrder` does not have — so both
   * comparisons were `undefined > 0`, every bar read "0 Wins / 0 Losses /
   * 0.0% Win Rate" over a real trade history. Settlement outcome lives in
   * `status` ("WIN" | "LOSS" | "DRAW"); `profit` is the money and is NOT a
   * usable sign for a loss (it is 0 or absent on many losing rows, which is
   * why `trading-analytics.ts` falls back to the stake there).
   *
   * The rate is over DECIDED trades only, matching the dashboard below it —
   * dividing by every completed order counts a DRAW as a loss and would make
   * the strip disagree with the very panel it heads.
   */
  const stats = useMemo(() => {
    const wins = filteredCompletedOrders.filter((o) => o.status === "WIN").length;
    const losses = filteredCompletedOrders.filter((o) => o.status === "LOSS").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? (wins / decided) * 100 : 0;
    return { wins, losses, decided, winRate };
  }, [filteredCompletedOrders]);

  return (
    <FullBleedOverlay isOpen={isOpen} isMobile={isMobile} onClose={onClose}>
      <OverlayHeader
        icon={BarChart2}
        title={tCommon("trading_analytics")}
        subtitle={t("analyze_your_trading_performance")}
        actions={
          <>
            <OverlayIconButton
              icon={RefreshCw}
              onClick={handleRefresh}
              disabled={isRefreshing}
              label={tCommon("refresh_page")}
              iconClassName={isRefreshing ? "animate-spin" : undefined}
            />
            <OverlayIconButton icon={X} onClick={onClose} label={tCommon("close")} />
          </>
        }
      />

      <OverlayStatsBar
        trailing={
          /* Win rate keeps its figure on `foreground` and carries the hue on a
             disc/diamond mark: `text-up` on this strip measures 2.9:1 in light
             mode at 10px, and up/down are not separable under deuteranopia. */
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            {stats.decided > 0 ? (
              <ToneMark tone={stats.winRate >= 50 ? "up" : "down"} size={6} />
            ) : null}
            {stats.winRate.toFixed(1)}% Win Rate
          </span>
        }
      >
        <OverlayStat icon={Activity} tone="primary">
          {filteredCompletedOrders.length} Trades
        </OverlayStat>
        <OverlayStat icon={TrendingUp} tone="up">
          {stats.wins} Wins
        </OverlayStat>
        <OverlayStat icon={TrendingDown} tone="down">
          {stats.losses} Losses
        </OverlayStat>
      </OverlayStatsBar>

      {/* Analytics Dashboard - Takes full remaining height, with tabs shown separately */}
      <div className="flex-1 overflow-hidden">
        <AnalyticsDashboard
          theme={theme}
          className="h-full"
          hideHeader={true}
        />
      </div>
    </FullBleedOverlay>
  );
});

export default AnalyticsOverlay;
