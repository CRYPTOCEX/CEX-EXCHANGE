"use client";

/**
 * Trade Cooldown Component
 *
 * Prevents revenge trading by enforcing a cooldown after consecutive losses.
 */

import { memo, useState, useEffect, useCallback } from "react";
import {
  Timer,
  AlertTriangle,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
} from "lucide-react";
import type { CooldownSettings } from "./risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface TradeCooldownProps {
  settings: CooldownSettings;
  onChange: (settings: Partial<CooldownSettings>) => void;
  onOverride: () => void;
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TradeCooldown = memo(function TradeCooldown({
  settings,
  onChange,
  onOverride,
  theme = "dark",
  compact = false,
  alwaysExpanded = false,
}: TradeCooldownProps) {
  const t = useTranslations("binary_components");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  // Update countdown timer
  useEffect(() => {
    if (!settings.isInCooldown || !settings.cooldownEndsAt) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, settings.cooldownEndsAt! - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        onChange({ isInCooldown: false, cooldownEndsAt: undefined });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [settings.isInCooldown, settings.cooldownEndsAt, onChange]);

  // Handle override
  const handleOverride = useCallback(() => {
    if (!showOverrideWarning) {
      setShowOverrideWarning(true);
      return;
    }
    onOverride();
    setShowOverrideWarning(false);
  }, [showOverrideWarning, onOverride]);

  // Calculate progress
  const progress = settings.isInCooldown && settings.cooldownEndsAt
    ? Math.max(0, 1 - timeRemaining / (settings.cooldownMinutes * 60 * 1000))
    : 0;

  // Streak indicator
  const streakLevel = Math.min(settings.consecutiveLosses, settings.triggerAfterLosses);
  const streakProgress = settings.triggerAfterLosses > 0
    ? (streakLevel / settings.triggerAfterLosses) * 100
    : 0;

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return (
      <div className="space-y-4">
        {/* Active cooldown display */}
        {settings.isInCooldown && (
          <div
            className={`p-4 rounded-lg ${
              theme === "dark"
                ? "bg-amber-500/10 border border-amber-500/20"
                : "bg-amber-50 border border-amber-100"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pause size={16} className="text-amber-500" />
                <span className={`text-sm font-medium ${textClass}`}>
                  {t("trading_paused")}
                </span>
              </div>
              <span className="text-2xl font-mono font-bold text-amber-500">
                {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className={`h-2 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Override option */}
            {settings.allowOverride && (
              <div className="mt-3">
                {showOverrideWarning ? (
                  <div
                    className={`p-2 rounded-lg ${
                      theme === "dark" ? "bg-red-500/10" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className={`text-xs ${textClass}`}>
                        {t("are_you_sure_cooldowns_help_prevent")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleOverride}
                        className="flex-1 py-1.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600"
                      >
                        {t("override_anyway")}
                      </button>
                      <button
                        onClick={() => setShowOverrideWarning(false)}
                        className={`flex-1 py-1.5 rounded text-xs ${
                          theme === "dark"
                            ? "bg-zinc-800 text-zinc-300"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {t("keep_cooldown")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleOverride}
                    className={`w-full py-2 rounded-lg text-xs font-medium ${
                      theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <Play size={12} className="inline mr-1" />
                    Resume Trading (Not Recommended)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loss streak indicator */}
        {settings.enabled && !settings.isInCooldown && (
          <div
            className={`p-3 rounded-lg ${
              streakProgress >= 66
                ? "bg-amber-500/10 border border-amber-500/20"
                : theme === "dark"
                ? "bg-zinc-800/50"
                : "bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame
                  size={14}
                  className={
                    streakProgress >= 66 ? "text-red-500" : subtitleClass
                  }
                />
                <span className={`text-xs ${subtitleClass}`}>
                  {t("consecutive_losses")}
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${
                  streakProgress >= 66 ? "text-red-500" : textClass
                }`}
              >
                {settings.consecutiveLosses} / {settings.triggerAfterLosses}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: settings.triggerAfterLosses }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i < settings.consecutiveLosses
                      ? "bg-red-500"
                      : theme === "dark"
                      ? "bg-zinc-700"
                      : "bg-zinc-300"
                  }`}
                />
              ))}
            </div>
            {streakProgress >= 66 && (
              <div className={`text-[10px] mt-2 text-amber-500`}>
                {settings.triggerAfterLosses - settings.consecutiveLosses} {t("more_loss_es_will_trigger_cooldown")}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-3">
          {/* Trigger after losses */}
          <div>
            <label
              className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
            >
              {t("trigger_after_losses")}
            </label>
            <div className="flex gap-2 mt-1">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => onChange({ triggerAfterLosses: num })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    settings.triggerAfterLosses === num
                      ? "bg-red-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {num} losses
                </button>
              ))}
            </div>
          </div>

          {/* Cooldown duration */}
          <div>
            <label
              className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
            >
              {t("cooldown_duration")}
            </label>
            <div className="flex gap-2 mt-1">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onChange({ cooldownMinutes: mins })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    settings.cooldownMinutes === mins
                      ? "bg-amber-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Allow override toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className={subtitleClass} />
              <span className={`text-xs ${textClass}`}>{t("allow_override")}</span>
            </div>
            <button
              onClick={() => onChange({ allowOverride: !settings.allowOverride })}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                settings.allowOverride ? "bg-emerald-500" : inputBgClass
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                  settings.allowOverride ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Info */}
        <div
          className={`flex items-start gap-2 p-2 rounded-lg ${
            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Shield size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {t("cooldowns_prevent_revenge_trading") + ' ' + t("take_break_to_analyze_and_reset")}
          </span>
        </div>
      </div>
    );
  }

  // Compact view when in cooldown
  if (compact && !isExpanded && settings.isInCooldown) {
    return (
      <div
        className={`p-3 rounded-lg ${
          theme === "dark"
            ? "bg-amber-500/10 border border-amber-500/30"
            : "bg-amber-50 border border-amber-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-amber-500" />
            <span className={`text-sm font-medium ${textClass}`}>
              {t("cooldown_active")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-amber-500">
              {formatTime(timeRemaining)}
            </span>
            <button
              onClick={() => setIsExpanded(true)}
              className={`p-1 rounded ${
                theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
              }`}
            >
              <ChevronDown size={14} className={subtitleClass} />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div
          className={`h-1 rounded-full mt-2 overflow-hidden ${
            theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"
          }`}
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // Compact view when not in cooldown
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
          settings.enabled && streakProgress >= 66
            ? "bg-amber-500/10 border border-amber-500/30"
            : theme === "dark"
            ? "bg-zinc-900/50 border border-zinc-800/50"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Timer
            size={14}
            className={settings.enabled ? "text-amber-500" : subtitleClass}
          />
          <span className={`text-xs font-medium ${textClass}`}>
            {t("trade_cooldown")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {settings.enabled && (
            <div className="flex items-center gap-1">
              {Array.from({ length: settings.triggerAfterLosses }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < settings.consecutiveLosses
                      ? "bg-red-500"
                      : theme === "dark"
                      ? "bg-zinc-700"
                      : "bg-zinc-300"
                  }`}
                />
              ))}
            </div>
          )}
          <ChevronDown size={14} className={subtitleClass} />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`${bgClass} border ${
        settings.isInCooldown ? "border-amber-500/30" : borderClass
      } rounded-lg overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Timer
            size={16}
            className={settings.isInCooldown ? "text-amber-500" : "text-blue-500"}
          />
          <span className={`text-sm font-medium ${textClass}`}>
            {t("trade_cooldown")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => onChange({ enabled: !settings.enabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.enabled ? "bg-amber-500" : inputBgClass
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                settings.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className={`p-1 rounded ${
                theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
              }`}
            >
              <ChevronUp size={14} className={subtitleClass} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Active cooldown display */}
        {settings.isInCooldown && (
          <div
            className={`p-4 rounded-lg ${
              theme === "dark"
                ? "bg-amber-500/10 border border-amber-500/20"
                : "bg-amber-50 border border-amber-100"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pause size={16} className="text-amber-500" />
                <span className={`text-sm font-medium ${textClass}`}>
                  {t("trading_paused")}
                </span>
              </div>
              <span className="text-2xl font-mono font-bold text-amber-500">
                {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className={`h-2 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Override option */}
            {settings.allowOverride && (
              <div className="mt-3">
                {showOverrideWarning ? (
                  <div
                    className={`p-2 rounded-lg ${
                      theme === "dark" ? "bg-red-500/10" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className={`text-xs ${textClass}`}>
                        {t("are_you_sure_cooldowns_help_prevent")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleOverride}
                        className="flex-1 py-1.5 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600"
                      >
                        {t("override_anyway")}
                      </button>
                      <button
                        onClick={() => setShowOverrideWarning(false)}
                        className={`flex-1 py-1.5 rounded text-xs ${
                          theme === "dark"
                            ? "bg-zinc-800 text-zinc-300"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {t("keep_cooldown")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleOverride}
                    className={`w-full py-2 rounded-lg text-xs font-medium ${
                      theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <Play size={12} className="inline mr-1" />
                    Resume Trading (Not Recommended)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loss streak indicator */}
        {settings.enabled && !settings.isInCooldown && (
          <div
            className={`p-3 rounded-lg ${
              streakProgress >= 66
                ? "bg-amber-500/10 border border-amber-500/20"
                : theme === "dark"
                ? "bg-zinc-800/50"
                : "bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame
                  size={14}
                  className={
                    streakProgress >= 66 ? "text-red-500" : subtitleClass
                  }
                />
                <span className={`text-xs ${subtitleClass}`}>
                  {t("consecutive_losses")}
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${
                  streakProgress >= 66 ? "text-red-500" : textClass
                }`}
              >
                {settings.consecutiveLosses} / {settings.triggerAfterLosses}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: settings.triggerAfterLosses }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i < settings.consecutiveLosses
                      ? "bg-red-500"
                      : theme === "dark"
                      ? "bg-zinc-700"
                      : "bg-zinc-300"
                  }`}
                />
              ))}
            </div>
            {streakProgress >= 66 && (
              <div className={`text-[10px] mt-2 text-amber-500`}>
                {settings.triggerAfterLosses - settings.consecutiveLosses} {t("more_loss_es_will_trigger_cooldown")}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="space-y-3">
          {/* Trigger after losses */}
          <div>
            <label
              className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
            >
              {t("trigger_after_losses")}
            </label>
            <div className="flex gap-2 mt-1">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => onChange({ triggerAfterLosses: num })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    settings.triggerAfterLosses === num
                      ? "bg-red-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {num} losses
                </button>
              ))}
            </div>
          </div>

          {/* Cooldown duration */}
          <div>
            <label
              className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
            >
              {t("cooldown_duration")}
            </label>
            <div className="flex gap-2 mt-1">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onChange({ cooldownMinutes: mins })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    settings.cooldownMinutes === mins
                      ? "bg-amber-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Allow override toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className={subtitleClass} />
              <span className={`text-xs ${textClass}`}>{t("allow_override")}</span>
            </div>
            <button
              onClick={() => onChange({ allowOverride: !settings.allowOverride })}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                settings.allowOverride ? "bg-emerald-500" : inputBgClass
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                  settings.allowOverride ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Info */}
        <div
          className={`flex items-start gap-2 p-2 rounded-lg ${
            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Shield size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {t("cooldowns_prevent_revenge_trading") + ' ' + t("take_break_to_analyze_and_reset")}
          </span>
        </div>
      </div>
    </div>
  );
});

export default TradeCooldown;
