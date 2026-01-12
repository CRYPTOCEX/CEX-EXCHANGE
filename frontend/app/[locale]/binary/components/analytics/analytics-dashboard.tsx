"use client";

/**
 * Analytics Dashboard Component
 *
 * Main component that combines all analytics sub-components.
 */

import { memo, useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Clock,
  ChevronUp,
  ChevronDown,
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
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsDashboardProps {
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
  theme = "dark",
  className = "",
  onClose,
  headerActions,
  hideHeader = false,
}: AnalyticsDashboardProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { fetchCompletedOrders, completedOrders } = useBinaryStore();
  const analytics = useTradingAnalytics();

  // Theme classes - matching overlay-theme.ts for consistency
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const headerBgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800/50" : "border-gray-200/50";
  const textClass = theme === "dark" ? "text-white" : "text-gray-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-gray-500";
  const cardBgClass = theme === "dark" ? "bg-zinc-800" : "bg-gray-100";

  // Tab configuration
  const tabs = [
    { id: "overview" as TabId, label: "Overview", icon: BarChart2 },
    { id: "performance" as TabId, label: "Performance", icon: TrendingUp },
    { id: "analysis" as TabId, label: "Analysis", icon: Clock },
    { id: "journal" as TabId, label: "Journal", icon: BookOpen },
    { id: "export" as TabId, label: "Export", icon: Download },
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
    if (completedOrders.length > 0) {
      const parts = completedOrders[0].symbol.split("/");
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
      className={`p-2 rounded-lg ${
        theme === "dark"
          ? "hover:bg-zinc-800"
          : "hover:bg-zinc-100"
      } transition-colors disabled:opacity-50`}
    >
      <RefreshCw
        size={18}
        className={`${subtitleClass} ${isRefreshing ? "animate-spin" : ""}`}
      />
    </button>
  );

  // Render tabs navigation
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
                  ? theme === "dark"
                    ? "bg-zinc-800 text-white"
                    : "bg-zinc-200 text-zinc-900"
                  : `${subtitleClass} ${
                      theme === "dark"
                        ? "hover:bg-zinc-800/50"
                        : "hover:bg-zinc-200/50"
                    }`
              }
            `}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`${bgClass} ${className} flex flex-col h-full`}>
      {/* Header - only show if not hidden (when overlay provides its own) */}
      {!hideHeader && (
        <div
          className={`${headerBgClass} border-b ${borderClass} px-6 py-4 shrink-0`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart2 size={24} className={textClass} />
              <div>
                <h2 className={`text-lg font-semibold ${textClass}`}>
                  {tCommon("trading_analytics")}
                </h2>
                <p className={`text-xs ${subtitleClass}`}>
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
                      className={`p-2 rounded-lg ${
                        theme === "dark"
                          ? "hover:bg-zinc-800"
                          : "hover:bg-zinc-100"
                      } transition-colors`}
                    >
                      <X size={18} className={subtitleClass} />
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
        <div className={`${headerBgClass} border-b ${borderClass} px-6 py-3 shrink-0`}>
          {renderTabs()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!analytics.hasData ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full">
            <BarChart2 size={48} className={`${subtitleClass} opacity-50 mb-4`} />
            <h3 className={`text-lg font-semibold ${textClass} mb-2`}>
              {t("no_trading_data_yet")}
            </h3>
            <p className={`text-sm ${subtitleClass} text-center max-w-md`}>
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
                  theme={theme}
                />

                {/* Main metrics row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Win Rate Gauge */}
                  <WinRateGauge
                    winRate={analytics.stats.winRate}
                    totalTrades={analytics.stats.totalTrades}
                    wins={analytics.stats.wins}
                    losses={analytics.stats.losses}
                    theme={theme}
                  />

                  {/* Streak Indicator */}
                  <StreakIndicator
                    currentStreak={analytics.currentStreak}
                    isWinningStreak={analytics.isWinningStreak}
                    longestWinStreak={analytics.longestWinStreak}
                    longestLossStreak={analytics.longestLossStreak}
                    theme={theme}
                  />

                  {/* Quick stats */}
                  <div
                    className={`${
                      theme === "dark" ? "bg-zinc-800" : "bg-gray-100"
                    } border ${borderClass} rounded-lg p-6`}
                  >
                    <h3
                      className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}
                    >
                      {t("quick_insights")}
                    </h3>
                    <div className="space-y-4">
                      {analytics.bestSymbol && (
                        <div>
                          <span className={`text-xs ${subtitleClass}`}>
                            {t("best_symbol")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${textClass}`}>
                              {analytics.bestSymbol.symbol.replace("USDT", "").replace("/", "")}
                            </span>
                            <span className="text-green-500 text-sm">
                              {analytics.bestSymbol.winRate.toFixed(1)}% win rate
                            </span>
                          </div>
                        </div>
                      )}
                      {analytics.worstSymbol &&
                        analytics.worstSymbol !== analytics.bestSymbol && (
                          <div>
                            <span className={`text-xs ${subtitleClass}`}>
                              {t('needs_improvement')}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${textClass}`}>
                                {analytics.worstSymbol.symbol.replace("USDT", "").replace("/", "")}
                              </span>
                              <span className="text-red-500 text-sm">
                                {analytics.worstSymbol.winRate.toFixed(1)}% win rate
                              </span>
                            </div>
                          </div>
                        )}
                      {analytics.bestHour && (
                        <div>
                          <span className={`text-xs ${subtitleClass}`}>
                            {t("best_trading_hour")}
                          </span>
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${textClass}`}>
                              {analytics.bestHour.hour.toString().padStart(2, "0")}:00
                            </span>
                            <span className="text-green-500 text-sm">
                              {analytics.bestHour.winRate.toFixed(1)}% win rate
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent trades */}
                <RecentTradesTable
                  trades={analytics.recentTrades}
                  maxTrades={10}
                  currency={currency}
                  theme={theme}
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
                  theme={theme}
                  height={350}
                />

                {/* Symbol Statistics */}
                <SymbolStatistics
                  data={analytics.statsBySymbol}
                  currency={currency}
                  theme={theme}
                />
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                {/* Advanced Metrics */}
                <AdvancedMetrics
                  metrics={analytics.advancedMetrics}
                  currency={currency}
                  theme={theme}
                />

                {/* Time-based analysis could go here */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hourly performance */}
                  <div
                    className={`${
                      theme === "dark" ? "bg-zinc-800" : "bg-gray-100"
                    } border ${borderClass} rounded-lg p-6`}
                  >
                    <h3
                      className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}
                    >
                      {t("performance_by_hour")}
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {analytics.statsByHour
                        .filter((h) => h.trades > 0)
                        .sort((a, b) => b.winRate - a.winRate)
                        .map((hour) => (
                          <div
                            key={hour.hour}
                            className="flex items-center justify-between py-2"
                          >
                            <span className={`text-sm ${textClass}`}>
                              {hour.hour.toString().padStart(2, "0")}:00
                            </span>
                            <div className="flex items-center gap-4">
                              <span className={`text-xs ${subtitleClass}`}>
                                {hour.trades} trades
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  hour.winRate >= 50
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {hour.winRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Daily performance */}
                  <div
                    className={`${
                      theme === "dark" ? "bg-zinc-800" : "bg-gray-100"
                    } border ${borderClass} rounded-lg p-6`}
                  >
                    <h3
                      className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}
                    >
                      {t("performance_by_day")}
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {analytics.statsByDay
                        .filter((d) => d.trades > 0)
                        .sort((a, b) => b.winRate - a.winRate)
                        .map((day) => (
                          <div
                            key={day.day}
                            className="flex items-center justify-between py-2"
                          >
                            <span className={`text-sm ${textClass}`}>
                              {day.dayName}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className={`text-xs ${subtitleClass}`}>
                                {day.trades} trades
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  day.winRate >= 50
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {day.winRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "journal" && (
              <TradeJournal
                trades={completedOrders}
                currency={currency}
                theme={theme}
              />
            )}

            {activeTab === "export" && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Export component */}
                <ExportTrades
                  trades={completedOrders}
                  currency={currency}
                  theme={theme}
                />

                {/* Recent trades for reference */}
                <RecentTradesTable
                  trades={analytics.recentTrades}
                  maxTrades={20}
                  currency={currency}
                  theme={theme}
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
