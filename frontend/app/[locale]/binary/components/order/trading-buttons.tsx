"use client";

import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import type { OrderSide } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface TradingButtonsProps {
  handlePlaceOrder: (side: OrderSide) => void;
  profitPercentage: number;
  disabled?: boolean;
  isMobile?: boolean;
  darkMode?: boolean;
  oneClickEnabled?: boolean;
}

export default function TradingButtons({
  handlePlaceOrder,
  profitPercentage,
  disabled = false,
  isMobile = false,
  darkMode = true,
  oneClickEnabled = false,
}: TradingButtonsProps) {
  const tCommon = useTranslations("common");

  // Mobile uses same rounded gradient design as desktop
  if (isMobile) {
    return (
      <div className={`p-2 border-t ${darkMode ? 'border-zinc-800/50 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex gap-2">
          {/* Rise Button - rounded gradient design */}
          <button
            onClick={() => handlePlaceOrder("RISE")}
            disabled={disabled}
            className={`
              flex-1 relative overflow-hidden group cursor-pointer
              ${oneClickEnabled
                ? "bg-gradient-to-br from-emerald-500 via-emerald-400 to-yellow-500 ring-2 ring-yellow-400/50"
                : "bg-gradient-to-br from-emerald-500 to-green-500"
              }
              hover:from-emerald-400 hover:to-green-400
              text-white py-2.5 px-3 rounded-lg
              flex items-center justify-center gap-2 font-bold text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30
              active:scale-[0.97]
            `}
          >
            {oneClickEnabled && <Zap size={14} className="text-yellow-300" />}
            <ArrowUpRight size={16} />
            <span>{tCommon("rise")}</span>
            <span className="text-[11px] font-medium opacity-80">+{profitPercentage}%</span>
          </button>

          {/* Fall Button - rounded gradient design */}
          <button
            onClick={() => handlePlaceOrder("FALL")}
            disabled={disabled}
            className={`
              flex-1 relative overflow-hidden group cursor-pointer
              ${oneClickEnabled
                ? "bg-gradient-to-br from-rose-500 via-rose-400 to-yellow-500 ring-2 ring-yellow-400/50"
                : "bg-gradient-to-br from-rose-500 to-red-500"
              }
              hover:from-rose-400 hover:to-red-400
              text-white py-2.5 px-3 rounded-lg
              flex items-center justify-center gap-2 font-bold text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-md shadow-red-500/20 hover:shadow-red-500/30
              active:scale-[0.97]
            `}
          >
            {oneClickEnabled && <Zap size={14} className="text-yellow-300" />}
            <ArrowDownRight size={16} />
            <span>{tCommon("fall")}</span>
            <span className="text-[11px] font-medium opacity-80">+{profitPercentage}%</span>
          </button>
        </div>

      </div>
    );
  }

  // Desktop uses rounded gradient design
  return (
    <div className="p-2 border-t border-gray-200 dark:border-zinc-800/50 bg-gray-50 dark:bg-zinc-900/50">
      {/* Trading buttons */}
      <div className="flex gap-2">
        {/* Rise Button */}
        <button
          onClick={() => handlePlaceOrder("RISE")}
          disabled={disabled}
          className={`
            flex-1 relative overflow-hidden group cursor-pointer
            ${oneClickEnabled
              ? "bg-gradient-to-br from-emerald-500 via-emerald-400 to-yellow-500 ring-2 ring-yellow-400/50"
              : "bg-gradient-to-br from-emerald-500 to-green-500"
            }
            hover:from-emerald-400 hover:to-green-400
            text-white py-2.5 px-3 rounded-lg
            flex items-center justify-center gap-2 font-bold text-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30
            active:scale-[0.97]
          `}
        >
          {oneClickEnabled && <Zap size={14} className="text-yellow-300" />}
          <ArrowUpRight size={16} />
          <span>{tCommon("rise")}</span>
          <span className="text-[11px] font-medium opacity-80">+{profitPercentage}%</span>
        </button>

        {/* Fall Button */}
        <button
          onClick={() => handlePlaceOrder("FALL")}
          disabled={disabled}
          className={`
            flex-1 relative overflow-hidden group cursor-pointer
            ${oneClickEnabled
              ? "bg-gradient-to-br from-rose-500 via-rose-400 to-yellow-500 ring-2 ring-yellow-400/50"
              : "bg-gradient-to-br from-rose-500 to-red-500"
            }
            hover:from-rose-400 hover:to-red-400
            text-white py-2.5 px-3 rounded-lg
            flex items-center justify-center gap-2 font-bold text-sm
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-md shadow-red-500/20 hover:shadow-red-500/30
            active:scale-[0.97]
          `}
        >
          {oneClickEnabled && <Zap size={14} className="text-yellow-300" />}
          <ArrowDownRight size={16} />
          <span>{tCommon("fall")}</span>
          <span className="text-[11px] font-medium opacity-80">+{profitPercentage}%</span>
        </button>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="flex items-center justify-center gap-3 mt-1.5 text-gray-400 dark:text-zinc-600">
        <div className="flex items-center gap-1">
          <kbd className="text-[9px] px-1 py-0.5 rounded font-mono bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500">C</kbd>
          <span className="text-[9px]">Rise</span>
        </div>
        <div className="w-px h-2.5 bg-gray-300 dark:bg-zinc-800" />
        <div className="flex items-center gap-1">
          <kbd className="text-[9px] px-1 py-0.5 rounded font-mono bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500">P</kbd>
          <span className="text-[9px]">Fall</span>
        </div>
      </div>
    </div>
  );
}
