"use client";

/**
 * Streak Indicator Component
 *
 * Shows current win/loss streak with visual indicators.
 */

import { memo } from "react";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface StreakIndicatorProps {
  currentStreak: number;
  isWinningStreak: boolean;
  longestWinStreak: number;
  longestLossStreak: number;
  theme?: "dark" | "light";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const StreakIndicator = memo(function StreakIndicator({
  currentStreak,
  isWinningStreak,
  longestWinStreak,
  longestLossStreak,
  theme = "dark",
}: StreakIndicatorProps) {
  const t = useTranslations("binary_components");
  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const cardBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  // Determine streak intensity
  const getStreakIntensity = (streak: number, isWin: boolean) => {
    if (streak === 0) return "neutral";
    if (isWin) {
      if (streak >= 5) return "hot";
      if (streak >= 3) return "warm";
      return "mild";
    } else {
      if (streak >= 5) return "cold";
      if (streak >= 3) return "cool";
      return "slight";
    }
  };

  const intensity = getStreakIntensity(currentStreak, isWinningStreak);

  // Get streak icon and color
  const getStreakIcon = () => {
    if (currentStreak === 0) return null;

    if (isWinningStreak) {
      const size = intensity === "hot" ? 28 : intensity === "warm" ? 24 : 20;
      return (
        <Flame
          size={size}
          className={`${
            intensity === "hot"
              ? "text-orange-500 animate-pulse"
              : intensity === "warm"
                ? "text-orange-400"
                : "text-orange-300"
          }`}
        />
      );
    } else {
      const size = intensity === "cold" ? 28 : intensity === "cool" ? 24 : 20;
      return (
        <Snowflake
          size={size}
          className={`${
            intensity === "cold"
              ? "text-blue-500 animate-pulse"
              : intensity === "cool"
                ? "text-blue-400"
                : "text-blue-300"
          }`}
        />
      );
    }
  };

  // Get streak message
  const getStreakMessage = () => {
    if (currentStreak === 0) return "No active streak";

    if (isWinningStreak) {
      if (currentStreak >= 5) return "On fire! Keep it going! 🔥";
      if (currentStreak >= 3) return "Nice winning streak!";
      return `${currentStreak} win streak`;
    } else {
      if (currentStreak >= 5) return "Consider taking a break 🧊";
      if (currentStreak >= 3) return "Stay calm, review your strategy";
      return `${currentStreak} loss streak`;
    }
  };

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
      <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide mb-4`}>
        {t("trading_streaks")}
      </h3>

      {/* Current Streak */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Streak visual */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              currentStreak === 0
                ? cardBgClass
                : isWinningStreak
                  ? "bg-green-500/20"
                  : "bg-red-500/20"
            }`}
          >
            {currentStreak === 0 ? (
              <span className={`text-2xl font-bold ${subtitleClass}`}>-</span>
            ) : (
              <span
                className={`text-2xl font-bold ${
                  isWinningStreak ? "text-green-500" : "text-red-500"
                }`}
              >
                {currentStreak}
              </span>
            )}
          </div>

          {/* Streak info */}
          <div>
            <div className="flex items-center gap-2">
              {getStreakIcon()}
              <span className={`font-semibold ${textClass}`}>
                {isWinningStreak ? "Winning Streak" : currentStreak > 0 ? "Losing Streak" : "No Streak"}
              </span>
            </div>
            <p className={`text-sm ${subtitleClass} mt-1`}>
              {getStreakMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* Streak Records */}
      <div className="grid grid-cols-2 gap-4">
        {/* Longest Win Streak */}
        <div className={`${cardBgClass} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-500" />
            <span className={`text-xs ${subtitleClass} uppercase tracking-wide`}>
              {t("best_win_streak")}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold text-green-500`}>
              {longestWinStreak}
            </span>
            <span className={`text-sm ${subtitleClass}`}>trades</span>
          </div>
          {longestWinStreak > 0 && currentStreak > 0 && isWinningStreak && (
            <div className={`text-xs mt-2 ${
              currentStreak >= longestWinStreak ? "text-green-500" : subtitleClass
            }`}>
              {currentStreak >= longestWinStreak
                ? "New record!"
                : `${longestWinStreak - currentStreak} away from record`}
            </div>
          )}
        </div>

        {/* Longest Loss Streak */}
        <div className={`${cardBgClass} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-500" />
            <span className={`text-xs ${subtitleClass} uppercase tracking-wide`}>
              {t("worst_loss_streak")}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold text-red-500`}>
              {longestLossStreak}
            </span>
            <span className={`text-sm ${subtitleClass}`}>trades</span>
          </div>
          {longestLossStreak > 0 && currentStreak > 0 && !isWinningStreak && (
            <div className={`text-xs mt-2 ${
              currentStreak >= longestLossStreak ? "text-red-500" : subtitleClass
            }`}>
              {currentStreak >= longestLossStreak
                ? "At worst streak!"
                : `${longestLossStreak - currentStreak} from worst`}
            </div>
          )}
        </div>
      </div>

      {/* Visual streak history (placeholder for dots) */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: Math.min(currentStreak, 10) }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  isWinningStreak ? "bg-green-500" : "bg-red-500"
                }`}
                style={{
                  opacity: 1 - (i * 0.08),
                  animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite`,
                }}
              />
            ))}
            {currentStreak > 10 && (
              <span className={`text-xs ${subtitleClass} ml-2`}>
                +{currentStreak - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default StreakIndicator;
