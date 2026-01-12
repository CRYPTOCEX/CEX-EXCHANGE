"use client";

/**
 * Limit Order Form Component
 *
 * Allows users to place limit orders that trigger when price reaches a target.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
} from "lucide-react";
import type { LimitOrderFormData } from "./risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface LimitOrderFormProps {
  currentPrice: number;
  symbol: string;
  balance: number;
  profitPercentage: number;
  expiryMinutes: number;
  onSubmit: (data: LimitOrderFormData) => void;
  onCancel?: () => void;
  theme?: "dark" | "light";
  compact?: boolean;
}

type OrderCondition = "above" | "below" | "cross_above" | "cross_below";

// ============================================================================
// COMPONENT
// ============================================================================

export const LimitOrderForm = memo(function LimitOrderForm({
  currentPrice,
  symbol,
  balance,
  profitPercentage,
  expiryMinutes,
  onSubmit,
  onCancel,
  theme = "dark",
  compact = false,
}: LimitOrderFormProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  // Form state
  const [side, setSide] = useState<"RISE" | "FALL">("RISE");
  const [amount, setAmount] = useState(100);
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [condition, setCondition] = useState<OrderCondition>("above");
  const [limitOrderExpiry, setLimitOrderExpiry] = useState(60); // Minutes until limit order expires
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  // Calculate distance from current price
  const priceDistance = useMemo(() => {
    const diff = limitPrice - currentPrice;
    const percent = ((diff / currentPrice) * 100).toFixed(2);
    return {
      absolute: Math.abs(diff).toFixed(symbol.includes("BTC") ? 2 : 4),
      percent: Math.abs(parseFloat(percent)).toFixed(2),
      isAbove: diff > 0,
    };
  }, [limitPrice, currentPrice, symbol]);

  // Validate form
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (amount <= 0) errors.push("Amount must be greater than 0");
    if (amount > balance) errors.push("Amount exceeds available balance");
    if (limitPrice <= 0) errors.push("Limit price must be greater than 0");

    // Validate condition makes sense with price
    if (condition === "above" && limitPrice <= currentPrice) {
      errors.push("For 'above' condition, limit price should be above current price");
    }
    if (condition === "below" && limitPrice >= currentPrice) {
      errors.push("For 'below' condition, limit price should be below current price");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [amount, balance, limitPrice, currentPrice, condition]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!validation.isValid) return;

    onSubmit({
      side,
      amount,
      limitPrice,
      expiryMinutes,
      condition,
      limitOrderExpiry,
    });
  }, [side, amount, limitPrice, expiryMinutes, condition, limitOrderExpiry, validation.isValid, onSubmit]);

  // Quick price adjustments
  const adjustPrice = useCallback(
    (percent: number) => {
      const adjustment = currentPrice * (percent / 100);
      setLimitPrice(parseFloat((currentPrice + adjustment).toFixed(symbol.includes("BTC") ? 2 : 4)));
    },
    [currentPrice, symbol]
  );

  // Quick amount presets
  const quickAmounts = useMemo(
    () => [
      { label: "10%", value: balance * 0.1 },
      { label: "25%", value: balance * 0.25 },
      { label: "50%", value: balance * 0.5 },
    ],
    [balance]
  );

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-500" />
          <span className={`text-sm font-medium ${textClass}`}>{t("limit_order")}</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className={`p-1 rounded ${theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
          >
            <X size={16} className={subtitleClass} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Side Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("RISE")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
              side === "RISE"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : theme === "dark"
                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <TrendingUp size={16} />
            RISE
          </button>
          <button
            onClick={() => setSide("FALL")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
              side === "FALL"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                : theme === "dark"
                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <TrendingDown size={16} />
            FALL
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
            Amount
          </label>
          <div className="flex gap-2 mt-1">
            <div className={`flex-1 ${inputBgClass} rounded-lg flex items-center px-3`}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
              />
              <span className={`text-xs ${subtitleClass}`}>USDT</span>
            </div>
            {quickAmounts.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setAmount(Math.floor(preset.value))}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  theme === "dark"
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price Input */}
        <div>
          <div className="flex items-center justify-between">
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {tCommon("limit_price")}
            </label>
            <span className={`text-xs ${subtitleClass}`}>
              {tCommon("current")} {currentPrice.toFixed(symbol.includes("BTC") ? 2 : 4)}
            </span>
          </div>
          <div className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
              step={symbol.includes("BTC") ? 0.01 : 0.0001}
              className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
            />
            <span
              className={`text-xs font-medium ${
                priceDistance.isAbove ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {priceDistance.isAbove ? "+" : "-"}
              {priceDistance.percent}%
            </span>
          </div>

          {/* Quick price adjustments */}
          <div className="flex gap-1.5 mt-2">
            {[-2, -1, -0.5, 0.5, 1, 2].map((percent) => (
              <button
                key={percent}
                onClick={() => adjustPrice(percent)}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                  percent > 0
                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                }`}
              >
                {percent > 0 ? "+" : ""}
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* Condition Selection */}
        <div>
          <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
            {t("trigger_when_price")}
          </label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { value: "above", label: "Goes Above" },
              { value: "below", label: "Goes Below" },
              { value: "cross_above", label: "Crosses Up" },
              { value: "cross_below", label: "Crosses Down" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCondition(opt.value as OrderCondition)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  condition === opt.value
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        {!compact && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg ${
              theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
            }`}
          >
            <span className={`text-xs ${subtitleClass}`}>{tCommon("advanced_options")}</span>
            {showAdvanced ? (
              <ChevronUp size={14} className={subtitleClass} />
            ) : (
              <ChevronDown size={14} className={subtitleClass} />
            )}
          </button>
        )}

        {/* Advanced options */}
        {showAdvanced && (
          <div className="space-y-3">
            {/* Limit order expiry */}
            <div>
              <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
                {t("order_valid_for")}
              </label>
              <div className="flex gap-2 mt-1">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setLimitOrderExpiry(mins)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      limitOrderExpiry === mins
                        ? "bg-blue-500 text-white"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div
          className={`p-3 rounded-lg ${
            theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs ${subtitleClass}`}>{t("potential_profit")}</span>
            <span className="text-sm font-semibold text-emerald-500">
              +{((amount * profitPercentage) / 100).toFixed(2)} USDT
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs ${subtitleClass}`}>{t("trade_expiry")}</span>
            <span className={`text-sm ${textClass}`}>{expiryMinutes} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${subtitleClass}`}>{t("order_valid_for")}</span>
            <span className={`text-sm ${textClass}`}>
              {limitOrderExpiry < 60 ? `${limitOrderExpiry}m` : `${limitOrderExpiry / 60}h`}
            </span>
          </div>
        </div>

        {/* Validation errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-1">
            {validation.errors.map((error, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-amber-500"
              >
                <AlertCircle size={12} />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!validation.isValid}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
            validation.isValid
              ? side === "RISE"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <Plus size={16} />
          {t("place_limit_order")}
        </button>
      </div>
    </div>
  );
});

export default LimitOrderForm;
