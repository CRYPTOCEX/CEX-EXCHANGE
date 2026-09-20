"use client";

/**
 * Position Sizing Calculator Component
 *
 * Advanced position sizing with Kelly criterion and other methods.
 *
 * Two colour decisions worth knowing about:
 *   - The suggested-size result panel used to be a green card with a green
 *     2xl figure. A calculator's output is not a success; it is just the
 *     answer. It is now a neutral raised panel with foreground ink, and the
 *     accent sits on the Apply button, which is the only thing here that is
 *     actually interactive.
 *   - Avg win / avg loss keep `up` / `down`, because those two genuinely are
 *     P&L direction (R1).
 *
 * The JS-level `isDark` theme fork is gone; tokens are already theme-aware.
 */

import { memo, useState, useMemo, type ReactNode } from "react";
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
import {
  ActionButton,
  FieldLabel,
  Hint,
  NumberField,
  OptionRow,
  StatTile,
} from "./risk-ui";
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
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
}

const RISK_PRESETS = [1, 2, 3, 5, 10] as const;
const BASE_RISK_PRESETS = [1, 2, 3, 5] as const;
const KELLY_FRACTIONS = [0.25, 0.5, 0.75, 1.0] as const;
const ANTI_MARTINGALE_MULTIPLIERS = [1.25, 1.5, 2.0] as const;

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
  compact = false,
}: PositionSizingCalculatorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showInfo, setShowInfo] = useState<PositionSizingMethod | null>(null);

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
      title: tCommon("fixed_amount"),
      desc: "Trade the same amount regardless of account size. Simple but doesn't adapt to changing conditions.",
    },
    percentage: {
      title: t("fixed_percentage"),
      desc: "Risk a fixed percentage of your balance on each trade. Scales with your account size.",
    },
    kelly: {
      title: t("kelly_criterion"),
      desc: "Mathematically optimal sizing based on win rate and profit ratio. Use fractional Kelly (25-50%) for safety.",
    },
    anti_martingale: {
      title: tCommon("anti_martingale"),
      desc: "Increase position after wins, decrease after losses. Opposite of martingale - more conservative.",
    },
  };

  const methodIcons: Record<PositionSizingMethod, ReactNode> = {
    fixed: <Target size={12} />,
    percentage: <Percent size={12} />,
    kelly: <Calculator size={12} />,
    anti_martingale: <TrendingUp size={12} />,
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2 border border-border"
      >
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-primary" />
          <span className="text-xs font-medium text-foreground">
            {t("position_sizing")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {currentResult.suggestedAmount.toFixed(0)} USDT
          </span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header - only show if compact mode */}
      {compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t("position_sizing_calculator")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-surface-3"
          >
            <ChevronUp size={14} className="text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Current stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile label={tCommon("win_rate")} value={`${winRate.toFixed(1)}%`} />
          <StatTile label={tCommon("avg_win")} value={`+${avgProfit.toFixed(2)}`} tone="up" />
          <StatTile label={tCommon("avg_loss")} value={`-${avgLoss.toFixed(2)}`} tone="down" />
        </div>

        {/* Method selection */}
        <div>
          <FieldLabel>{t("sizing_method")}</FieldLabel>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["fixed", "percentage", "kelly", "anti_martingale"] as PositionSizingMethod[]).map(
              (method) => {
                const selected = settings.method === method;
                return (
                  <div key={method} className="relative">
                    <button
                      type="button"
                      onClick={() => onChange({ method })}
                      aria-pressed={selected}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {methodIcons[method]}
                        {methodInfo[method].title}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={methodInfo[method].title}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInfo(showInfo === method ? null : method);
                      }}
                      className={`absolute top-1 right-1 p-0.5 rounded-full opacity-60 hover:opacity-100 ${
                        selected ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Info size={10} />
                    </button>
                  </div>
                );
              }
            )}
          </div>

          {/* Info tooltip — explanatory prose, so it stays neutral and legible */}
          {showInfo && (
            <div className="mt-2 p-3 rounded-lg text-xs bg-surface-2 border border-border text-muted-foreground">
              {methodInfo[showInfo].desc}
            </div>
          )}
        </div>

        {/* Method-specific settings */}
        {settings.method === "fixed" && (
          <div>
            <FieldLabel>{tCommon("fixed_amount")}</FieldLabel>
            <NumberField
              className="mt-2"
              bordered
              value={settings.fixedAmount}
              onChange={(fixedAmount) => onChange({ fixedAmount })}
              suffix="USDT"
              ariaLabel={tCommon("fixed_amount")}
            />
          </div>
        )}

        {settings.method === "percentage" && (
          <div>
            <FieldLabel>{t("risk_percentage")}</FieldLabel>
            <OptionRow
              className="mt-2"
              size="lg"
              value={settings.riskPercentage}
              onSelect={(riskPercentage) => onChange({ riskPercentage })}
              options={RISK_PRESETS.map((pct) => ({ value: pct, label: `${pct}%` }))}
            />
          </div>
        )}

        {settings.method === "kelly" && (
          <div className="space-y-4">
            {/* Kelly fraction */}
            <div>
              <FieldLabel>{t("kelly_fraction")}</FieldLabel>
              <OptionRow
                className="mt-2"
                size="lg"
                value={settings.kellyFraction}
                onSelect={(kellyFraction) => onChange({ kellyFraction })}
                options={KELLY_FRACTIONS.map((frac) => ({
                  value: frac,
                  label: `${frac * 100}%`,
                }))}
              />
              <Hint className="mt-2">{t("half_kelly_50_is_recommended_for_safety")}</Hint>
            </div>

            {/* Kelly calculation breakdown */}
            <div className="p-3 rounded-lg bg-surface-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {t("kelly_calculation")}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("full_kelly")}:</span>
                  <span className="text-foreground">
                    {(calculateKellyFraction(winRate, avgProfit, avgLoss) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Adjusted ({settings.kellyFraction * 100}%):
                  </span>
                  <span className="text-foreground font-medium">
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
              <FieldLabel>{t("base_risk")} %</FieldLabel>
              <OptionRow
                className="mt-2"
                size="lg"
                value={settings.riskPercentage}
                onSelect={(riskPercentage) => onChange({ riskPercentage })}
                options={BASE_RISK_PRESETS.map((pct) => ({ value: pct, label: `${pct}%` }))}
              />
            </div>
            <div>
              <FieldLabel>{t("multiplier_after_win")}</FieldLabel>
              <OptionRow
                className="mt-2"
                size="lg"
                value={settings.antiMartingaleMultiplier}
                onSelect={(antiMartingaleMultiplier) =>
                  onChange({ antiMartingaleMultiplier })
                }
                options={ANTI_MARTINGALE_MULTIPLIERS.map((mult) => ({
                  value: mult,
                  label: `${mult}x`,
                }))}
              />
            </div>
          </div>
        )}

        {/* Result — the calculator's answer, not a verdict on it */}
        <div className="p-4 rounded-lg bg-surface-2 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("suggested_position_size")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {currentResult.riskPercentage.toFixed(1)}% of balance
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">
              {currentResult.suggestedAmount.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">USDT</span>
          </div>
          <Hint>{currentResult.explanation}</Hint>
        </div>

        {/* Apply button */}
        <ActionButton onClick={() => onApplyAmount(currentResult.suggestedAmount)}>
          <Zap size={16} />
          {t("apply_this_amount")}
        </ActionButton>
      </div>
    </div>
  );
});

export default PositionSizingCalculator;
