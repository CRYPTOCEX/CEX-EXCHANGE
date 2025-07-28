"use client";

import { Symbol } from "@/store/trade/use-binary-store";
import { LineChart, Wallet, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

interface MobileNavigationProps {
  activePanel: "chart" | "order" | "positions";
  setActivePanel: (panel: "chart" | "order" | "positions") => void;
  activePositionsCount: number;
  currentPrice: number;
  symbol: Symbol;
  priceMovement?: {
    direction: "up" | "down" | "neutral";
    percent: number;
    strength: "strong" | "medium" | "weak";
  };
  balance: number;
}

export default function MobileNavigation({
  activePanel,
  setActivePanel,
  activePositionsCount,
  currentPrice,
  symbol,
  priceMovement,
  balance,
}: MobileNavigationProps) {
  const t = useTranslations("binary/components/navigation/mobile-navigation");
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <div className="w-full flex-shrink-0">
      {/* Glass-morphism effect background */}
      <div
        className={`relative backdrop-blur-md border-t pt-3 pb-safe-or-2 px-3 ${
          isDarkMode
            ? "bg-zinc-900/80 border-zinc-800"
            : "bg-white/80 border-zinc-200"
        }`}
      >
        {/* Navigation buttons */}
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActivePanel("chart")}
            className={`relative flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-200 ${
              activePanel === "chart"
                ? isDarkMode
                  ? "bg-zinc-800 text-white shadow-lg shadow-zinc-800/20"
                  : "bg-zinc-200 text-zinc-900 shadow-lg shadow-zinc-200/20"
                : isDarkMode
                  ? "text-zinc-400"
                  : "text-zinc-600"
            }`}
          >
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full ${
                activePanel === "chart" ? "bg-blue-500" : "bg-transparent"
              }`}
            ></div>
            <LineChart
              size={20}
              className={`transition-transform duration-200 ${activePanel === "chart" ? "scale-110" : ""}`}
            />
            <span className="text-xs mt-1 font-medium">{t("Chart")}</span>
          </button>

          <button
            onClick={() => setActivePanel("order")}
            className={`relative flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-200 ${
              activePanel === "order"
                ? isDarkMode
                  ? "bg-zinc-800 text-white shadow-lg shadow-zinc-800/20"
                  : "bg-zinc-200 text-zinc-900 shadow-lg shadow-zinc-200/20"
                : isDarkMode
                  ? "text-zinc-400"
                  : "text-zinc-600"
            }`}
          >
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full ${
                activePanel === "order" ? "bg-green-500" : "bg-transparent"
              }`}
            ></div>
            <Wallet
              size={20}
              className={`transition-transform duration-200 ${activePanel === "order" ? "scale-110" : ""}`}
            />
            <span className="text-xs mt-1 font-medium">{t("Trade")}</span>
          </button>

          <button
            onClick={() => setActivePanel("positions")}
            className={`relative flex flex-col items-center px-4 py-2 rounded-lg transition-all duration-200 ${
              activePanel === "positions"
                ? isDarkMode
                  ? "bg-zinc-800 text-white shadow-lg shadow-zinc-800/20"
                  : "bg-zinc-200 text-zinc-900 shadow-lg shadow-zinc-200/20"
                : isDarkMode
                  ? "text-zinc-400"
                  : "text-zinc-600"
            }`}
          >
            <div
              className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 rounded-full ${
                activePanel === "positions" ? "bg-orange-500" : "bg-transparent"
              }`}
            ></div>
            {activePositionsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-[10px] flex items-center justify-center animate-pulse">
                {activePositionsCount}
              </span>
            )}
            <BarChart3
              size={20}
              className={`transition-transform duration-200 ${activePanel === "positions" ? "scale-110" : ""}`}
            />
            <span className="text-xs mt-1 font-medium">{t("Positions")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
