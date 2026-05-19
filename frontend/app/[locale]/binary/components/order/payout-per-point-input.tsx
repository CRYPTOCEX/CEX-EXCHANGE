"use client";

/**
 * Payout Per Point Input Component
 *
 * Input for setting payout per point for TURBO orders.
 * Uses admin-configured payoutPerPointRange from binary settings.
 * Shows potential profit calculation based on barrier distance.
 *
 * TURBO MECHANICS:
 * - User sets barrier (knockout level) and payoutPerPoint
 * - If price hits barrier = TOTAL LOSS
 * - If price doesn't hit barrier:
 *   - UP: profit = (closePrice - barrier) × payoutPerPoint
 *   - DOWN: profit = (barrier - closePrice) × payoutPerPoint
 */

import { useMemo, useEffect } from "react";
import { DollarSign, TrendingUp, Info, AlertTriangle } from "lucide-react";
import type { BinaryOrderType } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface PayoutPerPointInputProps {
  orderType: BinaryOrderType;
  currentPrice: number;
  payoutPerPoint: number | null;
  barrier: number | null;
  onChange: (payoutPerPoint: number | null) => void;
  darkMode?: boolean;
  disabled?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate suggested payout per point values within admin-configured range
 */
function generateSuggestedPayouts(
  min: number,
  max: number,
  steps: number = 5
): number[] {
  if (min <= 0 || max <= 0 || min >= max) {
    return [0.1, 0.5, 1.0, 2.0, 5.0]; // Fallback defaults
  }

  const payouts: number[] = [];
  const range = max - min;

  // Generate evenly distributed values
  for (let i = 0; i < steps; i++) {
    const value = min + (range * i) / (steps - 1);
    // Round to sensible precision
    if (value < 1) {
      payouts.push(Math.round(value * 100) / 100); // 2 decimals
    } else if (value < 10) {
      payouts.push(Math.round(value * 10) / 10); // 1 decimal
    } else {
      payouts.push(Math.round(value)); // whole number
    }
  }

  return payouts;
}

/**
 * Calculate potential profit/loss based on distance to barrier
 */
function calculatePotentialProfit(
  currentPrice: number,
  barrier: number,
  payoutPerPoint: number
): { points: number; profit: number } {
  const points = Math.abs(barrier - currentPrice);
  const profit = points * payoutPerPoint;
  return { points, profit };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PayoutPerPointInput({
  orderType,
  currentPrice,
  payoutPerPoint,
  barrier,
  onChange,
  darkMode = true,
  disabled = false,
}: PayoutPerPointInputProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  // Get TURBO settings from binary settings store
  const binarySettings = useBinaryStore((state) => state.binarySettings);

  // Get payout per point range from admin settings
  const payoutRange = useMemo(() => {
    const turboConfig = binarySettings?.orderTypes?.TURBO;
    if (turboConfig && "payoutPerPointRange" in turboConfig) {
      return turboConfig.payoutPerPointRange;
    }
    return { min: 0.1, max: 10 }; // Default fallback
  }, [binarySettings]);

  // Generate suggested payouts based on admin settings
  const suggestedPayouts = useMemo(
    () => generateSuggestedPayouts(payoutRange.min, payoutRange.max, 5),
    [payoutRange.min, payoutRange.max]
  );

  // Set default payout per point if none is set (use middle value)
  useEffect(() => {
    if (!payoutPerPoint && suggestedPayouts.length > 0) {
      onChange(suggestedPayouts[Math.floor(suggestedPayouts.length / 2)]);
    }
  }, [payoutPerPoint, suggestedPayouts, onChange]);

  // Check if current value is within allowed range
  const isOutOfRange = useMemo(() => {
    if (!payoutPerPoint) return false;
    return payoutPerPoint < payoutRange.min || payoutPerPoint > payoutRange.max;
  }, [payoutPerPoint, payoutRange]);

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toFixed(0);
  };

  const potentialProfit =
    payoutPerPoint && barrier && currentPrice
      ? calculatePotentialProfit(currentPrice, barrier, payoutPerPoint)
      : null;

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-medium ${
            darkMode ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          <TrendingUp size={12} className="inline mr-1" />
          {t("payout_per_point")}
        </label>
        {potentialProfit && (
          <span
            className={`text-xs ${darkMode ? "text-emerald-500" : "text-emerald-600"}`}
          >
            {t("est_profit")} {formatPrice(potentialProfit.profit)}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="number"
          value={payoutPerPoint || ""}
          onChange={(e) => {
            const value = e.target.value;
            onChange(value ? parseFloat(value) : null);
          }}
          placeholder={`${payoutRange.min} - ${payoutRange.max}`}
          disabled={disabled}
          min={payoutRange.min}
          max={payoutRange.max}
          step={payoutRange.min < 1 ? "0.01" : "0.1"}
          className={`
            w-full px-3 py-2 rounded-lg
            ${
              isOutOfRange
                ? darkMode
                  ? "bg-red-900/20 border border-red-500/50 text-red-400 placeholder-red-500/50"
                  : "bg-red-50 border border-red-300 text-red-600 placeholder-red-300"
                : darkMode
                  ? "bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-500"
                  : "bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400"
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            text-sm font-medium
          `}
        />

        {/* Currency indicator */}
        <div
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
            darkMode ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          <DollarSign size={14} className="inline" />
        </div>
      </div>

      {/* Out of range warning */}
      {isOutOfRange && (
        <div
          className={`flex items-center gap-1.5 text-[10px] ${
            darkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          <AlertTriangle size={10} />
          <span>
            {t("value_must_be_between")} {payoutRange.min} and {payoutRange.max}
          </span>
        </div>
      )}

      {/* Quick Select - Always visible */}
      {suggestedPayouts.length > 0 && (
        <div>
          <div
            className={`text-[10px] font-medium mb-1 flex items-center justify-between ${
              darkMode ? "text-zinc-500" : "text-zinc-500"
            }`}
          >
            <span>{t("quick_select")}</span>
            <span className={darkMode ? "text-zinc-600" : "text-zinc-400"}>
              {tCommon("range")} {payoutRange.min}-{payoutRange.max}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {suggestedPayouts.map((suggestedPayout, idx) => {
              const potential = barrier
                ? calculatePotentialProfit(
                    currentPrice,
                    barrier,
                    suggestedPayout
                  )
                : null;
              const isSelected = payoutPerPoint === suggestedPayout;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(suggestedPayout)}
                  className={`
                    px-1.5 py-1.5 rounded text-xs font-medium
                    transition-all cursor-pointer
                    ${
                      isSelected
                        ? darkMode
                          ? "bg-blue-500/20 border-blue-500/50 border text-blue-400"
                          : "bg-blue-100 border-blue-500/50 border text-blue-600"
                        : darkMode
                          ? "bg-zinc-800/80 hover:bg-zinc-700/80 text-white border border-zinc-700/50"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[11px]">{formatPrice(suggestedPayout)}</span>
                    {potential && (
                      <span className={`text-[9px] ${isSelected ? "text-emerald-400" : "text-emerald-500"}`}>
                        +{formatPrice(potential.profit)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div
        className={`flex items-start gap-1.5 text-xs ${
          darkMode ? "text-zinc-500" : "text-zinc-500"
        }`}
      >
        <Info size={12} className="mt-0.5 shrink-0" />
        <p>
          {t("profit_distance_to_barrier_payout")}
        </p>
      </div>
    </div>
  );
}
