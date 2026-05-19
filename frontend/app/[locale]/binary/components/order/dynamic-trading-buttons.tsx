"use client";

/**
 * Dynamic Trading Buttons Component
 *
 * Displays trading buttons that adapt to the selected binary order type.
 * Each type has different sides (RISE/FALL, HIGHER/LOWER, etc.)
 */

import { Zap } from "lucide-react";
import type {
  BinaryOrderType,
  OrderSide,
  OrderSideMap,
} from "@/types/binary-trading";
import { ORDER_TYPE_CONFIGS } from "@/types/binary-trading";
import { useTranslations } from "next-intl";
import {
  RiseIcon,
  FallIcon,
  HigherIcon,
  LowerIcon,
  TouchIcon,
  NoTouchIcon,
  CallIcon,
  PutIcon,
  TurboUpIcon,
  TurboDownIcon,
} from "./order-type-icons";

// ============================================================================
// TYPES
// ============================================================================

interface DynamicTradingButtonsProps {
  orderType: BinaryOrderType;
  handlePlaceOrder: (side: OrderSide) => void | Promise<void>;
  profitPercentage: number;
  disabled?: boolean;
  isMobile?: boolean;
  darkMode?: boolean;
  oneClickEnabled?: boolean;
  isLoading?: boolean;
}

// ============================================================================
// BUTTON CONFIGURATION
// ============================================================================

type ButtonConfig = {
  side: OrderSide;
  label: string;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  shadow: string;
  hoverFrom: string;
  hoverTo: string;
};

const BUTTON_CONFIGS: Record<BinaryOrderType, [ButtonConfig, ButtonConfig]> = {
  RISE_FALL: [
    {
      side: "RISE",
      label: "Rise",
      icon: RiseIcon,
      gradientFrom: "from-emerald-500",
      gradientTo: "to-green-500",
      shadow: "shadow-emerald-500/20",
      hoverFrom: "hover:from-emerald-400",
      hoverTo: "hover:to-green-400",
    },
    {
      side: "FALL",
      label: "Fall",
      icon: FallIcon,
      gradientFrom: "from-rose-500",
      gradientTo: "to-red-500",
      shadow: "shadow-red-500/20",
      hoverFrom: "hover:from-rose-400",
      hoverTo: "hover:to-red-400",
    },
  ],
  HIGHER_LOWER: [
    {
      side: "HIGHER",
      label: "Higher",
      icon: HigherIcon,
      gradientFrom: "from-blue-500",
      gradientTo: "to-cyan-500",
      shadow: "shadow-blue-500/20",
      hoverFrom: "hover:from-blue-400",
      hoverTo: "hover:to-cyan-400",
    },
    {
      side: "LOWER",
      label: "Lower",
      icon: LowerIcon,
      gradientFrom: "from-purple-500",
      gradientTo: "to-pink-500",
      shadow: "shadow-purple-500/20",
      hoverFrom: "hover:from-purple-400",
      hoverTo: "hover:to-pink-400",
    },
  ],
  TOUCH_NO_TOUCH: [
    {
      side: "TOUCH",
      label: "Touch",
      icon: TouchIcon,
      gradientFrom: "from-amber-500",
      gradientTo: "to-orange-500",
      shadow: "shadow-amber-500/20",
      hoverFrom: "hover:from-amber-400",
      hoverTo: "hover:to-orange-400",
    },
    {
      side: "NO_TOUCH",
      label: "No Touch",
      icon: NoTouchIcon,
      gradientFrom: "from-slate-600",
      gradientTo: "to-slate-500",
      shadow: "shadow-slate-500/20",
      hoverFrom: "hover:from-slate-500",
      hoverTo: "hover:to-slate-400",
    },
  ],
  CALL_PUT: [
    {
      side: "CALL",
      label: "Call",
      icon: CallIcon,
      gradientFrom: "from-teal-500",
      gradientTo: "to-emerald-500",
      shadow: "shadow-teal-500/20",
      hoverFrom: "hover:from-teal-400",
      hoverTo: "hover:to-emerald-400",
    },
    {
      side: "PUT",
      label: "Put",
      icon: PutIcon,
      gradientFrom: "from-rose-500",
      gradientTo: "to-pink-500",
      shadow: "shadow-rose-500/20",
      hoverFrom: "hover:from-rose-400",
      hoverTo: "hover:to-pink-400",
    },
  ],
  TURBO: [
    {
      side: "UP",
      label: "Up",
      icon: TurboUpIcon,
      gradientFrom: "from-yellow-500",
      gradientTo: "to-orange-500",
      shadow: "shadow-yellow-500/20",
      hoverFrom: "hover:from-yellow-400",
      hoverTo: "hover:to-orange-400",
    },
    {
      side: "DOWN",
      label: "Down",
      icon: TurboDownIcon,
      gradientFrom: "from-violet-500",
      gradientTo: "to-purple-500",
      shadow: "shadow-violet-500/20",
      hoverFrom: "hover:from-violet-400",
      hoverTo: "hover:to-purple-400",
    },
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function DynamicTradingButtons({
  orderType,
  handlePlaceOrder,
  profitPercentage,
  disabled = false,
  isMobile = false,
  darkMode = true,
  oneClickEnabled = false,
  isLoading = false,
}: DynamicTradingButtonsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [button1, button2] = BUTTON_CONFIGS[orderType];

  const renderButton = (config: ButtonConfig) => {
    const Icon = config.icon;
    // Check if label is long (like "No Touch") to adjust styling
    const isLongLabel = config.label.length > 6;

    return (
      <button
        key={config.side}
        onClick={() => handlePlaceOrder(config.side)}
        disabled={disabled || isLoading}
        className={`
          flex-1 relative overflow-hidden group cursor-pointer
          ${
            oneClickEnabled
              ? `bg-gradient-to-br ${config.gradientFrom} via-yellow-400 to-yellow-500 ring-2 ring-yellow-400/50`
              : `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`
          }
          ${config.hoverFrom} ${config.hoverTo}
          text-white ${isMobile ? "py-2.5" : "py-3"} px-2 rounded-lg
          flex items-center justify-center gap-1.5 font-bold ${
            isMobile ? "text-sm" : isLongLabel ? "text-sm" : "text-base"
          }
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200
          shadow-md ${config.shadow} hover:shadow-lg
          active:scale-[0.97]
        `}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>{t("placing_ellipsis")}</span>
          </>
        ) : (
          <>
            {oneClickEnabled && <Zap size={14} className="text-yellow-200" />}
            <Icon size={isMobile ? 14 : 16} />
            <span className={isLongLabel ? "text-sm" : ""}>{config.label}</span>
            <span className="text-[10px] font-medium opacity-80">
              +{profitPercentage}%
            </span>
          </>
        )}
      </button>
    );
  };

  // Container styling
  const containerClass = `p-2 border-t ${
    darkMode
      ? "border-zinc-800/50 bg-zinc-900/50"
      : "border-gray-200 bg-gray-50"
  }`;

  return (
    <div className={containerClass}>
      <div className="flex gap-2">
        {renderButton(button1)}
        {renderButton(button2)}
      </div>
    </div>
  );
}
