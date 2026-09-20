"use client";

/**
 * Analytics Dashboard Component
 *
 * Main component that combines all analytics sub-components.
 */

import { memo, useState, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  Clock,
  X,
  RefreshCw,
  BookOpen,
  Download,
} from "lucide-react";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTradingAnalytics } from "./use-trading-analytics";
import { SummaryCards } from "./summary-cards";
import { WinRateGauge } from "./win-rate-gauge";
import { StreakIndicator } from "./streak-indicator";
import { RecentTradesTable } from "./recent-trades-table";
import { EquityCurve } from "./equity-curve";
import { SymbolStatistics } from "./symbol-stats";
import { AdvancedMetrics } from "./advanced-metrics";
import { ExportTrades } from "./export-trades";
import { TradeJournal } from "./trade-journal";
import { Panel, PanelTitle, toneText, winRateTone } from "./analytics-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsDashboardProps {
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
  theme?: "dark" | "light";
  className?: string;
  onClose?: () => void;
  /** Optional header actions slot (refresh, close buttons) */
  headerActions?: React.ReactNode;
  /** Hide the internal header when used inside an overlay that provides its own */
  hideHeader?: boolean;
}

type TabId = "overview" | "performance" | "analysis" | "journal" | "export";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AnalyticsDashboard = memo(function AnalyticsDashboard({
  className = "",
  onClose,
  headerActions,
  hideHeader = false,
}: AnalyticsDashboardProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { fetchCompletedOrders, completedOrders, tradingMode } = useBinaryStore();
  const analytics = useTradingAnalytics();

  // Filter completed orders by current trading mode
  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter(order => order.isDemo === (tradingMode === "demo"));
  }, [completedOrders, tradingMode]);

  // Tab configuration
  const tabs = [
    { id: "overview" as TabId, label: tCommon("overview"), icon: BarChart2 },
    { id: "performance" as TabId, label: tCommon("performance"), icon: TrendingUp },
    { id: "analysis" as TabId, label: t("analysis"), icon: Clock },
    { id: "journal" as TabId, label: t("journal"), icon: BookOpen },
    { id: "export" as TabId, label: tCommon("export"), icon: Download },
  ];

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCompletedOrders();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Extract currency from symbol
  const getCurrency = () => {
    if (filteredCompletedOrders.length > 0) {
      const parts = filteredCompletedOrders[0].symbol.split("/");
      return parts[1] || "USDT";
    }
    return "USDT";
  };

  const currency = getCurrency();

  // Render refresh button - can be used by parent overlay
  const renderRefreshButton = () => (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="p-2 rounded-lg hover:bg-surface-3 transition-colors disabled:opacity-50"
    >
      <RefreshCw
        size={18}
        className={`text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
      />
    </button>
  );

  // Render tabs navigation. The active tab is the one accent site here (R2):
  // the tint marks it and the glyph carries the accent, while the label keeps
  // foreground ink so it stays legible on the tint in light mode.
  const renderTabs = () => (
    <div className="flex items-center gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-colors
              ${
                isActive
                  ? "bg-primary/12 text-foreground"
                  : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              }
            `}
          >
            <Icon size={16} className={isActive ? "text-primary" : undefined} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`bg-card ${className} flex flex-col h-full`}>
      {/* Header - only show if not hidden (when overlay provides its own) */}
      {!hideHeader && (
        <div className="bg-card border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart2 size={24} className="text-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {tCommon("trading_analytics")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {analytics.stats.totalTrades} {t("trades_analyzed")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Header actions slot or default buttons */}
              {headerActions || (
                <>
                  {renderRefreshButton()}
                  {/* Close button */}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
                    >
                      <X size={18} className="text-muted-foreground" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4">
            {renderTabs()}
          </div>
        </div>
      )}

      {/* Tabs - show separately when header is hidden (overlay mode) */}
      {hideHeader && (
        <div className="bg-card border-b border-border px-6 py-3 shrink-0">
          {renderTabs()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!analytics.hasData ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full">
            <BarChart2 size={48} className="text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("no_trading_data_yet")}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {t("complete_trades_to_see_analytics") + ' ' + t("trading_history_will_appear_here")}
            </p>
          </div>
        ) : (
          /* Tab content */
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <SummaryCards
                  stats={analytics.stats}
                  advancedMetrics={analytics.advancedMetrics}
                  currentBalance={analytics.currentBalance}
                  startingBalance={analytics.startingBalance}
                  currency={currency}
                />

                {/* Main metrics row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Win Rate Gauge */}
                  <WinRateGauge
                    winRate={analytics.stats.winRate}
                    totalTrades={analytics.stats.totalTrades}
                    wins={analytics.stats.wins}
                    losses={analytics.stats.losses}
                  />

                  {/* Streak Indicator */}
                  <StreakIndicator
                    currentStreak={analytics.currentStreak}
                    isWinningStreak={analytics.isWinningStreak}
                    longestWinStreak={analytics.longestWinStreak}
                    longestLossStreak={analytics.longestLossStreak}
                  />

                  {/* Quick stats — a peer of the two panels beside it, so it
                      sits on the same surface rather than a step in. */}
                  <Panel className="p-6">
                    <PanelTitle className="mb-4">{t("quick_insights")}</PanelTitle>
                    <div className="space-y-4">
                      {analytics.bestSymbol && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            {t("best_symbol")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {analytics.bestSymbol.symbol.replace("USDT", "").replace("/", "")}
                            </span>
                            <span className={`text-sm ${toneText[winRateTone(analytics.bestSymbol.winRate)]}`}>
                              {analytics.bestSymbol.winRate.toFixed(1)}% win rate
                            </span>
                          </div>
                        </div>
                      )}
                      {analytics.worstSymbol &&
                        analytics.worstSymbol !== analytics.bestSymbol && (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              {t('needs_improvement')}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {analytics.worstSymbol.symbol.replace("USDT", "").replace("/", "")}
                              </span>
                              <span className={`text-sm ${toneText[winRateTone(analytics.worstSymbol.winRate)]}`}>
                                {analytics.worstSymbol.winRate.toFixed(1)}% win rate
                              </span>
                            </div>
                          </div>
                        )}
                      {analytics.bestHour && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            {t("best_trading_hour")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {analytics.bestHour.hour.toString().padStart(2, "0")}:00
                            </span>
                            <span className={`text-sm ${toneText[winRateTone(analytics.bestHour.winRate)]}`}>
                              {analytics.bestHour.winRate.toFixed(1)}% win rate
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>

                {/* Recent trades */}
                <RecentTradesTable
                  trades={analytics.recentTrades}
                  maxTrades={10}
                  currency={currency}
                />
              </div>
            )}

            {activeTab === "performance" && (
              <div className="space-y-6">
                {/* Equity Curve */}
                <EquityCurve
                  data={analytics.equityCurve}
                  startingBalance={analytics.startingBalance}
                  currency={currency}
                  height={350}
                />

                {/* Symbol Statistics */}
                <SymbolStatistics
                  data={analytics.statsBySymbol}
                  currency={currency}
                />
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                {/* Advanced Metrics */}
                <AdvancedMetrics
                  metrics={analytics.advancedMetrics}
                  currency={currency}
                />

                {/* Time-based analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hourly performance */}
                  <Panel className="p-6">
                    <PanelTitle className="mb-4">{t("performance_by_hour")}</PanelTitle>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {analytics.statsByHour
                        .filter((h) => h.trades > 0)
                        .sort((a, b) => b.winRate - a.winRate)
                        .map((hour) => (
                          <div
                            key={hour.hour}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-sm text-foreground">
                              {hour.hour.toString().padStart(2, "0")}:00
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">
                                {hour.trades} trades
                              </span>
                              <span
                                className={`text-sm font-semibold ${toneText[winRateTone(hour.winRate)]}`}
                              >
                                {hour.winRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Panel>

                  {/* Daily performance */}
                  <Panel className="p-6">
                    <PanelTitle className="mb-4">{t("performance_by_day")}</PanelTitle>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {analytics.statsByDay
                        .filter((d) => d.trades > 0)
                        .sort((a, b) => b.winRate - a.winRate)
                        .map((day) => (
                          <div
                            key={day.day}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-sm text-foreground">
                              {day.dayName}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">
                                {day.trades} trades
                              </span>
                              <span
                                className={`text-sm font-semibold ${toneText[winRateTone(day.winRate)]}`}
                              >
                                {day.winRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "journal" && (
              <TradeJournal
                trades={filteredCompletedOrders}
                currency={currency}
              />
            )}

            {activeTab === "export" && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Export component */}
                <ExportTrades
                  trades={filteredCompletedOrders}
                  currency={currency}
                />

                {/* Recent trades for reference */}
                <RecentTradesTable
                  trades={analytics.recentTrades}
                  maxTrades={20}
                  currency={currency}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default AnalyticsDashboard;
