"use client";

/**
 * Risk Management Panel
 *
 * Main panel that combines all risk management features.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Shield,
  ChevronDown,
  AlertTriangle,
  Settings,
  X,
} from "lucide-react";
import { useRiskManagement } from "./use-risk-management";
import { DailyLimitSettingsComponent } from "./daily-limit-settings";
import { PositionSizingCalculator } from "./position-sizing-calculator";
import { TradeCooldown } from "./trade-cooldown";
import { StopTakeProfitSettings } from "./stop-take-profit-settings";
import { getQuoteCurrency } from "@/lib/utils/symbol-utils";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface RiskManagementPanelProps {
  currentPrice: number;
  previousPrice?: number;
  symbol: string;
  balance: number;
  profitPercentage: number;
  expiryMinutes: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  onPlaceOrder: (side: "RISE" | "FALL", amount: number, expiryMinutes: number) => Promise<boolean>;
  onSetAmount: (amount: number) => void;
  theme?: "dark" | "light";
  compact?: boolean;
}

type PanelTab = "protection" | "sizing";

// ============================================================================
// COMPONENT
// ============================================================================

export const RiskManagementPanel = memo(function RiskManagementPanel({
  currentPrice,
  previousPrice,
  symbol,
  balance,
  profitPercentage,
  expiryMinutes,
  winRate,
  avgProfit,
  avgLoss,
  onPlaceOrder,
  onSetAmount,
  theme = "dark",
  compact = false,
}: RiskManagementPanelProps) {
  const t = useTranslations("common");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("protection");

  // Extract currency from symbol
  const currency = useMemo(() => getQuoteCurrency(symbol) || "USDT", [symbol]);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";

  // Risk management hook
  const riskManagement = useRiskManagement({
    balance,
    currentPrice,
    previousPrice,
    onLimitOrderTriggered: useCallback(
      async (order) => {
        // Place the order when limit is triggered
        await onPlaceOrder(order.side, order.amount, order.expiryMinutes);
      },
      [onPlaceOrder]
    ),
    onDailyLimitReached: useCallback(() => {
      // Could show a notification
      console.log("Daily limit reached!");
    }, []),
    onCooldownStarted: useCallback((endsAt) => {
      console.log("Cooldown started, ends at:", new Date(endsAt));
    }, []),
  });

  // Check if trading is allowed
  const tradingStatus = useMemo(() => {
    return riskManagement.canTrade();
  }, [riskManagement]);

  // Count active features
  const activeFeatures = useMemo(() => {
    let count = 0;
    if (riskManagement.state.stopLoss.enabled) count++;
    if (riskManagement.state.takeProfit.enabled) count++;
    if (riskManagement.state.dailyLimit.enabled) count++;
    if (riskManagement.state.cooldown.enabled) count++;
    return count;
  }, [riskManagement.state]);

  // Compact collapsed view
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
          !tradingStatus.allowed
            ? "bg-red-500/10 border border-red-500/30"
            : riskManagement.state.cooldown.isInCooldown
            ? "bg-amber-500/10 border border-amber-500/30"
            : theme === "dark"
            ? "bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50"
            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield
            size={14}
            className={
              !tradingStatus.allowed
                ? "text-red-500"
                : riskManagement.state.cooldown.isInCooldown
                ? "text-amber-500"
                : "text-emerald-500"
            }
          />
          <span className={`text-xs font-medium ${textClass}`}>
            {tCommon("risk_management")}
          </span>
          {activeFeatures > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                theme === "dark" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {activeFeatures} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!tradingStatus.allowed && (
            <AlertTriangle size={12} className="text-red-500" />
          )}
          <ChevronDown size={14} className={subtitleClass} />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-emerald-500" />
          <span className={`text-sm font-medium ${textClass}`}>
            {tCommon("risk_management")}
          </span>
          {activeFeatures > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                theme === "dark" ? "bg-emerald-500/20 text-emerald-500" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {activeFeatures} active
            </span>
          )}
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`p-1 rounded ${
              theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
            }`}
          >
            <X size={14} className={subtitleClass} />
          </button>
        )}
      </div>

      {/* Trading blocked warning */}
      {!tradingStatus.allowed && (
        <div
          className={`px-4 py-3 ${
            theme === "dark" ? "bg-red-500/10" : "bg-red-50"
          } border-b ${theme === "dark" ? "border-red-500/20" : "border-red-100"}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <span className={`text-xs font-medium text-red-500`}>
              {t("trading_blocked")} {tradingStatus.reason}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex border-b ${borderClass}`}>
        <button
          onClick={() => setActiveTab("protection")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "protection"
              ? `${textClass} border-b-2 border-emerald-500`
              : subtitleClass
          }`}
        >
          <Shield size={12} />
          Protection
        </button>
        <button
          onClick={() => setActiveTab("sizing")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "sizing"
              ? `${textClass} border-b-2 border-amber-500`
              : subtitleClass
          }`}
        >
          <Settings size={12} />
          Sizing
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Protection Tab */}
        {activeTab === "protection" && (
          <>
            {/* Daily Limit */}
            <DailyLimitSettingsComponent
              settings={riskManagement.state.dailyLimit}
              balance={balance}
              onChange={riskManagement.updateDailyLimit}
              onOverride={riskManagement.overrideDailyLimit}
              theme={theme}
              compact
              currency={currency}
            />

            {/* Stop-Loss / Take-Profit */}
            <StopTakeProfitSettings
              stopLoss={riskManagement.state.stopLoss}
              takeProfit={riskManagement.state.takeProfit}
              onStopLossChange={riskManagement.updateStopLoss}
              onTakeProfitChange={riskManagement.updateTakeProfit}
              theme={theme}
              compact
            />

            {/* Trade Cooldown */}
            <TradeCooldown
              settings={riskManagement.state.cooldown}
              onChange={riskManagement.updateCooldown}
              onOverride={riskManagement.overrideCooldown}
              theme={theme}
              compact
            />
          </>
        )}

        {/* Sizing Tab */}
        {activeTab === "sizing" && (
          <PositionSizingCalculator
            settings={riskManagement.state.positionSizing}
            balance={balance}
            winRate={winRate}
            avgProfit={avgProfit}
            avgLoss={avgLoss}
            onChange={riskManagement.updatePositionSizing}
            onApplyAmount={onSetAmount}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
});

export default RiskManagementPanel;
