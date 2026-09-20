"use client";

/**
 * Streak Indicator Component
 *
 * Shows current win/loss streak with visual indicators.
 *
 * The streak's intensity used to be a three-step hue ramp on top of a
 * flame/snowflake glyph that already said hot or cold, and the ramp ran in a
 * different hue family from the win/loss numbers right beside it. Intensity is
 * now carried by glyph size and the pulse, and the hue is the same tone the
 * rest of the analytics uses for money direction.
 */

import { memo } from "react";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Panel, PanelTitle, ToneDot, toneText, toneTint } from "./analytics-ui";

// ============================================================================
// TYPES
// ============================================================================

interface StreakIndicatorProps {
  currentStreak: number;
  isWinningStreak: boolean;
  longestWinStreak: number;
  longestLossStreak: number;
  /** @deprecated Tokens are theme-aware; kept so existing call sites compile. */
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
}: StreakIndicatorProps) {
  const t = useTranslations("binary_components");

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
  const streakTone = isWinningStreak ? "up" : "down";

  // Get streak icon. Size and the pulse carry intensity; the tone carries
  // direction, matching every other win/loss mark on the page.
  const getStreakIcon = () => {
    if (currentStreak === 0) return null;

    if (isWinningStreak) {
      const size = intensity === "hot" ? 28 : intensity === "warm" ? 24 : 20;
      return (
        <Flame
          size={size}
          className={`text-up ${intensity === "hot" ? "animate-pulse" : ""}`}
        />
      );
    } else {
      const size = intensity === "cold" ? 28 : intensity === "cool" ? 24 : 20;
      return (
        <Snowflake
          size={size}
          className={`text-down ${intensity === "cold" ? "animate-pulse" : ""}`}
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
    <Panel className="p-6">
      <PanelTitle className="mb-4">{t("trading_streaks")}</PanelTitle>

      {/* Current Streak */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Streak visual. The count keeps foreground ink — a tone on its own
              tint measures under 3:1 in light mode; the tint plus the glyph
              beside it carry the direction. */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              currentStreak === 0 ? "bg-surface-3" : toneTint[streakTone]
            }`}
          >
            {currentStreak === 0 ? (
              <span className="text-2xl font-bold text-muted-foreground">-</span>
            ) : (
              <span className="text-2xl font-bold text-foreground">
                {currentStreak}
              </span>
            )}
          </div>

          {/* Streak info */}
          <div>
            <div className="flex items-center gap-2">
              {getStreakIcon()}
              <span className="font-semibold text-foreground">
                {isWinningStreak ? t("winning_streak") : currentStreak > 0 ? t("losing_streak") : t("no_streak")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getStreakMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* Streak Records */}
      <div className="grid grid-cols-2 gap-4">
        {/* Longest Win Streak */}
        <div className="bg-surface-3 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-up" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("best_win_streak")}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${toneText.up}`}>
              {longestWinStreak}
            </span>
            <span className="text-sm text-muted-foreground">trades</span>
          </div>
          {longestWinStreak > 0 && currentStreak > 0 && isWinningStreak && (
            <div className="text-xs mt-2 text-muted-foreground">
              {currentStreak >= longestWinStreak
                ? t("new_record")
                : `${longestWinStreak - currentStreak} away from record`}
            </div>
          )}
        </div>

        {/* Longest Loss Streak */}
        <div className="bg-surface-3 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-down" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("worst_loss_streak")}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${toneText.down}`}>
              {longestLossStreak}
            </span>
            <span className="text-sm text-muted-foreground">trades</span>
          </div>
          {longestLossStreak > 0 && currentStreak > 0 && !isWinningStreak && (
            <div className="text-xs mt-2 text-muted-foreground">
              {currentStreak >= longestLossStreak
                ? t("at_worst_streak")
                : `${longestLossStreak - currentStreak} from worst`}
            </div>
          )}
        </div>
      </div>

      {/* Visual streak history */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: Math.min(currentStreak, 10) }).map((_, i) => (
              <ToneDot
                key={i}
                tone={streakTone}
                size={12}
                style={{
                  opacity: 1 - (i * 0.08),
                  animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite`,
                }}
              />
            ))}
            {currentStreak > 10 && (
              <span className="text-xs text-muted-foreground ml-2">
                +{currentStreak - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
});

export default StreakIndicator;
