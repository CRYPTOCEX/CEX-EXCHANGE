"use client";

/**
 * Stop-Loss & Take-Profit Settings Component
 *
 * Combined settings for automatic cash-out triggers.
 */

import { memo, useState } from "react";
import {
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import type { StopLossSettings, TakeProfitSettings } from "./risk-management-types";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface StopTakeProfitSettingsProps {
  stopLoss: StopLossSettings;
  takeProfit: TakeProfitSettings;
  onStopLossChange: (settings: Partial<StopLossSettings>) => void;
  onTakeProfitChange: (settings: Partial<TakeProfitSettings>) => void;
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const StopTakeProfitSettings = memo(function StopTakeProfitSettings({
  stopLoss,
  takeProfit,
  onStopLossChange,
  onTakeProfitChange,
  theme = "dark",
  compact = false,
  alwaysExpanded = false,
}: StopTakeProfitSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<"stopLoss" | "takeProfit">("stopLoss");

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const inputBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className={`flex border-b ${borderClass}`}>
          <button
            onClick={() => setActiveTab("stopLoss")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "stopLoss"
                ? "text-red-500 border-b-2 border-red-500"
                : subtitleClass
            }`}
          >
            <TrendingDown size={14} />
            Stop-Loss
            {stopLoss.enabled && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("takeProfit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "takeProfit"
                ? "text-emerald-500 border-b-2 border-emerald-500"
                : subtitleClass
            }`}
          >
            <TrendingUp size={14} />
            Take-Profit
            {takeProfit.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        <div className="space-y-4">
          {/* Stop-Loss Tab */}
          {activeTab === "stopLoss" && (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textClass}`}>{t("enable_stop_loss")}</span>
                <button
                  onClick={() => onStopLossChange({ enabled: !stopLoss.enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    stopLoss.enabled ? "bg-red-500" : inputBgClass
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      stopLoss.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {stopLoss.enabled && (
                <>
                  {/* Type selection */}
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      {t("stop_loss_type")}
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { value: "per_trade", label: "Per Trade" },
                        { value: "session", label: "Session" },
                        { value: "daily", label: "Daily" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            onStopLossChange({
                              type: opt.value as StopLossSettings["type"],
                            })
                          }
                          className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                            stopLoss.type === opt.value
                              ? "bg-red-500 text-white"
                              : theme === "dark"
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type-specific settings */}
                  {stopLoss.type === "per_trade" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        {t("cash_out_at_loss")}
                      </label>
                      <div className="flex gap-2 mt-1">
                        {[20, 30, 50, 70].map((pct) => (
                          <button
                            key={pct}
                            onClick={() =>
                              onStopLossChange({ perTradeLossPercent: pct })
                            }
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                              stopLoss.perTradeLossPercent === pct
                                ? "bg-red-500 text-white"
                                : theme === "dark"
                                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>
                      <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                        {t("automatically_cash_out_if_unrealized_loss")}
                      </div>
                    </div>
                  )}

                  {stopLoss.type === "session" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        Session Loss Limit (USDT)
                      </label>
                      <div
                        className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                      >
                        <input
                          type="number"
                          value={stopLoss.sessionLossLimit}
                          onChange={(e) =>
                            onStopLossChange({
                              sessionLossLimit: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                        />
                        <span className={`text-xs ${subtitleClass}`}>USDT</span>
                      </div>
                      <div
                        className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                          theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                        }`}
                      >
                        <span className={`text-xs ${subtitleClass}`}>
                          {t("session_loss")}
                        </span>
                        <span className="text-sm font-semibold text-red-500">
                          -{stopLoss.currentSessionLoss.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  )}

                  {stopLoss.type === "daily" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        Daily Loss Limit (USDT)
                      </label>
                      <div
                        className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                      >
                        <input
                          type="number"
                          value={stopLoss.dailyLossLimit}
                          onChange={(e) =>
                            onStopLossChange({
                              dailyLossLimit: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                        />
                        <span className={`text-xs ${subtitleClass}`}>USDT</span>
                      </div>
                      <div
                        className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                          theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                        }`}
                      >
                        <span className={`text-xs ${subtitleClass}`}>
                          {t("todays_loss")}
                        </span>
                        <span className="text-sm font-semibold text-red-500">
                          -{stopLoss.currentDailyLoss.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Take-Profit Tab */}
          {activeTab === "takeProfit" && (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textClass}`}>{t("enable_take_profit")}</span>
                <button
                  onClick={() =>
                    onTakeProfitChange({ enabled: !takeProfit.enabled })
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    takeProfit.enabled ? "bg-emerald-500" : inputBgClass
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      takeProfit.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {takeProfit.enabled && (
                <>
                  {/* Type selection */}
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      {t("take_profit_type")}
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[
                        { value: "per_trade", label: "Per Trade" },
                        { value: "session", label: "Session" },
                        { value: "daily", label: "Daily" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            onTakeProfitChange({
                              type: opt.value as TakeProfitSettings["type"],
                            })
                          }
                          className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                            takeProfit.type === opt.value
                              ? "bg-emerald-500 text-white"
                              : theme === "dark"
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type-specific settings */}
                  {takeProfit.type === "per_trade" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        {t("cash_out_at_profit")}
                      </label>
                      <div className="flex gap-2 mt-1">
                        {[30, 50, 70, 90].map((pct) => (
                          <button
                            key={pct}
                            onClick={() =>
                              onTakeProfitChange({ perTradeProfitPercent: pct })
                            }
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                              takeProfit.perTradeProfitPercent === pct
                                ? "bg-emerald-500 text-white"
                                : theme === "dark"
                                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                      <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                        {t("automatically_cash_out_if_unrealized_profit")}
                      </div>
                    </div>
                  )}

                  {takeProfit.type === "session" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        Session Profit Target (USDT)
                      </label>
                      <div
                        className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                      >
                        <input
                          type="number"
                          value={takeProfit.sessionProfitTarget}
                          onChange={(e) =>
                            onTakeProfitChange({
                              sessionProfitTarget: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                        />
                        <span className={`text-xs ${subtitleClass}`}>USDT</span>
                      </div>
                      <div
                        className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                          theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                        }`}
                      >
                        <span className={`text-xs ${subtitleClass}`}>
                          {t("session_profit")}
                        </span>
                        <span className="text-sm font-semibold text-emerald-500">
                          +{takeProfit.currentSessionProfit.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  )}

                  {takeProfit.type === "daily" && (
                    <div>
                      <label
                        className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                      >
                        Daily Profit Target (USDT)
                      </label>
                      <div
                        className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                      >
                        <input
                          type="number"
                          value={takeProfit.dailyProfitTarget}
                          onChange={(e) =>
                            onTakeProfitChange({
                              dailyProfitTarget: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                        />
                        <span className={`text-xs ${subtitleClass}`}>USDT</span>
                      </div>
                      <div
                        className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                          theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                        }`}
                      >
                        <span className={`text-xs ${subtitleClass}`}>
                          {t("todays_profit")}
                        </span>
                        <span className="text-sm font-semibold text-emerald-500">
                          +{takeProfit.currentDailyProfit.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Info box */}
          <div
            className={`flex items-start gap-2 p-2 rounded-lg ${
              theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
            }`}
          >
            <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
            <span className={`text-[10px] ${subtitleClass}`}>
              {activeTab === "stopLoss"
                ? "Stop-loss triggers automatic cash-out to limit losses. Per-trade applies to current position, session/daily track cumulative losses."
                : "Take-profit locks in gains automatically. Per-trade applies to current position, session/daily track cumulative profits."}
            </span>
          </div>
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
          theme === "dark"
            ? "bg-zinc-900/50 border border-zinc-800/50"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-500" />
          <span className={`text-xs font-medium ${textClass}`}>
            {tCommon("stop_loss_take_profit")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {stopLoss.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
                SL
              </span>
            )}
            {takeProfit.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                TP
              </span>
            )}
          </div>
          <ChevronDown size={14} className={subtitleClass} />
        </div>
      </button>
    );
  }

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div
        className={`px-4 py-3 border-b ${borderClass} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-500" />
          <span className={`text-sm font-medium ${textClass}`}>
            {t("auto_cash_out")}
          </span>
        </div>
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

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("stopLoss")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "stopLoss"
              ? "text-red-500 border-b-2 border-red-500"
              : subtitleClass
          }`}
        >
          <TrendingDown size={14} />
          Stop-Loss
          {stopLoss.enabled && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("takeProfit")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "takeProfit"
              ? "text-emerald-500 border-b-2 border-emerald-500"
              : subtitleClass
          }`}
        >
          <TrendingUp size={14} />
          Take-Profit
          {takeProfit.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Stop-Loss Tab */}
        {activeTab === "stopLoss" && (
          <>
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textClass}`}>{t("enable_stop_loss")}</span>
              <button
                onClick={() => onStopLossChange({ enabled: !stopLoss.enabled })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  stopLoss.enabled ? "bg-red-500" : inputBgClass
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    stopLoss.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {stopLoss.enabled && (
              <>
                {/* Type selection */}
                <div>
                  <label
                    className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                  >
                    {t("stop_loss_type")}
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { value: "per_trade", label: "Per Trade" },
                      { value: "session", label: "Session" },
                      { value: "daily", label: "Daily" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onStopLossChange({
                            type: opt.value as StopLossSettings["type"],
                          })
                        }
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          stopLoss.type === opt.value
                            ? "bg-red-500 text-white"
                            : theme === "dark"
                            ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type-specific settings */}
                {stopLoss.type === "per_trade" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      {t("cash_out_at_loss")}
                    </label>
                    <div className="flex gap-2 mt-1">
                      {[20, 30, 50, 70].map((pct) => (
                        <button
                          key={pct}
                          onClick={() =>
                            onStopLossChange({ perTradeLossPercent: pct })
                          }
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            stopLoss.perTradeLossPercent === pct
                              ? "bg-red-500 text-white"
                              : theme === "dark"
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                    <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                      {t("automatically_cash_out_if_unrealized_loss")}
                    </div>
                  </div>
                )}

                {stopLoss.type === "session" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      Session Loss Limit (USDT)
                    </label>
                    <div
                      className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                    >
                      <input
                        type="number"
                        value={stopLoss.sessionLossLimit}
                        onChange={(e) =>
                          onStopLossChange({
                            sessionLossLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                      />
                      <span className={`text-xs ${subtitleClass}`}>USDT</span>
                    </div>
                    <div
                      className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                        theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                      }`}
                    >
                      <span className={`text-xs ${subtitleClass}`}>
                        {t("session_loss")}
                      </span>
                      <span className="text-sm font-semibold text-red-500">
                        -{stopLoss.currentSessionLoss.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                )}

                {stopLoss.type === "daily" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      Daily Loss Limit (USDT)
                    </label>
                    <div
                      className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                    >
                      <input
                        type="number"
                        value={stopLoss.dailyLossLimit}
                        onChange={(e) =>
                          onStopLossChange({
                            dailyLossLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                      />
                      <span className={`text-xs ${subtitleClass}`}>USDT</span>
                    </div>
                    <div
                      className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                        theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                      }`}
                    >
                      <span className={`text-xs ${subtitleClass}`}>
                        {t("todays_loss")}
                      </span>
                      <span className="text-sm font-semibold text-red-500">
                        -{stopLoss.currentDailyLoss.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Take-Profit Tab */}
        {activeTab === "takeProfit" && (
          <>
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textClass}`}>{t("enable_take_profit")}</span>
              <button
                onClick={() =>
                  onTakeProfitChange({ enabled: !takeProfit.enabled })
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  takeProfit.enabled ? "bg-emerald-500" : inputBgClass
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    takeProfit.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {takeProfit.enabled && (
              <>
                {/* Type selection */}
                <div>
                  <label
                    className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                  >
                    {t("take_profit_type")}
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { value: "per_trade", label: "Per Trade" },
                      { value: "session", label: "Session" },
                      { value: "daily", label: "Daily" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onTakeProfitChange({
                            type: opt.value as TakeProfitSettings["type"],
                          })
                        }
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          takeProfit.type === opt.value
                            ? "bg-emerald-500 text-white"
                            : theme === "dark"
                            ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type-specific settings */}
                {takeProfit.type === "per_trade" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      {t("cash_out_at_profit")}
                    </label>
                    <div className="flex gap-2 mt-1">
                      {[30, 50, 70, 90].map((pct) => (
                        <button
                          key={pct}
                          onClick={() =>
                            onTakeProfitChange({ perTradeProfitPercent: pct })
                          }
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            takeProfit.perTradeProfitPercent === pct
                              ? "bg-emerald-500 text-white"
                              : theme === "dark"
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                    <div className={`text-[10px] mt-1 ${subtitleClass}`}>
                      {t("automatically_cash_out_if_unrealized_profit")}
                    </div>
                  </div>
                )}

                {takeProfit.type === "session" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      Session Profit Target (USDT)
                    </label>
                    <div
                      className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                    >
                      <input
                        type="number"
                        value={takeProfit.sessionProfitTarget}
                        onChange={(e) =>
                          onTakeProfitChange({
                            sessionProfitTarget: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                      />
                      <span className={`text-xs ${subtitleClass}`}>USDT</span>
                    </div>
                    <div
                      className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                        theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                      }`}
                    >
                      <span className={`text-xs ${subtitleClass}`}>
                        {t("session_profit")}
                      </span>
                      <span className="text-sm font-semibold text-emerald-500">
                        +{takeProfit.currentSessionProfit.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                )}

                {takeProfit.type === "daily" && (
                  <div>
                    <label
                      className={`text-xs font-medium ${subtitleClass} uppercase tracking-wide`}
                    >
                      Daily Profit Target (USDT)
                    </label>
                    <div
                      className={`mt-1 ${inputBgClass} rounded-lg flex items-center px-3`}
                    >
                      <input
                        type="number"
                        value={takeProfit.dailyProfitTarget}
                        onChange={(e) =>
                          onTakeProfitChange({
                            dailyProfitTarget: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`flex-1 bg-transparent py-2 outline-none ${textClass} text-sm`}
                      />
                      <span className={`text-xs ${subtitleClass}`}>USDT</span>
                    </div>
                    <div
                      className={`flex items-center justify-between mt-2 p-2 rounded-lg ${
                        theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-50"
                      }`}
                    >
                      <span className={`text-xs ${subtitleClass}`}>
                        {t("todays_profit")}
                      </span>
                      <span className="text-sm font-semibold text-emerald-500">
                        +{takeProfit.currentDailyProfit.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Info box */}
        <div
          className={`flex items-start gap-2 p-2 rounded-lg ${
            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
          }`}
        >
          <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <span className={`text-[10px] ${subtitleClass}`}>
            {activeTab === "stopLoss"
              ? "Stop-loss triggers automatic cash-out to limit losses. Per-trade applies to current position, session/daily track cumulative losses."
              : "Take-profit locks in gains automatically. Per-trade applies to current position, session/daily track cumulative profits."}
          </span>
        </div>
      </div>
    </div>
  );
});

export default StopTakeProfitSettings;
