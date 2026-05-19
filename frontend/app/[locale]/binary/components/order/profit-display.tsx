"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfitDisplayProps {
  profitPercentage: number;
  profitAmount: number;
  amount: number;
  symbol: string;
  darkMode?: boolean;
}

export default function ProfitDisplay({
  profitPercentage,
  profitAmount,
  amount,
  symbol,
  darkMode = true,
}: ProfitDisplayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");

  const getCurrency = (symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT";
  };

  const currency = getCurrency(symbol);

  return (
    <div className={`rounded-lg overflow-hidden ${
      darkMode
        ? "bg-zinc-900/80 border border-zinc-800/60"
        : "bg-gray-50 border border-gray-200"
    }`}>
      {/* Profit row */}
      <div className={`px-2.5 py-2 ${
        darkMode ? "bg-emerald-500/5" : "bg-emerald-50/50"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className={`text-[10px] font-medium uppercase ${
              darkMode ? "text-zinc-400" : "text-gray-500"
            }`}>
              {t("potential")} {tCommon("profit")}
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            +{profitPercentage}%
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Win</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-emerald-500">+{profitAmount.toFixed(2)}</span>
            <span className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>{currency}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`h-1 rounded-full overflow-hidden mt-1.5 ${darkMode ? "bg-zinc-800" : "bg-gray-200"}`}>
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
            style={{ width: `${Math.min(profitPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Loss row */}
      <div className={`px-2.5 py-1.5 flex items-center justify-between border-t ${
        darkMode ? "border-zinc-800/50" : "border-gray-200"
      }`}>
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} className={darkMode ? "text-zinc-500" : "text-gray-400"} />
          <span className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>{tCommon("loss")}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className={`text-base font-semibold ${darkMode ? "text-zinc-400" : "text-gray-600"}`}>
            -{amount.toFixed(2)}
          </span>
          <span className={`text-[10px] ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>{currency}</span>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className={`px-2.5 py-1.5 flex items-center justify-between border-t ${
        darkMode ? "border-zinc-800/30 bg-zinc-900/50" : "border-gray-100 bg-gray-50/50"
      }`}>
        <span className={`text-[9px] uppercase tracking-wide ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
          {t("risk_reward")}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <div className={`w-3 h-1 rounded-full ${darkMode ? "bg-red-500/30" : "bg-red-100"}`} />
            <div className="w-4 h-1 rounded-full bg-emerald-500" />
          </div>
          <span className={`text-[10px] font-medium ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
            1:{(profitPercentage / 100).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
