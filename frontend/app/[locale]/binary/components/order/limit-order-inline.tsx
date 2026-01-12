"use client";

/**
 * Inline Limit Order Form
 *
 * Compact limit order settings that appear in the order panel.
 */

import { memo, useState, useMemo, useCallback } from "react";
import { Target, ChevronDown, ChevronUp, Clock, Info } from "lucide-react";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export type LimitCondition = "above" | "below";

export interface LimitOrderSettings {
  limitPrice: number;
  condition: LimitCondition;
  orderExpiry: number; // Minutes until limit order expires
}

interface LimitOrderInlineProps {
  currentPrice: number;
  settings: LimitOrderSettings;
  onChange: (settings: Partial<LimitOrderSettings>) => void;
  symbol: string;
  darkMode?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LimitOrderInline = memo(function LimitOrderInline({
  currentPrice,
  settings,
  onChange,
  symbol,
  darkMode = true,
}: LimitOrderInlineProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Theme classes
  const bgClass = darkMode ? "bg-zinc-900/80" : "bg-gray-50";
  const borderClass = darkMode ? "border-zinc-800/60" : "border-gray-200";
  const textClass = darkMode ? "text-white" : "text-zinc-900";
  const subtitleClass = darkMode ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = darkMode ? "bg-zinc-800" : "bg-white";

  // Calculate price distance
  const priceDistance = useMemo(() => {
    const diff = settings.limitPrice - currentPrice;
    const percent = (diff / currentPrice) * 100;
    return {
      absolute: Math.abs(diff),
      percent: Math.abs(percent),
      isAbove: diff > 0,
    };
  }, [settings.limitPrice, currentPrice]);

  // Determine decimal places based on symbol
  const decimals = useMemo(() => {
    if (symbol.includes("BTC")) return 2;
    if (symbol.includes("ETH")) return 2;
    return 4;
  }, [symbol]);

  // Quick price adjustments
  const adjustPrice = useCallback(
    (percent: number) => {
      const adjustment = currentPrice * (percent / 100);
      onChange({
        limitPrice: parseFloat((currentPrice + adjustment).toFixed(decimals)),
      });
    },
    [currentPrice, decimals, onChange]
  );

  // Reset to current price
  const resetPrice = useCallback(() => {
    onChange({ limitPrice: currentPrice });
  }, [currentPrice, onChange]);

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-blue-500" />
          <span className={`text-xs font-medium ${textClass}`}>{t("limit_order")}</span>
        </div>
        <button
          onClick={resetPrice}
          className={`text-[10px] px-2 py-0.5 rounded ${
            darkMode
              ? "bg-zinc-800 text-zinc-400 hover:text-white"
              : "bg-zinc-200 text-zinc-600 hover:text-zinc-900"
          } transition-colors`}
        >
          Reset
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Condition selector */}
        <div>
          <label className={`text-[10px] font-medium ${subtitleClass} uppercase tracking-wide`}>
            {t("trigger_when_price")}
          </label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => onChange({ condition: "above" })}
              className={`py-1.5 rounded text-xs font-medium transition-colors ${
                settings.condition === "above"
                  ? "bg-emerald-500 text-white"
                  : darkMode
                  ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {t("goes_above")}
            </button>
            <button
              onClick={() => onChange({ condition: "below" })}
              className={`py-1.5 rounded text-xs font-medium transition-colors ${
                settings.condition === "below"
                  ? "bg-red-500 text-white"
                  : darkMode
                  ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {t("goes_below")}
            </button>
          </div>
        </div>

        {/* Limit price input */}
        <div>
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-medium ${subtitleClass} uppercase tracking-wide`}>
              {tCommon("limit_price")}
            </label>
            <span className={`text-[10px] ${subtitleClass}`}>
              {tCommon("current")} {currentPrice.toFixed(decimals)}
            </span>
          </div>
          <div className={`mt-1 ${inputBgClass} rounded-lg flex items-center`}>
            <input
              type="number"
              value={settings.limitPrice}
              onChange={(e) =>
                onChange({ limitPrice: parseFloat(e.target.value) || currentPrice })
              }
              step={Math.pow(10, -decimals)}
              className={`flex-1 bg-transparent px-3 py-2 outline-none ${textClass} text-sm`}
            />
            <span
              className={`pr-3 text-xs font-medium ${
                priceDistance.isAbove ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {priceDistance.isAbove ? "+" : "-"}
              {priceDistance.percent.toFixed(2)}%
            </span>
          </div>

          {/* Quick adjustments */}
          <div className="flex gap-1 mt-2">
            {[-2, -1, -0.5, 0.5, 1, 2].map((pct) => (
              <button
                key={pct}
                onClick={() => adjustPrice(pct)}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  pct > 0
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                }`}
              >
                {pct > 0 ? "+" : ""}
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-full flex items-center justify-between py-1.5 px-2 rounded ${
            darkMode ? "bg-zinc-800/50 hover:bg-zinc-800" : "bg-zinc-50 hover:bg-zinc-100"
          } transition-colors`}
        >
          <span className={`text-[10px] ${subtitleClass}`}>{t("order_expiry_settings")}</span>
          {showAdvanced ? (
            <ChevronUp size={12} className={subtitleClass} />
          ) : (
            <ChevronDown size={12} className={subtitleClass} />
          )}
        </button>

        {/* Advanced settings */}
        {showAdvanced && (
          <div>
            <label className={`text-[10px] font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("order_valid_for")}
            </label>
            <div className="flex gap-1.5 mt-1">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onChange({ orderExpiry: mins })}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    settings.orderExpiry === mins
                      ? "bg-blue-500 text-white"
                      : darkMode
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div
          className={`flex items-start gap-2 p-2 rounded ${
            darkMode ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Info size={10} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {t("order_will_be_placed_automatically_when_price")}{" "}
            {settings.condition === "above" ? "rises above" : "falls below"}{" "}
            {settings.limitPrice.toFixed(decimals)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default LimitOrderInline;
