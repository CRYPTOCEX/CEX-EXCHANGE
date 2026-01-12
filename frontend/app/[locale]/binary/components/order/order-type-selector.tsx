"use client";

/**
 * Order Type Selector Component
 *
 * Allows users to switch between Market and Limit order modes.
 */

import { memo } from "react";
import { Zap, Target } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type OrderType = "market" | "limit";

interface OrderTypeSelectorProps {
  orderType: OrderType;
  onChange: (type: OrderType) => void;
  darkMode?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderTypeSelector = memo(function OrderTypeSelector({
  orderType,
  onChange,
  darkMode = true,
}: OrderTypeSelectorProps) {
  return (
    <div
      className={`flex rounded-lg p-0.5 ${
        darkMode ? "bg-zinc-800/50" : "bg-zinc-100"
      }`}
    >
      <button
        onClick={() => onChange("market")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
          orderType === "market"
            ? darkMode
              ? "bg-zinc-700 text-white shadow-sm"
              : "bg-white text-zinc-900 shadow-sm"
            : darkMode
            ? "text-zinc-400 hover:text-zinc-300"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        <Zap size={12} className={orderType === "market" ? "text-yellow-500" : ""} />
        Market
      </button>
      <button
        onClick={() => onChange("limit")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
          orderType === "limit"
            ? darkMode
              ? "bg-zinc-700 text-white shadow-sm"
              : "bg-white text-zinc-900 shadow-sm"
            : darkMode
            ? "text-zinc-400 hover:text-zinc-300"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        <Target size={12} className={orderType === "limit" ? "text-blue-500" : ""} />
        Limit
      </button>
    </div>
  );
});

export default OrderTypeSelector;
