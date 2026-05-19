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
  const tCommon = useTranslations("common");
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div className="flex h-12">
        <button
          onClick={onRiseClick}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 font-semibold text-sm transition-colors border-r border-emerald-700"
        >
          <ArrowUp size={18} />
          <span>{tCommon("rise")}</span>
        </button>
        <button
          onClick={onFallClick}
          className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white flex items-center justify-center gap-2 font-semibold text-sm transition-colors"
        >
          <ArrowDown size={18} />
          <span>{tCommon("fall")}</span>
        </button>
      </div>
    </div>
  );
}
