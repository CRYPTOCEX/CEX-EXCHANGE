"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface QuickTradeButtonsProps {
  onRiseClick: () => void;
  onFallClick: () => void;
}

export default function QuickTradeButtons({
  onRiseClick,
  onFallClick,
}: QuickTradeButtonsProps) {
  const t = useTranslations("binary/components/trading/quick-trade-buttons");
  return (
    <div className="absolute bottom-4 left-0 right-0 px-4 z-40">
      <div className="flex gap-3">
        <button
          onClick={onRiseClick}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUp size={18} />
          <span>{t("RISE")}</span>
        </button>
        <button
          onClick={onFallClick}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-md flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDown size={18} />
          <span>{t("FALL")}</span>
        </button>
      </div>
    </div>
  );
}
