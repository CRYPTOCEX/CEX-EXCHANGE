"use client";

import { Symbol } from "@/store/trade/use-binary-store";
import { LineChart, Wallet, BarChart2, BookOpen, Trophy, Target, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

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
  tradingMode?: "demo" | "real";
  // New callbacks for footer buttons
  onAnalyticsClick?: () => void;
  onPatternLibraryClick?: () => void;
  onLeaderboardClick?: () => void;
  onChallengesClick?: () => void;
  onSettingsClick?: () => void;
  // Active states
  isAnalyticsOpen?: boolean;
  isPatternLibraryOpen?: boolean;
  isLeaderboardOpen?: boolean;
  isChallengesOpen?: boolean;
  isSettingsOpen?: boolean;
  completedTradesCount?: number;
}

export default function MobileNavigation({
  activePanel,
  setActivePanel,
  activePositionsCount,
  tradingMode = "demo",
  onAnalyticsClick,
  onPatternLibraryClick,
  onLeaderboardClick,
  onChallengesClick,
  onSettingsClick,
  isAnalyticsOpen = false,
  isPatternLibraryOpen = false,
  isLeaderboardOpen = false,
  isChallengesOpen = false,
  isSettingsOpen = false,
  completedTradesCount = 0,
}: MobileNavigationProps) {
  const t = useTranslations("common");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark during SSR
  const isDarkMode = mounted ? resolvedTheme === "dark" : true;

  // Base button styles
  const getButtonClass = (isActive: boolean) => `
    flex-1 relative flex flex-col items-center justify-center gap-0.5 transition-colors border-r last:border-r-0
    ${isActive
      ? isDarkMode
        ? "bg-zinc-900 text-white border-zinc-800"
        : "bg-zinc-100 text-zinc-900 border-zinc-200"
      : isDarkMode
        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border-zinc-800"
        : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-zinc-200"
    }
  `;

  return (
    <div className="w-full shrink-0">
      {/* Flat navigation bar - matching desktop design language */}
      <div
        className={`border-t ${
          isDarkMode
            ? "bg-black border-zinc-800"
            : "bg-white border-zinc-200"
        }`}
      >
        {/* Navigation buttons container */}
        <div className="flex h-12">
          {/* Chart Tab */}
          <button
            onClick={() => setActivePanel("chart")}
            className={getButtonClass(activePanel === "chart" && !isAnalyticsOpen && !isPatternLibraryOpen && !isLeaderboardOpen && !isChallengesOpen && !isSettingsOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${activePanel === "chart" && !isAnalyticsOpen && !isPatternLibraryOpen && !isLeaderboardOpen && !isChallengesOpen && !isSettingsOpen ? "bg-blue-500" : "bg-transparent"}`} />
            <LineChart size={16} />
            <span className="text-[9px] font-medium">{t("chart")}</span>
          </button>

          {/* Trade Tab */}
          <button
            onClick={() => setActivePanel("order")}
            className={getButtonClass(activePanel === "order" && !isAnalyticsOpen && !isPatternLibraryOpen && !isLeaderboardOpen && !isChallengesOpen && !isSettingsOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${activePanel === "order" && !isAnalyticsOpen && !isPatternLibraryOpen && !isLeaderboardOpen && !isChallengesOpen && !isSettingsOpen ? "bg-green-500" : "bg-transparent"}`} />
            {activePositionsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 bg-orange-500 text-[8px] font-bold text-white flex items-center justify-center">
                {activePositionsCount > 99 ? "99+" : activePositionsCount}
              </span>
            )}
            <Wallet size={16} />
            <span className="text-[9px] font-medium">{t("trade")}</span>
          </button>

          {/* Analytics Tab (replaces Positions) */}
          <button
            onClick={onAnalyticsClick}
            className={getButtonClass(isAnalyticsOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${isAnalyticsOpen ? "bg-blue-500" : "bg-transparent"}`} />
            {completedTradesCount > 0 && (
              <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 bg-blue-500 text-[8px] font-bold text-white flex items-center justify-center">
                {completedTradesCount > 99 ? "99+" : completedTradesCount}
              </span>
            )}
            <BarChart2 size={16} />
            <span className="text-[9px] font-medium">Analytics</span>
          </button>

          {/* Pattern Library Tab */}
          <button
            onClick={onPatternLibraryClick}
            className={getButtonClass(isPatternLibraryOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${isPatternLibraryOpen ? "bg-purple-500" : "bg-transparent"}`} />
            <BookOpen size={16} />
            <span className="text-[9px] font-medium">Patterns</span>
          </button>

          {/* Leaderboard Tab */}
          <button
            onClick={onLeaderboardClick}
            className={getButtonClass(isLeaderboardOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${isLeaderboardOpen ? "bg-amber-500" : "bg-transparent"}`} />
            <Trophy size={16} />
            <span className="text-[9px] font-medium">Leaders</span>
          </button>

          {/* Challenges Tab (only in demo mode) */}
          {tradingMode === "demo" && (
            <button
              onClick={onChallengesClick}
              className={getButtonClass(isChallengesOpen)}
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${isChallengesOpen ? "bg-green-500" : "bg-transparent"}`} />
              <Target size={16} />
              <span className="text-[9px] font-medium">Challenge</span>
            </button>
          )}

          {/* Settings Tab */}
          <button
            onClick={onSettingsClick}
            className={getButtonClass(isSettingsOpen)}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${isSettingsOpen ? "bg-purple-500" : "bg-transparent"}`} />
            <Settings size={16} />
            <span className="text-[9px] font-medium">Settings</span>
          </button>
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
}
