"use client";

/**
 * Daily Loss Limit Settings Component
 *
 * Configure and monitor daily trading loss limits.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import type { DailyLimitSettings } from "./risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface DailyLimitSettingsProps {
  settings: DailyLimitSettings;
  balance: number;
  onChange: (settings: Partial<DailyLimitSettings>) => void;
  onOverride: (durationMinutes: number) => void;
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD", "BTC")
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DailyLimitSettingsComponent = memo(function DailyLimitSettingsComponent({
  settings,
  balance,
  onChange,
  onOverride,
  theme = "dark",
  compact = false,
  alwaysExpanded = false,
  currency = "USDT",
}: DailyLimitSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  // Calculate current status
  const status = useMemo(() => {
    const maxLoss =
      settings.maxDailyLossType === "percentage"
        ? (balance * settings.maxDailyLoss) / 100
        : settings.maxDailyLoss;

    const currentLoss = Math.abs(Math.min(0, settings.currentDailyPL));
    const usagePercent = maxLoss > 0 ? (currentLoss / maxLoss) * 100 : 0;
    const remaining = Math.max(0, maxLoss - currentLoss);

    let statusColor = "text-emerald-500";
    let statusBg = "bg-emerald-500";
    if (usagePercent >= 100) {
      statusColor = "text-red-500";
      statusBg = "bg-red-500";
    } else if (usagePercent >= settings.warningThreshold) {
      statusColor = "text-amber-500";
      statusBg = "bg-amber-500";
    }

    return {
      maxLoss,
      currentLoss,
      usagePercent: Math.min(100, usagePercent),
      remaining,
      statusColor,
      statusBg,
      isWarning: usagePercent >= settings.warningThreshold,
      isReached: usagePercent >= 100,
    };
  }, [settings, balance]);

  // Handle override
  const handleOverride = useCallback(
    (minutes: number) => {
      onOverride(minutes);
      setShowOverrideConfirm(false);
    },
    [onOverride]
  );

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return (
      <div className="space-y-4">
        {/* Status display */}
        {settings.enabled && (
          <div
            className={`p-3 rounded-lg ${
              status.isReached
                ? "bg-red-500/10 border border-red-500/30"
                : status.isWarning
                ? "bg-amber-500/10 border border-amber-500/30"
                : theme === "dark"
                ? "bg-zinc-800/50"
                : "bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${subtitleClass}`}>
                {t("todays_loss")}
              </span>
              <span className={`text-sm font-semibold ${status.statusColor}`}>
                {status.currentLoss.toFixed(2)} / {status.maxLoss.toFixed(2)}
              </span>
            </div>
            <div
              className={`h-2 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-zinc-700" : "bg-zinc-200"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${status.statusBg}`}
                style={{ width: `${status.usagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[10px] ${subtitleClass}`}>
                {tCommon("remaining")} {status.remaining.toFixed(2)} USDT
              </span>
              {status.isReached && (
                <div className="flex items-center gap-1 text-red-500">
                  <Lock size={10} />
                  <span className="text-[10px] font-medium">{t("trading_locked")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Limit reached - override options */}
        {settings.enabled && status.isReached && (
          <>
            {showOverrideConfirm ? (
              <div
                className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className={`text-xs font-medium ${textClass}`}>
                    {t("override_for_how_long")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleOverride(mins)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                        theme === "dark"
                          ? "bg-zinc-700 text-white hover:bg-zinc-600"
                          : "bg-white text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowOverrideConfirm(false)}
                  className={`w-full mt-2 py-2 rounded-lg text-xs ${subtitleClass}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOverrideConfirm(true)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium ${
                  theme === "dark"
                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                } transition-colors`}
              >
                <Unlock size={14} />
                Override Limit (Not Recommended)
              </button>
            )}
          </>
        )}

        {/* Settings */}
        <div className="space-y-3">
          {/* Limit type */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("limit_type")}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => onChange({ maxDailyLossType: "amount" })}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  settings.maxDailyLossType === "amount"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {tCommon("fixed_amount")}
              </button>
              <button
                onClick={() => onChange({ maxDailyLossType: "percentage" })}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  settings.maxDailyLossType === "percentage"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                % of Balance
              </button>
            </div>
          </div>

          {/* Limit value */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("maximum_daily_loss")}
            </label>
            <div className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}>
              <input
                type="number"
                value={settings.maxDailyLoss}
                onChange={(e) =>
                  onChange({ maxDailyLoss: parseFloat(e.target.value) || 0 })
                }
                className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
              />
              <span className={`text-xs ${subtitleClass}`}>
                {settings.maxDailyLossType === "percentage" ? "%" : currency}
              </span>
            </div>
            {settings.maxDailyLossType === "percentage" && (
              <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                = {((balance * settings.maxDailyLoss) / 100).toFixed(2)} {currency}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {settings.maxDailyLossType === "percentage"
              ? [5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onChange({ maxDailyLoss: pct })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      settings.maxDailyLoss === pct
                        ? "bg-blue-500 text-white"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))
              : [200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => onChange({ maxDailyLoss: amt })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      settings.maxDailyLoss === amt
                        ? "bg-blue-500 text-white"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
          </div>

          {/* Warning threshold */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("warning_at")}
            </label>
            <div className="flex gap-2 mt-1">
              {[60, 70, 80, 90].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onChange({ warningThreshold: pct })}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    settings.warningThreshold === pct
                      ? "bg-amber-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          className={`flex items-start gap-2 p-2 rounded-lg ${
            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Clock size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {t("limit_resets_daily_at_midnight_local")}{" "}
            <span
              className={
                settings.currentDailyPL >= 0 ? "text-emerald-500" : "text-red-500"
              }
            >
              {settings.currentDailyPL >= 0 ? "+" : ""}
              {settings.currentDailyPL.toFixed(2)} USDT
            </span>
          </span>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
          settings.enabled && status.isReached
            ? "bg-red-500/10 border border-red-500/30"
            : settings.enabled && status.isWarning
            ? "bg-amber-500/10 border border-amber-500/30"
            : theme === "dark"
            ? "bg-zinc-900/50 border border-zinc-800/50"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield
            size={14}
            className={
              settings.enabled
                ? status.isReached
                  ? "text-red-500"
                  : status.isWarning
                  ? "text-amber-500"
                  : "text-emerald-500"
                : subtitleClass
            }
          />
          <span className={`text-xs font-medium ${textClass}`}>
            {tCommon("daily_limit")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {settings.enabled && (
            <span className={`text-xs font-semibold ${status.statusColor}`}>
              {status.usagePercent.toFixed(0)}%
            </span>
          )}
          <ChevronDown size={14} className={subtitleClass} />
        </div>
      </button>
    );
  }

  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Shield
            size={16}
            className={
              settings.enabled
                ? status.isReached
                  ? "text-red-500"
                  : "text-emerald-500"
                : subtitleClass
            }
          />
          <span className={`text-sm font-medium ${textClass}`}>
            {t("daily_loss_limit")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => onChange({ enabled: !settings.enabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.enabled ? "bg-emerald-500" : inputBgClass
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

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status display */}
        {settings.enabled && (
          <div
            className={`p-3 rounded-lg ${
              status.isReached
                ? "bg-red-500/10 border border-red-500/30"
                : status.isWarning
                ? "bg-amber-500/10 border border-amber-500/30"
                : theme === "dark"
                ? "bg-zinc-800/50"
                : "bg-zinc-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${subtitleClass}`}>
                {t("todays_loss")}
              </span>
              <span className={`text-sm font-semibold ${status.statusColor}`}>
                {status.currentLoss.toFixed(2)} / {status.maxLoss.toFixed(2)}
              </span>
            </div>
            <div
              className={`h-2 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-zinc-700" : "bg-zinc-200"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${status.statusBg}`}
                style={{ width: `${status.usagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[10px] ${subtitleClass}`}>
                {tCommon("remaining")} {status.remaining.toFixed(2)} USDT
              </span>
              {status.isReached && (
                <div className="flex items-center gap-1 text-red-500">
                  <Lock size={10} />
                  <span className="text-[10px] font-medium">{t("trading_locked")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Limit reached - override options */}
        {settings.enabled && status.isReached && (
          <>
            {showOverrideConfirm ? (
              <div
                className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className={`text-xs font-medium ${textClass}`}>
                    {t("override_for_how_long")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleOverride(mins)}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                        theme === "dark"
                          ? "bg-zinc-700 text-white hover:bg-zinc-600"
                          : "bg-white text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowOverrideConfirm(false)}
                  className={`w-full mt-2 py-2 rounded-lg text-xs ${subtitleClass}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOverrideConfirm(true)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium ${
                  theme === "dark"
                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                } transition-colors`}
              >
                <Unlock size={14} />
                Override Limit (Not Recommended)
              </button>
            )}
          </>
        )}

        {/* Settings */}
        <div className="space-y-3">
          {/* Limit type */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("limit_type")}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => onChange({ maxDailyLossType: "amount" })}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  settings.maxDailyLossType === "amount"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {tCommon("fixed_amount")}
              </button>
              <button
                onClick={() => onChange({ maxDailyLossType: "percentage" })}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  settings.maxDailyLossType === "percentage"
                    ? "bg-blue-500 text-white"
                    : theme === "dark"
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                % of Balance
              </button>
            </div>
          </div>

          {/* Limit value */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("maximum_daily_loss")}
            </label>
            <div className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}>
              <input
                type="number"
                value={settings.maxDailyLoss}
                onChange={(e) =>
                  onChange({ maxDailyLoss: parseFloat(e.target.value) || 0 })
                }
                className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
              />
              <span className={`text-xs ${subtitleClass}`}>
                {settings.maxDailyLossType === "percentage" ? "%" : currency}
              </span>
            </div>
            {settings.maxDailyLossType === "percentage" && (
              <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                = {((balance * settings.maxDailyLoss) / 100).toFixed(2)} {currency}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {settings.maxDailyLossType === "percentage"
              ? [5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onChange({ maxDailyLoss: pct })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      settings.maxDailyLoss === pct
                        ? "bg-blue-500 text-white"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {pct}%
                  </button>
                ))
              : [200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => onChange({ maxDailyLoss: amt })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      settings.maxDailyLoss === amt
                        ? "bg-blue-500 text-white"
                        : theme === "dark"
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
          </div>

          {/* Warning threshold */}
          <div>
            <label className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}>
              {t("warning_at")}
            </label>
            <div className="flex gap-2 mt-1">
              {[60, 70, 80, 90].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onChange({ warningThreshold: pct })}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    settings.warningThreshold === pct
                      ? "bg-amber-500 text-white"
                      : theme === "dark"
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          className={`flex items-start gap-2 p-2 rounded-lg ${
            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Clock size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {t("limit_resets_daily_at_midnight_local")}{" "}
            <span
              className={
                settings.currentDailyPL >= 0 ? "text-emerald-500" : "text-red-500"
              }
            >
              {settings.currentDailyPL >= 0 ? "+" : ""}
              {settings.currentDailyPL.toFixed(2)} USDT
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});

export default DailyLimitSettingsComponent;
