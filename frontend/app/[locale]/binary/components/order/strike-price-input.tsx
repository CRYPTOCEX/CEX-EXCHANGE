"use client";

/**
 * Strike Price Input Component
 *
 * Input for selecting strike level for CALL_PUT orders.
 * Uses predefined strike levels from settings instead of allowing manual input.
 */

import { useState, useMemo, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Info, ChevronDown, Check } from "lucide-react";
import type { BinaryOrderType } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

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
  darkMode?: boolean;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StrikePriceInput({
  orderType,
  currentPrice,
  strikePrice,
  onChange,
  darkMode = true,
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

  // Get moneyness label
  const getMoneyness = (level: StrikeLevel, direction: "call" | "put") => {
    if (level.distancePercent <= 0.15) {
      return { label: "ATM", color: "text-yellow-500", bg: darkMode ? "bg-yellow-500/20" : "bg-yellow-100" };
    }
    // For CALL: higher strike = OTM, for PUT: lower strike = OTM
    // Since we calculate strike above for CALL and below for PUT, both are OTM
    return { label: "OTM", color: "text-rose-500", bg: darkMode ? "bg-rose-500/20" : "bg-rose-100" };
  };

  if (strikeLevels.length === 0) {
    return (
      <div className={`p-3 rounded-lg border ${
        darkMode ? "bg-zinc-800/30 border-zinc-700/50" : "bg-gray-100 border-gray-200"
      }`}>
        <p className={`text-xs ${darkMode ? "text-zinc-500" : "text-gray-500"}`}>
          {t("no_strike_levels_configured_for_call_put_orders")}
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
          <DollarSign size={12} className="inline mr-1" />
          {t("strike_level")}
        </label>
        {currentPrice > 0 && (
          <span
            className={`text-xs ${darkMode ? "text-zinc-500" : "text-zinc-500"}`}
          >
            {tCommon("current")} {formatPrice(currentPrice)}
          </span>
        )}
      </div>

      {/* Option Type Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleDirectionChange("call")}
          disabled={disabled}
          className={`
            flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all
            ${selectedDirection === "call"
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
          CALL
        </button>
        <button
          type="button"
          onClick={() => handleDirectionChange("put")}
          disabled={disabled}
          className={`
            flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all
            ${selectedDirection === "put"
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
          PUT
        </button>
      </div>

      {/* Strike Level Dropdown */}
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
            {selectedStrikeLevel ? (
              <>
                <span className="text-sm font-medium">{selectedStrikeLevel.label}</span>
                {strikePrice && (
                  <span className={`text-xs ${
                    selectedDirection === "call" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    ({formatPrice(strikePrice)})
                  </span>
                )}
                {selectedStrikeLevel && (
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                    getMoneyness(selectedStrikeLevel, selectedDirection).bg
                  } ${getMoneyness(selectedStrikeLevel, selectedDirection).color}`}>
                    {getMoneyness(selectedStrikeLevel, selectedDirection).label}
                  </span>
                )}
              </>
            ) : (
              <span className={`text-sm ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                {t("select_strike_level_ellipsis")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedStrikeLevel && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                darkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
              }`}>
                {selectedStrikeLevel.profitPercent}%
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className={`
            absolute z-50 w-full mt-1 rounded-lg border overflow-hidden max-h-[200px] overflow-y-auto
            ${
              darkMode
                ? "bg-zinc-800 border-zinc-700"
                : "bg-white border-zinc-200"
            }
            shadow-lg
          `}>
            {strikeLevels.map((level) => {
              const price = calculateStrikePrice(currentPrice, level.distancePercent, selectedDirection === "call");
              const isSelected = selectedStrikeLevel?.id === level.id;
              const moneyness = getMoneyness(level, selectedDirection);

              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleSelectLevel(level)}
                  className={`
                    w-full px-2.5 py-2 flex items-center justify-between text-left
                    transition-colors
                    ${isSelected
                      ? darkMode
                        ? "bg-purple-500/20 text-white"
                        : "bg-purple-50 text-purple-900"
                      : darkMode
                        ? "hover:bg-zinc-700/50 text-white"
                        : "hover:bg-gray-50 text-gray-900"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{level.label}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${moneyness.bg} ${moneyness.color}`}>
                          {moneyness.label}
                        </span>
                      </div>
                      <span className={`text-[10px] ${
                        selectedDirection === "call" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {formatPrice(price)}
                        <span className={`ml-1 ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                          ({selectedDirection === "call" ? "+" : "-"}{level.distancePercent}%)
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      darkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                    }`}>
                      {level.profitPercent}%
                    </span>
                    {isSelected && <Check size={12} className="text-purple-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CALL/PUT Explanation */}
      <div
        className={`flex items-center justify-between text-xs ${
          darkMode ? "text-zinc-600" : "text-zinc-400"
        }`}
      >
        <div className="flex items-center gap-1">
          <TrendingUp size={12} className="text-emerald-500" />
          <span>{t("call_price_strike")}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={12} className="text-rose-500" />
          <span>{t("put_price_strike")}</span>
        </div>
      </div>

      {/* Info */}
      <div
        className={`flex items-start gap-1.5 text-xs ${
          darkMode ? "text-zinc-500" : "text-zinc-500"
        }`}
      >
        <Info size={12} className="mt-0.5 shrink-0" />
        <p>
          {selectedDirection === "call"
            ? "Win if price closes ABOVE the strike price at expiry"
            : "Win if price closes BELOW the strike price at expiry"}
        </p>
      </div>
    </div>
  );
}
