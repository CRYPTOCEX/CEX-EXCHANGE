"use client";

/**
 * Barrier Input Component
 *
 * Input for selecting barrier level for HIGHER_LOWER, TOUCH_NO_TOUCH, and TURBO orders.
 * Uses predefined barrier levels from settings instead of allowing manual input.
 */

import { useState, useMemo, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, ChevronDown, Check } from "lucide-react";
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

interface BarrierLevel {
  id: string;
  label: string;
  distancePercent: number;
  profitPercent: number;
  enabled: boolean;
}

interface BarrierInputProps {
  orderType: BinaryOrderType;
  currentPrice: number;
  barrier: number | null;
  onChange: (barrier: number | null) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BarrierInput({
  orderType,
  currentPrice,
  barrier,
  onChange,
  disabled = false,
}: BarrierInputProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<"higher" | "lower">("higher");

  // Get barrier levels from store
  const getEnabledBarrierLevels = useBinaryStore((state) => state.getEnabledBarrierLevels);
  const setBarrierLevelInStore = useBinaryStore((state) => state.setSelectedBarrierLevel);
  const selectedBarrierLevel = useBinaryStore((state) => state.selectedBarrierLevel);

  // Get enabled barrier levels for this order type
  const barrierLevels = useMemo(() => {
    return getEnabledBarrierLevels(orderType);
  }, [getEnabledBarrierLevels, orderType]);

  // Set default barrier level if none is selected
  useEffect(() => {
    if (!selectedBarrierLevel && barrierLevels.length > 0 && currentPrice > 0) {
      const firstLevel = barrierLevels[0];
      setBarrierLevelInStore(firstLevel);
      // Calculate and set the barrier price based on direction
      const barrierPrice = calculateBarrierPrice(currentPrice, firstLevel.distancePercent, selectedDirection === "higher");
      onChange(barrierPrice);
    }
  }, [selectedBarrierLevel, barrierLevels, currentPrice, setBarrierLevelInStore, onChange, selectedDirection]);

  // Update barrier price when direction changes
  useEffect(() => {
    if (selectedBarrierLevel && currentPrice > 0) {
      const barrierPrice = calculateBarrierPrice(currentPrice, selectedBarrierLevel.distancePercent, selectedDirection === "higher");
      onChange(barrierPrice);
    }
  }, [selectedDirection, selectedBarrierLevel, currentPrice, onChange]);

  const calculateBarrierPrice = (price: number, distancePercent: number, isHigher: boolean): number => {
    const distance = price * (distancePercent / 100);
    return isHigher ? price + distance : price - distance;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(currentPrice > 1000 ? 2 : 4);
  };

  const handleSelectLevel = (level: BarrierLevel) => {
    setBarrierLevelInStore(level);
    const barrierPrice = calculateBarrierPrice(currentPrice, level.distancePercent, selectedDirection === "higher");
    onChange(barrierPrice);
    setShowDropdown(false);
  };

  const handleDirectionChange = (direction: "higher" | "lower") => {
    setSelectedDirection(direction);
    if (selectedBarrierLevel && currentPrice > 0) {
      const barrierPrice = calculateBarrierPrice(currentPrice, selectedBarrierLevel.distancePercent, direction === "higher");
      onChange(barrierPrice);
    }
  };

  // Get info text based on order type
  const getInfoText = () => {
    switch (orderType) {
      case "HIGHER_LOWER":
        return selectedDirection === "higher"
          ? "Price must close ABOVE this barrier at expiry to win"
          : "Price must close BELOW this barrier at expiry to win";
      case "TOUCH_NO_TOUCH":
        return "Price must touch (or avoid) this barrier before expiry";
      case "TURBO":
        return "This is the knockout barrier - breaching it triggers instant loss";
      default:
        return "";
    }
  };

  // Direction is price direction, so it carries the up/down tokens.
  const directionInk = SIDE_INK[selectedDirection === "higher" ? "up" : "down"];

  if (barrierLevels.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-border bg-surface-3">
        <p className="text-xs text-subtle-foreground">
          {t("no_barrier_levels_configured_for_this_order_type")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          <Target size={12} className="inline mr-1" />
          {t("barrier_level")}
        </label>
        {currentPrice > 0 && (
          <span className="text-xs text-subtle-foreground">
            {tCommon("current")} {formatPrice(currentPrice)}
          </span>
        )}
      </div>

      {/* Direction Selector (for HIGHER_LOWER) */}
      {orderType === "HIGHER_LOWER" && (
        <DirectionToggle
          value={selectedDirection}
          onChange={handleDirectionChange}
          disabled={disabled}
          options={[
            { value: "higher", label: tCommon("higher"), side: "up", icon: TrendingUp },
            { value: "lower", label: tCommon("lower"), side: "down", icon: TrendingDown },
          ]}
        />
      )}

      {/* Barrier Level Dropdown */}
      <LevelDropdown
        open={showDropdown}
        onToggle={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        trigger={
          <>
            <div className="flex items-center gap-2">
              {selectedBarrierLevel ? (
                <>
                  <span className="text-sm font-medium">{selectedBarrierLevel.label}</span>
                  {barrier && (
                    <span className={cn("text-xs", directionInk)}>
                      ({formatPrice(barrier)})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-subtle-foreground">
                  {t("select_barrier_level")}…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedBarrierLevel && (
                <PayoutChip className="text-xs font-medium">
                  {selectedBarrierLevel.profitPercent}%
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
        {barrierLevels.map((level) => {
          const barrierPrice = calculateBarrierPrice(currentPrice, level.distancePercent, selectedDirection === "higher");
          const isSelected = selectedBarrierLevel?.id === level.id;

          return (
            <LevelRow
              key={level.id}
              selected={isSelected}
              onClick={() => handleSelectLevel(level)}
              className="px-3 py-2.5"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{level.label}</span>
                <span className={cn("text-xs", directionInk)}>
                  {formatPrice(barrierPrice)}
                  <span className="ml-1 text-subtle-foreground">
                    ({selectedDirection === "higher" ? "+" : "-"}{level.distancePercent}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PayoutChip className="text-xs font-medium">
                  {level.profitPercent}% profit
                </PayoutChip>
                {isSelected && <Check size={14} className="text-primary" />}
              </div>
            </LevelRow>
          );
        })}
      </LevelDropdown>

      {/* Info */}
      <InfoNote>{getInfoText()}</InfoNote>
    </div>
  );
}
