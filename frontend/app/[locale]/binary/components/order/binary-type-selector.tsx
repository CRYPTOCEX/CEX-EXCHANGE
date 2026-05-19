"use client";

/**
 * Binary Order Type Selector Component
 *
 * Allows users to select between different binary trading types:
 * - RISE_FALL (default)
 * - HIGHER_LOWER
 * - TOUCH_NO_TOUCH
 * - CALL_PUT
 * - TURBO
 */

import { memo } from "react";
import {
  TrendingUp,
  Target,
  Hand,
  Phone,
  Zap,
  Lock,
  Info,
} from "lucide-react";
import {
  type BinaryOrderType,
  ORDER_TYPE_CONFIGS,
  getAvailableOrderTypes,
} from "@/types/binary-trading";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface BinaryTypeSelectorProps {
  selectedType: BinaryOrderType;
  onChange: (type: BinaryOrderType) => void;
  darkMode?: boolean;
  showUnavailable?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const TYPE_ICONS: Record<BinaryOrderType, React.ElementType> = {
  RISE_FALL: TrendingUp,
  HIGHER_LOWER: Target,
  TOUCH_NO_TOUCH: Hand,
  CALL_PUT: Phone,
  TURBO: Zap,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BinaryTypeSelector = memo(function BinaryTypeSelector({
  selectedType,
  onChange,
  darkMode = true,
  showUnavailable = false,
}: BinaryTypeSelectorProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const availableTypes = showUnavailable
    ? (Object.keys(ORDER_TYPE_CONFIGS) as BinaryOrderType[])
    : getAvailableOrderTypes();

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-medium ${
            darkMode ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          {tCommon("order_type")}
        </label>
      </div>

      {/* Type Grid */}
      <div className="grid grid-cols-2 gap-2">
        {availableTypes.map((type) => {
          const config = ORDER_TYPE_CONFIGS[type];
          const Icon = TYPE_ICONS[type];
          const isSelected = selectedType === type;
          const isAvailable = config.isAvailable;

          return (
            <button
              key={type}
              onClick={() => isAvailable && onChange(type)}
              disabled={!isAvailable}
              className={`
                relative flex flex-col items-center gap-1.5 p-3 rounded-lg
                border transition-all
                ${
                  isSelected
                    ? darkMode
                      ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5"
                      : "bg-blue-50 border-blue-200 shadow-sm"
                    : darkMode
                    ? "bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600"
                    : "bg-white border-zinc-200 hover:border-zinc-300"
                }
                ${!isAvailable && "opacity-50 cursor-not-allowed"}
              `}
              title={!isAvailable ? "Coming soon" : config.description}
            >
              {/* Lock overlay for unavailable types */}
              {!isAvailable && (
                <div className="absolute top-1 right-1">
                  <Lock
                    size={12}
                    className={darkMode ? "text-zinc-600" : "text-zinc-400"}
                  />
                </div>
              )}

              {/* Icon */}
              <Icon
                size={20}
                className={`
                  ${
                    isSelected
                      ? "text-blue-500"
                      : darkMode
                      ? "text-zinc-400"
                      : "text-zinc-500"
                  }
                `}
              />

              {/* Label */}
              <span
                className={`text-xs font-medium text-center ${
                  isSelected
                    ? "text-blue-500"
                    : darkMode
                    ? "text-zinc-300"
                    : "text-zinc-700"
                }`}
              >
                {config.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Description */}
      {selectedType && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
            darkMode
              ? "bg-zinc-800/50 text-zinc-400"
              : "bg-zinc-50 text-zinc-600"
          }`}
        >
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <p>{ORDER_TYPE_CONFIGS[selectedType].description}</p>
        </div>
      )}
    </div>
  );
});

export default BinaryTypeSelector;
