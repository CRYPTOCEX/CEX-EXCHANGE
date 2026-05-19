"use client";

/**
 * Position Sizing Calculator Component
 *
 * Advanced position sizing with Kelly criterion and other methods.
 */

import { memo, useState, useMemo } from "react";
import {
  Calculator,
  Percent,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
} from "lucide-react";
import type {
  PositionSizingSettings,
  PositionSizingMethod,
  PositionSizeResult,
} from "./risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface PositionSizingCalculatorProps {
  settings: PositionSizingSettings;
  balance: number;
  winRate: number; // Historical win rate
  avgProfit: number; // Average profit on wins
  avgLoss: number; // Average loss on losses
  onChange: (settings: Partial<PositionSizingSettings>) => void;
  onApplyAmount: (amount: number) => void;
  theme?: "dark" | "light";
  compact?: boolean;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

function calculateKellyFraction(
  winRate: number,
  avgProfit: number,
  avgLoss: number
): number {
  const p = winRate / 100;
  const q = 1 - p;
  const b = avgLoss > 0 ? avgProfit / avgLoss : 0;

  if (b === 0) return 0;

  const kelly = (b * p - q) / b;
  return Math.max(0, Math.min(1, kelly));
}

function calculatePositionSize(
  method: PositionSizingMethod,
  settings: PositionSizingSettings,
  balance: number,
  winRate: number,
  avgProfit: number,
  avgLoss: number
): PositionSizeResult {
  switch (method) {
    case "fixed":
      return {
        suggestedAmount: Math.min(settings.fixedAmount, balance),
        method: "fixed",
        explanation: "Fixed position size regardless of balance",
        riskAmount: settings.fixedAmount,
        riskPercentage: (settings.fixedAmount / balance) * 100,
      };

    case "percentage": {
      const percentAmount = (balance * settings.riskPercentage) / 100;
      return {
        suggestedAmount: percentAmount,
        method: "percentage",
        explanation: `${settings.riskPercentage}% of current balance`,
        riskAmount: percentAmount,
        riskPercentage: settings.riskPercentage,
      };
    }

    case "kelly": {
      const kellyFraction = calculateKellyFraction(
        winRate || settings.kellyWinRate,
        avgProfit || settings.kellyProfitRatio,
        avgLoss || 1
      );
      const adjustedKelly = kellyFraction * settings.kellyFraction;
      const kellyAmount = balance * adjustedKelly;
      return {
        suggestedAmount: Math.max(0, Math.min(kellyAmount, balance * 0.25)), // Cap at 25%
        method: "kelly",
        explanation: `Kelly: ${(adjustedKelly * 100).toFixed(1)}% (${
          settings.kellyFraction * 100
        }% fraction)`,
        riskAmount: kellyAmount,
        riskPercentage: adjustedKelly * 100,
      };
    }

    case "anti_martingale": {
      const baseAmount = (balance * settings.riskPercentage) / 100;
      return {
        suggestedAmount: baseAmount,
        method: "anti_martingale",
        explanation: "Increase after wins, reset after losses",
        riskAmount: baseAmount,
        riskPercentage: settings.riskPercentage,
      };
    }

    default:
      return {
        suggestedAmount: 100,
        method: "fixed",
        explanation: "Default sizing",
        riskAmount: 100,
        riskPercentage: (100 / balance) * 100,
      };
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PositionSizingCalculator = memo(function PositionSizingCalculator({
  settings,
  balance,
  winRate,
  avgProfit,
  avgLoss,
  onChange,
  onApplyAmount,
  theme = "dark",
  compact = false,
}: PositionSizingCalculatorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showInfo, setShowInfo] = useState<PositionSizingMethod | null>(null);

  // Premium dark theme matching Price Alerts
  const isDark = theme === "dark";
  const themeClasses = {
    bg: isDark ? "bg-transparent" : "bg-white",
    bgSubtle: isDark ? "bg-zinc-800/50" : "bg-gray-50",
    border: isDark ? "border-zinc-800/50" : "border-gray-200",
    text: isDark ? "text-white" : "text-gray-900",
    textMuted: isDark ? "text-zinc-400" : "text-gray-500",
    textSubtle: isDark ? "text-zinc-500" : "text-gray-400",
    inputBg: isDark ? "bg-zinc-800" : "bg-gray-100",
    hoverBg: isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100",
  };

  // Legacy aliases for compatibility
  const textClass = themeClasses.text;
  const subtitleClass = themeClasses.textMuted;
  const inputBgClass = themeClasses.inputBg;

  // Calculate position size for each method
  const results = useMemo(() => {
    const methods: PositionSizingMethod[] = [
      "fixed",
      "percentage",
      "kelly",
      "anti_martingale",
    ];
    return methods.map((method) =>
      calculatePositionSize(method, settings, balance, winRate, avgProfit, avgLoss)
    );
  }, [settings, balance, winRate, avgProfit, avgLoss]);

  // Get current result
  const currentResult = useMemo(
    () =>
      calculatePositionSize(
        settings.method,
        settings,
        balance,
        winRate,
        avgProfit,
        avgLoss
      ),
    [settings, balance, winRate, avgProfit, avgLoss]
  );

  // Method info
  const methodInfo: Record<PositionSizingMethod, { title: string; desc: string }> = {
    fixed: {
      title: "Fixed Amount",
      desc: "Trade the same amount regardless of account size. Simple but doesn't adapt to changing conditions.",
    },
    percentage: {
      title: "Fixed Percentage",
      desc: "Risk a fixed percentage of your balance on each trade. Scales with your account size.",
    },
    kelly: {
      title: "Kelly Criterion",
      desc: "Mathematically optimal sizing based on win rate and profit ratio. Use fractional Kelly (25-50%) for safety.",
    },
    anti_martingale: {
      title: "Anti-Martingale",
      desc: "Increase position after wins, decrease after losses. Opposite of martingale - more conservative.",
    },
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
          theme === "dark"
            ? "bg-zinc-900/50 border border-zinc-800/50"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-blue-500" />
          <span className={`text-xs font-medium ${textClass}`}>{t("position_sizing")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold text-emerald-500`}>
            {currentResult.suggestedAmount.toFixed(0)} USDT
          </span>
          <ChevronDown size={14} className={subtitleClass} />
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header - only show if compact mode */}
      {compact && (
        <div className={`flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-blue-500" />
            <span className={`text-sm font-medium ${textClass}`}>
              {t("position_sizing_calculator")}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className={`p-1 rounded ${themeClasses.hoverBg}`}
          >
            <ChevronUp size={14} className={subtitleClass} />
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Current stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-3 rounded-lg ${themeClasses.bgSubtle}`}>
            <div className={`text-[10px] ${themeClasses.textSubtle} uppercase tracking-wide`}>{tCommon("win_rate")}</div>
            <div className={`text-sm font-semibold mt-0.5 ${textClass}`}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div className={`p-3 rounded-lg ${themeClasses.bgSubtle}`}>
            <div className={`text-[10px] ${themeClasses.textSubtle} uppercase tracking-wide`}>{t("avg_win")}</div>
            <div className="text-sm font-semibold text-emerald-500 mt-0.5">
              +{avgProfit.toFixed(2)}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${themeClasses.bgSubtle}`}>
            <div className={`text-[10px] ${themeClasses.textSubtle} uppercase tracking-wide`}>{t("avg_loss")}</div>
            <div className="text-sm font-semibold text-red-500 mt-0.5">
              -{avgLoss.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Method selection */}
        <div>
          <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
            {t("sizing_method")}
          </label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["fixed", "percentage", "kelly", "anti_martingale"] as PositionSizingMethod[]).map(
              (method) => (
                <div key={method} className="relative">
                  <button
                    onClick={() => onChange({ method })}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                      settings.method === method
                        ? "bg-blue-500 text-white"
                        : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {method === "fixed" && <Target size={12} />}
                      {method === "percentage" && <Percent size={12} />}
                      {method === "kelly" && <Calculator size={12} />}
                      {method === "anti_martingale" && <TrendingUp size={12} />}
                      {methodInfo[method].title}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfo(showInfo === method ? null : method);
                    }}
                    className={`absolute top-1 right-1 p-0.5 rounded-full opacity-60 hover:opacity-100 ${
                      settings.method === method ? "text-white" : ""
                    }`}
                  >
                    <Info size={10} />
                  </button>
                </div>
              )
            )}
          </div>

          {/* Info tooltip */}
          {showInfo && (
            <div
              className={`mt-2 p-3 rounded-lg text-xs ${
                isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"
              }`}
            >
              {methodInfo[showInfo].desc}
            </div>
          )}
        </div>

        {/* Method-specific settings */}
        {settings.method === "fixed" && (
          <div>
            <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
              {tCommon("fixed_amount")}
            </label>
            <div className={`mt-2 ${inputBgClass} rounded-lg flex items-center px-3 border ${themeClasses.border}`}>
              <input
                type="number"
                value={settings.fixedAmount}
                onChange={(e) =>
                  onChange({ fixedAmount: parseFloat(e.target.value) || 0 })
                }
                className={`flex-1 bg-transparent py-2.5 outline-none ${textClass} text-sm`}
              />
              <span className={`text-xs ${themeClasses.textSubtle}`}>USDT</span>
            </div>
          </div>
        )}

        {settings.method === "percentage" && (
          <div>
            <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
              {t("risk_percentage")}
            </label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 5, 10].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onChange({ riskPercentage: pct })}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    settings.riskPercentage === pct
                      ? "bg-blue-500 text-white"
                      : isDark
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {settings.method === "kelly" && (
          <div className="space-y-4">
            {/* Kelly fraction */}
            <div>
              <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
                {t("kelly_fraction")}
              </label>
              <div className="flex gap-2 mt-2">
                {[0.25, 0.5, 0.75, 1.0].map((frac) => (
                  <button
                    key={frac}
                    onClick={() => onChange({ kellyFraction: frac })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.kellyFraction === frac
                        ? "bg-blue-500 text-white"
                        : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {frac * 100}%
                  </button>
                ))}
              </div>
              <div className={`text-[10px] mt-2 ${themeClasses.textSubtle}`}>
                {t("half_kelly_50_is_recommended_for_safety")}
              </div>
            </div>

            {/* Kelly calculation breakdown */}
            <div className={`p-3 rounded-lg ${themeClasses.bgSubtle}`}>
              <div className={`text-[10px] font-medium uppercase tracking-wide ${themeClasses.textSubtle} mb-2`}>
                {t("kelly_calculation")}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>{t("full_kelly")}</span>
                  <span className={textClass}>
                    {(
                      calculateKellyFraction(winRate, avgProfit, avgLoss) * 100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={themeClasses.textMuted}>
                    Adjusted ({settings.kellyFraction * 100}%):
                  </span>
                  <span className="text-blue-500 font-medium">
                    {(
                      calculateKellyFraction(winRate, avgProfit, avgLoss) *
                      settings.kellyFraction *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {settings.method === "anti_martingale" && (
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
                {t("base_risk")}
              </label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 5].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onChange({ riskPercentage: pct })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.riskPercentage === pct
                        ? "bg-blue-500 text-white"
                        : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`text-xs font-medium ${themeClasses.textMuted} uppercase tracking-wide`}>
                {t("multiplier_after_win")}
              </label>
              <div className="flex gap-2 mt-2">
                {[1.25, 1.5, 2.0].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => onChange({ antiMartingaleMultiplier: mult })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.antiMartingaleMultiplier === mult
                        ? "bg-blue-500 text-white"
                        : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        <div
          className={`p-4 rounded-lg ${
            isDark
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-emerald-50 border border-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${themeClasses.textMuted}`}>
              {t("suggested_position_size")}
            </span>
            <span className={`text-[10px] ${themeClasses.textSubtle}`}>
              {currentResult.riskPercentage.toFixed(1)}% of balance
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold text-emerald-500`}>
              {currentResult.suggestedAmount.toFixed(2)}
            </span>
            <span className={`text-sm ${themeClasses.textSubtle}`}>USDT</span>
          </div>
          <div className={`text-[10px] mt-1 ${themeClasses.textSubtle}`}>
            {currentResult.explanation}
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={() => onApplyAmount(currentResult.suggestedAmount)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          <Zap size={16} />
          {t("apply_this_amount")}
        </button>
      </div>
    </div>
  );
});

export default PositionSizingCalculator;
