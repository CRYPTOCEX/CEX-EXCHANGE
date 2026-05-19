"use client";

/**
 * Barrier Input Component
 *
 * Input for selecting barrier level for HIGHER_LOWER, TOUCH_NO_TOUCH, and TURBO orders.
 * Uses predefined barrier levels from settings instead of allowing manual input.
 */

import { useState, useMemo, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, Info, ChevronDown, Check } from "lucide-react";
import type { BinaryOrderType } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

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
  darkMode = true,
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

  if (barrierLevels.length === 0) {
    return (
      <div className={`p-3 rounded-lg border ${
        darkMode ? "bg-zinc-800/30 border-zinc-700/50" : "bg-gray-100 border-gray-200"
      }`}>
        <p className={`text-xs ${darkMode ? "text-zinc-500" : "text-gray-500"}`}>
          {t("no_barrier_levels_configured_for_this_order_type")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-medium ${
            darkMode ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          <Target size={12} className="inline mr-1" />
          {t("barrier_level")}
        </label>
        {currentPrice > 0 && (
          <span
            className={`text-xs ${darkMode ? "text-zinc-500" : "text-zinc-500"}`}
          >
            {tCommon("current")} {formatPrice(currentPrice)}
          </span>
        )}
      </div>

      {/* Direction Selector (for HIGHER_LOWER) */}
      {orderType === "HIGHER_LOWER" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDirectionChange("higher")}
            disabled={disabled}
            className={`
              flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all
              ${selectedDirection === "higher"
                ? darkMode
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 border"
                  : "bg-emerald-100 border-emerald-500/50 text-emerald-600 border"
                : darkMode
                  ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 border hover:border-zinc-600"
                  : "bg-gray-100 border-gray-200 text-gray-600 border hover:border-gray-300"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <TrendingUp size={12} className="inline mr-1" />
            Higher
          </button>
          <button
            type="button"
            onClick={() => handleDirectionChange("lower")}
            disabled={disabled}
            className={`
              flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all
              ${selectedDirection === "lower"
                ? darkMode
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-400 border"
                  : "bg-rose-100 border-rose-500/50 text-rose-600 border"
                : darkMode
                  ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 border hover:border-zinc-600"
                  : "bg-gray-100 border-gray-200 text-gray-600 border hover:border-gray-300"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <TrendingDown size={12} className="inline mr-1" />
            Lower
          </button>
        </div>
      )}

      {/* Barrier Level Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          disabled={disabled}
          className={`
            w-full px-3 py-2.5 rounded-lg flex items-center justify-between
            ${
              darkMode
                ? "bg-zinc-800/50 border border-zinc-700/50 text-white"
                : "bg-white border border-zinc-200 text-zinc-900"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-500/50"}
            transition-all
          `}
        >
          <div className="flex items-center gap-2">
            {selectedBarrierLevel ? (
              <>
                <span className="text-sm font-medium">{selectedBarrierLevel.label}</span>
                {barrier && (
                  <span className={`text-xs ${
                    selectedDirection === "higher" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    ({formatPrice(barrier)})
                  </span>
                )}
              </>
            ) : (
              <span className={`text-sm ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                {t("select_barrier_level_ellipsis")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedBarrierLevel && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
              }`}>
                {selectedBarrierLevel.profitPercent}%
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className={`
            absolute z-50 w-full mt-1 rounded-lg border overflow-hidden
            ${
              darkMode
                ? "bg-zinc-800 border-zinc-700"
                : "bg-white border-zinc-200"
            }
            shadow-lg
          `}>
            {barrierLevels.map((level) => {
              const barrierPrice = calculateBarrierPrice(currentPrice, level.distancePercent, selectedDirection === "higher");
              const isSelected = selectedBarrierLevel?.id === level.id;

              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleSelectLevel(level)}
                  className={`
                    w-full px-3 py-2.5 flex items-center justify-between text-left
                    transition-colors
                    ${isSelected
                      ? darkMode
                        ? "bg-blue-500/20 text-white"
                        : "bg-blue-50 text-blue-900"
                      : darkMode
                        ? "hover:bg-zinc-700/50 text-white"
                        : "hover:bg-gray-50 text-gray-900"
                    }
                  `}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{level.label}</span>
                    <span className={`text-xs ${
                      selectedDirection === "higher" ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {formatPrice(barrierPrice)}
                      <span className={`ml-1 ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                        ({selectedDirection === "higher" ? "+" : "-"}{level.distancePercent}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {level.profitPercent}% profit
                    </span>
                    {isSelected && <Check size={14} className="text-blue-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className={`flex items-start gap-1.5 text-xs ${
          darkMode ? "text-zinc-500" : "text-zinc-500"
        }`}
      >
        <Info size={12} className="mt-0.5 shrink-0" />
        <p>{getInfoText()}</p>
      </div>
    </div>
  );
}
