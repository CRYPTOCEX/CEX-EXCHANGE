"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import type { OrderSide } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface TradingButtonsProps {
  handlePlaceOrder: (side: OrderSide) => void;
  profitPercentage: number;
  disabled?: boolean;
  isMobile?: boolean;
  darkMode?: boolean;
}

export default function TradingButtons({
  handlePlaceOrder,
  profitPercentage,
  disabled = false,
  isMobile = false,
  darkMode = true,
}: TradingButtonsProps) {
  const t = useTranslations("binary/components/order/trading-buttons");
  return (
    <div
      className={`p-4 space-y-3 border-t ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}
    >
      <div className="flex gap-3">
        <button
          onClick={() => handlePlaceOrder("RISE")}
          disabled={disabled}
          className={`flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          <ArrowUp size={18} />
          <span>{t("RISE")}</span>
        </button>
        <button
          onClick={() => handlePlaceOrder("FALL")}
          disabled={disabled}
          className={`flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          <ArrowDown size={18} />
          <span>{t("FALL")}</span>
        </button>
      </div>
    </div>
  );
}
