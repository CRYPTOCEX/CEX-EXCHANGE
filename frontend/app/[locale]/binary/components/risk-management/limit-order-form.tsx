"use client";

/**
 * Limit Order Form Component
 *
 * Allows users to place limit orders that trigger when price reaches a target.
 *
 * Colour: RISE/FALL and the price-offset buttons are genuine direction, so they
 * keep `up` / `down`. Everything else — condition, validity, quick amounts — is
 * a selected option and takes the accent. Validation messages block submission,
 * so they are `destructive`, with the hue on the icon and the message itself on
 * `foreground`: 12px `text-destructive` on its own tint measures 3.64:1 in
 * light mode, under the 4.5:1 floor.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
} from "lucide-react";
import type { LimitOrderFormData } from "./risk-management-types";
import {
  ActionButton,
  FieldLabel,
  NumberField,
  OptionRow,
  Panel,
  PanelTitle,
  SummaryRow,
  toneInk,
} from "./risk-ui";
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
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
}

type OrderCondition = "above" | "below" | "cross_above" | "cross_below";

const PRICE_NUDGES = [-2, -1, -0.5, 0.5, 1, 2] as const;
const VALIDITY_MINUTES = [15, 30, 60, 120] as const;

const CONDITION_OPTIONS = [
  { value: "above" as const, label: "Goes Above" },
  { value: "below" as const, label: "Goes Below" },
  { value: "cross_above" as const, label: "Crosses Up" },
  { value: "cross_below" as const, label: "Crosses Down" },
];

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
    <Panel
      header={
        <>
          <PanelTitle icon={<Target size={16} />}>{tCommon("limit_order")}</PanelTitle>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded hover:bg-surface-3"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
        </>
      }
    >
      {/* Side Selection — direction is the content here, so it keeps up/down */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("RISE")}
          aria-pressed={side === "RISE"}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
            side === "RISE"
              ? "bg-up text-success-foreground"
              : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
          }`}
        >
          <TrendingUp size={16} />
          RISE
        </button>
        <button
          type="button"
          onClick={() => setSide("FALL")}
          aria-pressed={side === "FALL"}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
            side === "FALL"
              ? "bg-down text-destructive-foreground"
              : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
          }`}
        >
          <TrendingDown size={16} />
          FALL
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <FieldLabel>Amount</FieldLabel>
        <div className="flex gap-2 mt-1">
          <NumberField
            className="flex-1 mt-0"
            value={amount}
            onChange={setAmount}
            suffix="USDT"
            ariaLabel="Amount"
          />
          {quickAmounts.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setAmount(Math.floor(preset.value))}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Limit Price Input */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>{tCommon("limit_price")}</FieldLabel>
          <span className="text-xs text-muted-foreground">
            {tCommon("current")} {currentPrice.toFixed(symbol.includes("BTC") ? 2 : 4)}
          </span>
        </div>
        <div className="mt-1 rounded-lg flex items-center px-3 bg-surface-3">
          <input
            type="number"
            value={limitPrice}
            aria-label={tCommon("limit_price")}
            onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
            step={symbol.includes("BTC") ? 0.01 : 0.0001}
            className="flex-1 bg-transparent py-2 outline-none text-foreground text-sm"
          />
          <span
            className={`text-xs font-medium ${
              priceDistance.isAbove ? "text-up" : "text-down"
            }`}
          >
            {priceDistance.isAbove ? "+" : "-"}
            {priceDistance.percent}%
          </span>
        </div>

        {/* Quick price adjustments — the sign carries the direction, so the
            label stays on `foreground` and only the tint differs */}
        <div className="flex gap-1.5 mt-2">
          {PRICE_NUDGES.map((percent) => (
            <button
              key={percent}
              type="button"
              onClick={() => adjustPrice(percent)}
              className={`flex-1 py-1.5 rounded text-xs font-medium text-foreground transition-colors ${
                percent > 0
                  ? "bg-up/10 hover:bg-up/20"
                  : "bg-down/10 hover:bg-down/20"
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
        <FieldLabel>{t("trigger_when_price")}</FieldLabel>
        <OptionRow
          className="mt-1"
          layout="grid-2"
          value={condition}
          onSelect={setCondition}
          options={CONDITION_OPTIONS}
        />
      </div>

      {/* Advanced options toggle */}
      {!compact && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-surface-2 hover:bg-surface-3"
        >
          <span className="text-xs text-muted-foreground">
            {tCommon("advanced_options")}
          </span>
          {showAdvanced ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>
      )}

      {/* Advanced options */}
      {showAdvanced && (
        <div className="space-y-3">
          {/* Limit order expiry */}
          <div>
            <FieldLabel>{tCommon("order_valid_for")}</FieldLabel>
            <OptionRow
              className="mt-1"
              value={limitOrderExpiry}
              onSelect={setLimitOrderExpiry}
              options={VALIDITY_MINUTES.map((mins) => ({
                value: mins,
                label: mins < 60 ? `${mins}m` : `${mins / 60}h`,
              }))}
            />
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="p-3 rounded-lg bg-surface-2">
        <SummaryRow
          className="mb-2"
          label={t("potential_profit")}
          value={`+${((amount * profitPercentage) / 100).toFixed(2)} USDT`}
          tone="up"
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{t("trade_expiry")}</span>
          <span className="text-sm text-foreground">{expiryMinutes} min</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{tCommon("order_valid_for")}</span>
          <span className="text-sm text-foreground">
            {limitOrderExpiry < 60 ? `${limitOrderExpiry}m` : `${limitOrderExpiry / 60}h`}
          </span>
        </div>
      </div>

      {/* Validation errors — these block submission, so destructive, with the
          hue on the icon and the message on foreground for legibility */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground">
              <AlertCircle size={12} className={`shrink-0 ${toneInk("danger")}`} />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <ActionButton
        onClick={handleSubmit}
        disabled={!validation.isValid}
        tone={side === "RISE" ? "up" : "down"}
      >
        <Plus size={16} />
        {t("place_limit_order")}
      </ActionButton>
    </Panel>
  );
});

export default LimitOrderForm;
