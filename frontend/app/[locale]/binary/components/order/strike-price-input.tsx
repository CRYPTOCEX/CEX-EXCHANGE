"use client";

/**
 * Strike Price Input Component
 *
 * Input for selecting strike level for CALL_PUT orders.
 * Uses predefined strike levels from settings instead of allowing manual input.
 */

import { useState, useMemo, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, Check } from "lucide-react";
import type { BinaryOrderType } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  DirectionToggle,
  InfoNote,
  LevelDropdown,
  LevelRow,
  PayoutChip,
  SIDE_INK,
} from "./order-ui";

// ============================================================================
// TYPES
// ============================================================================

interface StrikeLevel {
  id: string;
  label: string;
  distancePercent: number;
  profitPercent: number;
  enabled: boolean;
}

interface StrikePriceInputProps {
  orderType: BinaryOrderType;
  currentPrice: number;
  strikePrice: number | null;
  onChange: (strikePrice: number | null) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
  disabled?: boolean;
}

/**
 * Moneyness is a LABEL, not a state — the badge already spells out "ATM" or
 * "OTM", and neither is a success or a failure. Colouring them made an ordinary
 * out-of-the-money strike read as an error, so both take the neutral chip.
 */
function MoneynessBadge({
  level,
  className,
}: {
  level: StrikeLevel;
  className?: string;
}) {
  const t = useTranslations("binary_components");
  const label = level.distancePercent <= 0.15 ? t("atm") : t("otm");
  return (
    <span
      className={cn(
        "font-bold px-1 py-0.5 rounded bg-surface-3 text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StrikePriceInput({
  orderType,
  currentPrice,
  strikePrice,
  onChange,
  disabled = false,
}: StrikePriceInputProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<"call" | "put">("call");

  // Get strike levels from store
  const getEnabledStrikeLevels = useBinaryStore((state) => state.getEnabledStrikeLevels);
  const setStrikeLevelInStore = useBinaryStore((state) => state.setSelectedStrikeLevel);
  const selectedStrikeLevel = useBinaryStore((state) => state.selectedStrikeLevel);

  // Get enabled strike levels
  const strikeLevels = useMemo(() => {
    return getEnabledStrikeLevels();
  }, [getEnabledStrikeLevels]);

  // Set default strike level if none is selected
  useEffect(() => {
    if (!selectedStrikeLevel && strikeLevels.length > 0 && currentPrice > 0) {
      const firstLevel = strikeLevels[0];
      setStrikeLevelInStore(firstLevel);
      // Calculate and set the strike price based on direction
      const price = calculateStrikePrice(currentPrice, firstLevel.distancePercent, selectedDirection === "call");
      onChange(price);
    }
  }, [selectedStrikeLevel, strikeLevels, currentPrice, setStrikeLevelInStore, onChange, selectedDirection]);

  // Update strike price when direction changes
  useEffect(() => {
    if (selectedStrikeLevel && currentPrice > 0) {
      const price = calculateStrikePrice(currentPrice, selectedStrikeLevel.distancePercent, selectedDirection === "call");
      onChange(price);
    }
  }, [selectedDirection, selectedStrikeLevel, currentPrice, onChange]);

  const calculateStrikePrice = (price: number, distancePercent: number, isCall: boolean): number => {
    const distance = price * (distancePercent / 100);
    // For CALL: strike above current price (OTM), for PUT: strike below current price (OTM)
    return isCall ? price + distance : price - distance;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(currentPrice > 1000 ? 2 : 4);
  };

  const handleSelectLevel = (level: StrikeLevel) => {
    setStrikeLevelInStore(level);
    const price = calculateStrikePrice(currentPrice, level.distancePercent, selectedDirection === "call");
    onChange(price);
    setShowDropdown(false);
  };

  const handleDirectionChange = (direction: "call" | "put") => {
    setSelectedDirection(direction);
    if (selectedStrikeLevel && currentPrice > 0) {
      const price = calculateStrikePrice(currentPrice, selectedStrikeLevel.distancePercent, direction === "call");
      onChange(price);
    }
  };

  // CALL is the bullish half of the bet, PUT the bearish one.
  const directionInk = SIDE_INK[selectedDirection === "call" ? "up" : "down"];

  if (strikeLevels.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-border bg-surface-3">
        <p className="text-xs text-subtle-foreground">
          {t("no_strike_levels_configured_for_call_put_orders")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          <DollarSign size={12} className="inline mr-1" />
          {t("strike_level")}
        </label>
        {currentPrice > 0 && (
          <span className="text-xs text-subtle-foreground">
            {tCommon("current")} {formatPrice(currentPrice)}
          </span>
        )}
      </div>

      {/* Option Type Selector */}
      <DirectionToggle
        value={selectedDirection}
        onChange={handleDirectionChange}
        disabled={disabled}
        options={[
          { value: "call", label: tCommon("call"), side: "up", icon: TrendingUp },
          { value: "put", label: tCommon("put"), side: "down", icon: TrendingDown },
        ]}
      />

      {/* Strike Level Dropdown */}
      <LevelDropdown
        open={showDropdown}
        onToggle={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        listClassName="max-h-[200px] overflow-y-auto"
        trigger={
          <>
            <div className="flex items-center gap-2">
              {selectedStrikeLevel ? (
                <>
                  <span className="text-sm font-medium">{selectedStrikeLevel.label}</span>
                  {strikePrice && (
                    <span className={cn("text-xs", directionInk)}>
                      ({formatPrice(strikePrice)})
                    </span>
                  )}
                  <MoneynessBadge
                    level={selectedStrikeLevel}
                    className="text-[10px]"
                  />
                </>
              ) : (
                <span className="text-sm text-subtle-foreground">
                  {t("select_strike_level")}…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedStrikeLevel && (
                <PayoutChip className="text-xs font-medium">
                  {selectedStrikeLevel.profitPercent}%
                </PayoutChip>
              )}
              <ChevronDown
                size={14}
                className={cn("transition-transform", showDropdown && "rotate-180")}
              />
            </div>
          </>
        }
      >
        {strikeLevels.map((level) => {
          const price = calculateStrikePrice(currentPrice, level.distancePercent, selectedDirection === "call");
          const isSelected = selectedStrikeLevel?.id === level.id;

          return (
            <LevelRow
              key={level.id}
              selected={isSelected}
              onClick={() => handleSelectLevel(level)}
              className="px-2.5 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{level.label}</span>
                    <MoneynessBadge level={level} className="text-[9px] shrink-0" />
                  </div>
                  <span className={cn("text-[10px]", directionInk)}>
                    {formatPrice(price)}
                    <span className="ml-1 text-subtle-foreground">
                      ({selectedDirection === "call" ? "+" : "-"}{level.distancePercent}%)
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PayoutChip className="font-medium">{level.profitPercent}%</PayoutChip>
                {isSelected && <Check size={12} className="text-primary" />}
              </div>
            </LevelRow>
          );
        })}
      </LevelDropdown>

      {/* CALL/PUT Explanation */}
      <div className="flex items-center justify-between text-xs text-subtle-foreground">
        <div className="flex items-center gap-1">
          <TrendingUp size={12} className="text-up" />
          <span>{t("call_price_strike")}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={12} className="text-down" />
          <span>{t("put_price_strike")}</span>
        </div>
      </div>

      {/* Info */}
      <InfoNote>
        {selectedDirection === "call"
          ? t("win_if_price_closes_above_the")
          : t("win_if_price_closes_below_the")}
      </InfoNote>
    </div>
  );
}
