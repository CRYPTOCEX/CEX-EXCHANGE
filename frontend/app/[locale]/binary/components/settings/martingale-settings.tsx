"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  AlertTriangle,
  Info,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

// Storage key for martingale settings
const MARTINGALE_STORAGE_KEY = "binary-martingale-settings";

// Martingale state interface
export interface MartingaleState {
  enabled: boolean;
  multiplier: number; // 1.5, 2, 2.5, 3
  maxConsecutiveIncreases: number; // 3, 4, 5, 6, 7
  resetOnWin: boolean;
  stopLossLimit: number; // Percentage of balance to stop (e.g., 50 = 50%)
  currentLevel: number; // Current multiplier level (0 = base, 1 = 1x multiplied, etc.)
  consecutiveLosses: number;
  baseAmount: number; // Original trade amount
  totalRecovered: number;
  totalLost: number;
}

interface MartingaleSettingsProps {
  state: MartingaleState;
  onChange: (state: MartingaleState) => void;
  balance: number;
  currentAmount: number;
  className?: string;
  darkMode?: boolean;
  compact?: boolean;
  /** When true, always shows expanded content without collapse header */
  alwaysExpanded?: boolean;
}

// Default martingale settings
export const defaultMartingaleState: MartingaleState = {
  enabled: false,
  multiplier: 2,
  maxConsecutiveIncreases: 4,
  resetOnWin: true,
  stopLossLimit: 50,
  currentLevel: 0,
  consecutiveLosses: 0,
  baseAmount: 0,
  totalRecovered: 0,
  totalLost: 0,
};

// Load settings from localStorage
function loadMartingaleSettings(): Partial<MartingaleState> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(MARTINGALE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save settings to localStorage
function saveMartingaleSettings(settings: Partial<MartingaleState>): void {
  if (typeof window === "undefined") return;
  try {
    // Only save persistent settings, not runtime state
    const { enabled, multiplier, maxConsecutiveIncreases, resetOnWin, stopLossLimit } = settings;
    localStorage.setItem(
      MARTINGALE_STORAGE_KEY,
      JSON.stringify({ enabled, multiplier, maxConsecutiveIncreases, resetOnWin, stopLossLimit })
    );
  } catch (error) {
    console.warn("Failed to save martingale settings:", error);
  }
}

// Calculate the next trade amount based on martingale state
export function calculateMartingaleAmount(
  baseAmount: number,
  state: MartingaleState,
  balance: number
): { amount: number; isLimited: boolean; limitReason?: string } {
  if (!state.enabled || state.currentLevel === 0) {
    return { amount: baseAmount, isLimited: false };
  }

  // Calculate multiplied amount
  const multipliedAmount = baseAmount * Math.pow(state.multiplier, state.currentLevel);

  // Check max consecutive increases limit
  if (state.currentLevel >= state.maxConsecutiveIncreases) {
    return {
      amount: baseAmount, // Reset to base
      isLimited: true,
      limitReason: "max_increases_reached",
    };
  }

  // Check stop loss limit
  const maxAllowedAmount = balance * (state.stopLossLimit / 100);
  if (multipliedAmount > maxAllowedAmount) {
    return {
      amount: Math.min(multipliedAmount, maxAllowedAmount),
      isLimited: true,
      limitReason: "stop_loss_limit",
    };
  }

  // Check balance limit
  if (multipliedAmount > balance) {
    return {
      amount: balance,
      isLimited: true,
      limitReason: "balance_limit",
    };
  }

  return { amount: Math.round(multipliedAmount), isLimited: false };
}

// Update martingale state after trade result
export function updateMartingaleAfterTrade(
  state: MartingaleState,
  isWin: boolean,
  tradeAmount: number
): MartingaleState {
  if (!state.enabled) return state;

  if (isWin) {
    // Win: reset to base level if resetOnWin is enabled
    return {
      ...state,
      currentLevel: state.resetOnWin ? 0 : state.currentLevel,
      consecutiveLosses: 0,
      totalRecovered: state.totalRecovered + (state.currentLevel > 0 ? tradeAmount : 0),
    };
  } else {
    // Loss: increase level
    const newLevel = Math.min(state.currentLevel + 1, state.maxConsecutiveIncreases);
    return {
      ...state,
      currentLevel: newLevel,
      consecutiveLosses: state.consecutiveLosses + 1,
      totalLost: state.totalLost + tradeAmount,
    };
  }
}

const MartingaleSettings = memo(function MartingaleSettings({
  state,
  onChange,
  balance,
  currentAmount,
  className = "",
  darkMode = true,
  compact = false,
  alwaysExpanded = false,
}: MartingaleSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [showWarning, setShowWarning] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const saved = loadMartingaleSettings();
    if (Object.keys(saved).length > 0) {
      onChange({ ...state, ...saved });
    }
   
  }, []);

  // Handle toggle
  const handleToggle = useCallback((checked: boolean) => {
    if (checked) {
      setPendingEnable(true);
      setShowWarning(true);
    } else {
      const newState = { ...state, enabled: false, currentLevel: 0, consecutiveLosses: 0 };
      onChange(newState);
      saveMartingaleSettings(newState);
    }
  }, [state, onChange]);

  // Confirm enabling
  const confirmEnable = useCallback(() => {
    const newState = { ...state, enabled: true, baseAmount: currentAmount };
    onChange(newState);
    saveMartingaleSettings(newState);
    setShowWarning(false);
    setPendingEnable(false);
  }, [state, onChange, currentAmount]);

  // Cancel enabling
  const cancelEnable = useCallback(() => {
    setShowWarning(false);
    setPendingEnable(false);
  }, []);

  // Update multiplier
  const handleMultiplierChange = useCallback((value: number[]) => {
    const newState = { ...state, multiplier: value[0] };
    onChange(newState);
    saveMartingaleSettings(newState);
  }, [state, onChange]);

  // Update max consecutive increases
  const handleMaxIncreasesChange = useCallback((value: number[]) => {
    const newState = { ...state, maxConsecutiveIncreases: value[0] };
    onChange(newState);
    saveMartingaleSettings(newState);
  }, [state, onChange]);

  // Update stop loss limit
  const handleStopLossChange = useCallback((value: number[]) => {
    const newState = { ...state, stopLossLimit: value[0] };
    onChange(newState);
    saveMartingaleSettings(newState);
  }, [state, onChange]);

  // Toggle reset on win
  const handleResetOnWinChange = useCallback((checked: boolean) => {
    const newState = { ...state, resetOnWin: checked };
    onChange(newState);
    saveMartingaleSettings(newState);
  }, [state, onChange]);

  // Reset martingale state
  const handleReset = useCallback(() => {
    const newState = {
      ...state,
      currentLevel: 0,
      consecutiveLosses: 0,
      baseAmount: currentAmount,
    };
    onChange(newState);
  }, [state, onChange, currentAmount]);

  // Calculate current and next amounts
  const { amount: nextAmount, isLimited, limitReason } = calculateMartingaleAmount(
    state.baseAmount || currentAmount,
    state,
    balance
  );

  const bgClass = darkMode ? "bg-zinc-900/60" : "bg-gray-50";
  const borderClass = darkMode ? "border-zinc-800/50" : "border-gray-200";
  const textClass = darkMode ? "text-white" : "text-zinc-900";
  const mutedClass = darkMode ? "text-zinc-400" : "text-gray-500";

  // Compact mode
  if (compact) {
    return (
      <>
        <div className={`flex items-center justify-between gap-2 ${className}`}>
          <div className="flex items-center gap-2">
            <Switch
              id="martingale-toggle"
              checked={state.enabled}
              onCheckedChange={handleToggle}
              className={state.enabled ? "bg-orange-500" : ""}
            />
            <Label
              htmlFor="martingale-toggle"
              className={`text-xs cursor-pointer flex items-center gap-1 ${
                state.enabled ? "text-orange-500" : mutedClass
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              {t("martingale") || "Martingale"}
            </Label>
          </div>
          {state.enabled && state.currentLevel > 0 && (
            <span className="text-[10px] text-orange-500 font-medium">
              {state.multiplier}{t("x_level")} {state.currentLevel}
            </span>
          )}
        </div>

        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {t("martingale_warning_title") || "Enable Martingale Mode?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {t("martingale_warning_description") ||
                  "Martingale strategy doubles your stake after each loss. This can recover losses quickly but also lead to significant losses if you hit a losing streak."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
                <ul className="text-sm text-orange-400 space-y-1">
                  <li>• {t("martingale_warning_1") || "Stakes increase exponentially after losses"}</li>
                  <li>• {t("martingale_warning_2") || "Can quickly deplete your balance"}</li>
                  <li>• {t("martingale_warning_3") || "Only use with a strict stop-loss limit"}</li>
                </ul>
              </div>
            </div>
            <AlertDialogFooter>
              <Button variant="outline" onClick={cancelEnable} className="border-zinc-700">
                {tCommon("cancel") || "Cancel"}
              </Button>
              <Button onClick={confirmEnable} className="bg-orange-600 hover:bg-orange-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t("enable_martingale") || "Enable Martingale"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Determine if content should be shown
  const showContent = alwaysExpanded || isExpanded;

  // When alwaysExpanded, render just the settings content without wrapper
  if (alwaysExpanded) {
    return (
      <>
        <div className={`space-y-4 ${className}`}>
          {/* Current Status */}
          {state.enabled && (
            <div
              className={`rounded-lg p-3 ${
                state.currentLevel > 2
                  ? "bg-red-500/10 border border-red-500/30"
                  : state.currentLevel > 0
                    ? "bg-orange-500/10 border border-orange-500/30"
                    : darkMode ? "bg-zinc-800" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${mutedClass}`}>{tCommon("current_status")}</span>
                <button
                  onClick={handleReset}
                  className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${
                    darkMode ? "hover:bg-zinc-700 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                  }`}
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className={mutedClass}>Level</div>
                  <div className={`font-semibold ${textClass}`}>
                    {state.currentLevel} / {state.maxConsecutiveIncreases}
                  </div>
                </div>
                <div>
                  <div className={mutedClass}>{t("next_amount")}</div>
                  <div
                    className={`font-semibold ${
                      isLimited ? "text-red-400" : state.currentLevel > 0 ? "text-orange-400" : "text-emerald-400"
                    }`}
                  >
                    {nextAmount.toLocaleString()}
                    {isLimited && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </div>
                </div>
              </div>
              {state.consecutiveLosses > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-500/20">
                  <div className="flex items-center gap-1 text-xs text-orange-400">
                    <AlertTriangle size={12} />
                    {state.consecutiveLosses} {t("consecutive_losses")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multiplier */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className={`text-sm ${textClass}`}>Multiplier</Label>
              <span className="text-sm font-semibold text-orange-500">{state.multiplier}x</span>
            </div>
            <Slider
              value={[state.multiplier]}
              onValueChange={handleMultiplierChange}
              min={1.5}
              max={3}
              step={0.5}
              className="mt-1"
            />
            <div className={`flex justify-between text-xs mt-1.5 ${mutedClass}`}>
              <span>1.5x</span>
              <span>2x</span>
              <span>2.5x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Max Consecutive Increases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className={`text-sm ${textClass}`}>{t("max_increases")}</Label>
              <span className={`text-sm font-semibold ${textClass}`}>{state.maxConsecutiveIncreases}</span>
            </div>
            <Slider
              value={[state.maxConsecutiveIncreases]}
              onValueChange={handleMaxIncreasesChange}
              min={2}
              max={7}
              step={1}
              className="mt-1"
            />
            <div className={`flex justify-between text-xs mt-1.5 ${mutedClass}`}>
              <span>2</span>
              <span>7</span>
            </div>
          </div>

          {/* Stop Loss Limit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Label className={`text-sm ${textClass}`}>{t("stop_loss_limit")}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={12} className={mutedClass} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        {t("maximum_percentage_of_balance_that_can")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-semibold text-red-400">{state.stopLossLimit}%</span>
            </div>
            <Slider
              value={[state.stopLossLimit]}
              onValueChange={handleStopLossChange}
              min={10}
              max={100}
              step={10}
              className="mt-1"
            />
            <div className={`text-xs mt-1.5 ${mutedClass}`}>
              {t("max_trade")} {((balance * state.stopLossLimit) / 100).toLocaleString()}
            </div>
          </div>

          {/* Reset on Win */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="reset-on-win-expanded" className={`text-sm cursor-pointer ${textClass}`}>
                {t("reset_on_win")}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={12} className={mutedClass} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      {t("when_enabled_returns_to_base_amount")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="reset-on-win-expanded"
              checked={state.resetOnWin}
              onCheckedChange={handleResetOnWinChange}
              className={state.resetOnWin ? "bg-emerald-500" : ""}
            />
          </div>

          {/* High Risk Warning */}
          {state.enabled && state.currentLevel > 2 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={14} />
                <span className="font-medium">{t("high_risk_warning")}</span>
              </div>
              <p className={`text-xs mt-1 ${mutedClass}`}>
                {t("youre_at_level")} {state.currentLevel}{t("consider_stopping_to_prevent_further_losses")}
              </p>
            </div>
          )}
        </div>

        {/* Warning Dialog */}
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {t("enable_martingale_mode")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {t("martingale_strategy_doubles_your_stake_after")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
                <ul className="text-sm text-orange-400 space-y-1">
                  <li>{t("stakes_increase_exponentially_after_losses")}</li>
                  <li>{t("can_quickly_deplete_your_balance")}</li>
                  <li>{t("only_use_with_a_strict_stop_loss_limit")}</li>
                </ul>
              </div>
            </div>
            <AlertDialogFooter>
              <Button variant="outline" onClick={cancelEnable} className="border-zinc-700">
                Cancel
              </Button>
              <Button onClick={confirmEnable} className="bg-orange-600 hover:bg-orange-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t("enable_martingale")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Full mode with wrapper
  return (
    <>
      <div className={`rounded-lg overflow-hidden ${bgClass} border ${borderClass} ${className}`}>
        {/* Header - collapsible */}
        <div
          className={`flex items-center justify-between px-2.5 py-2 cursor-pointer ${
            darkMode ? "hover:bg-zinc-800/30" : "hover:bg-gray-100"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                state.enabled ? "bg-orange-500/20" : darkMode ? "bg-zinc-700/50" : "bg-gray-200"
              }`}
            >
              <TrendingUp
                className={`w-3.5 h-3.5 ${state.enabled ? "text-orange-500" : mutedClass}`}
              />
            </div>
            <div>
              <div className={`text-xs font-medium ${textClass}`}>
                {t("martingale_strategy") || "Martingale Strategy"}
              </div>
              <div className={`text-[10px] ${mutedClass}`}>
                {state.enabled
                  ? state.currentLevel > 0
                    ? `${state.multiplier}x - Level ${state.currentLevel}`
                    : t("martingale_active") || "Active"
                  : t("martingale_inactive") || "Disabled"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="martingale-toggle-full"
              checked={state.enabled}
              onCheckedChange={handleToggle}
              onClick={(e) => e.stopPropagation()}
              className={state.enabled ? "bg-orange-500" : ""}
            />
            {isExpanded ? (
              <ChevronUp size={14} className={mutedClass} />
            ) : (
              <ChevronDown size={14} className={mutedClass} />
            )}
          </div>
        </div>

        {/* Expanded settings */}
        {showContent && (
          <div className={`border-t ${borderClass} p-3 space-y-4`}>
            {/* Current Status */}
            {state.enabled && (
              <div
                className={`rounded-lg p-2.5 ${
                  state.currentLevel > 2
                    ? "bg-red-500/10 border border-red-500/30"
                    : state.currentLevel > 0
                      ? "bg-orange-500/10 border border-orange-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-medium uppercase ${mutedClass}`}>
                    {tCommon("current_status") || "Current Status"}
                  </span>
                  <button
                    onClick={handleReset}
                    className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded ${
                      darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-500"
                    }`}
                  >
                    <RotateCcw size={9} />
                    {tCommon("reset") || "Reset"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className={mutedClass}>{tCommon("level") || "Level"}</div>
                    <div className={`font-semibold ${textClass}`}>
                      {state.currentLevel} / {state.maxConsecutiveIncreases}
                    </div>
                  </div>
                  <div>
                    <div className={mutedClass}>{t("next_amount") || "Next Amount"}</div>
                    <div
                      className={`font-semibold ${
                        isLimited ? "text-red-400" : state.currentLevel > 0 ? "text-orange-400" : "text-emerald-400"
                      }`}
                    >
                      {nextAmount.toLocaleString()}
                      {isLimited && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-3 h-3 inline ml-1" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {limitReason === "max_increases_reached"
                                  ? t("max_increases_reached") || "Max increases reached"
                                  : limitReason === "stop_loss_limit"
                                    ? t("stop_loss_limit_reached") || "Stop loss limit reached"
                                    : t("balance_limit_reached") || "Balance limit reached"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                {state.consecutiveLosses > 0 && (
                  <div className="mt-2 pt-2 border-t border-orange-500/20">
                    <div className="flex items-center gap-1 text-[10px] text-orange-400">
                      <AlertTriangle size={10} />
                      {state.consecutiveLosses} {t("consecutive_losses") || "consecutive losses"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multiplier */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className={`text-xs ${textClass}`}>
                  {t("multiplier") || "Multiplier"}
                </Label>
                <span className={`text-xs font-semibold text-orange-500`}>
                  {state.multiplier}x
                </span>
              </div>
              <Slider
                value={[state.multiplier]}
                onValueChange={handleMultiplierChange}
                min={1.5}
                max={3}
                step={0.5}
                className="mt-1"
              />
              <div className={`flex justify-between text-[9px] mt-1 ${mutedClass}`}>
                <span>1.5x</span>
                <span>2x</span>
                <span>2.5x</span>
                <span>3x</span>
              </div>
            </div>

            {/* Max Consecutive Increases */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className={`text-xs ${textClass}`}>
                  {t("max_increases") || "Max Increases"}
                </Label>
                <span className={`text-xs font-semibold ${textClass}`}>
                  {state.maxConsecutiveIncreases}
                </span>
              </div>
              <Slider
                value={[state.maxConsecutiveIncreases]}
                onValueChange={handleMaxIncreasesChange}
                min={2}
                max={7}
                step={1}
                className="mt-1"
              />
              <div className={`flex justify-between text-[9px] mt-1 ${mutedClass}`}>
                <span>2</span>
                <span>7</span>
              </div>
            </div>

            {/* Stop Loss Limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Label className={`text-xs ${textClass}`}>
                    {t("stop_loss_limit") || "Stop Loss Limit"}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={10} className={mutedClass} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">
                          {t("stop_loss_tooltip") ||
                            "Maximum percentage of balance that can be used in a single martingale trade"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className={`text-xs font-semibold text-red-400`}>
                  {state.stopLossLimit}%
                </span>
              </div>
              <Slider
                value={[state.stopLossLimit]}
                onValueChange={handleStopLossChange}
                min={10}
                max={100}
                step={10}
                className="mt-1"
              />
              <div className={`text-[9px] mt-1 ${mutedClass}`}>
                {t("max_trade") || "Max trade"}: {((balance * state.stopLossLimit) / 100).toLocaleString()}
              </div>
            </div>

            {/* Reset on Win */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label htmlFor="reset-on-win" className={`text-xs cursor-pointer ${textClass}`}>
                  {t("reset_on_win") || "Reset on Win"}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={10} className={mutedClass} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        {t("reset_on_win_tooltip") ||
                          "When enabled, returns to base amount after a winning trade"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="reset-on-win"
                checked={state.resetOnWin}
                onCheckedChange={handleResetOnWinChange}
                className={state.resetOnWin ? "bg-emerald-500" : ""}
              />
            </div>

            {/* Statistics */}
            {state.enabled && (state.totalRecovered > 0 || state.totalLost > 0) && (
              <div className={`rounded-lg p-2.5 ${darkMode ? "bg-zinc-800/50" : "bg-gray-100"}`}>
                <div className="flex items-center gap-1 mb-2">
                  <BarChart3 size={11} className={mutedClass} />
                  <span className={`text-[10px] font-medium uppercase ${mutedClass}`}>
                    {t("statistics") || "Statistics"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className={mutedClass}>{t("recovered") || "Recovered"}</div>
                    <div className="font-semibold text-emerald-400">
                      +{state.totalRecovered.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className={mutedClass}>{t("lost") || "Lost"}</div>
                    <div className="font-semibold text-red-400">
                      -{state.totalLost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Potential Loss Warning */}
            {state.enabled && state.currentLevel > 2 && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5">
                <div className="flex items-center gap-1.5 text-red-400 text-[11px]">
                  <AlertTriangle size={12} />
                  <span className="font-medium">
                    {t("high_risk_warning") || "High Risk Warning"}
                  </span>
                </div>
                <p className={`text-[10px] mt-1 ${mutedClass}`}>
                  {t("high_risk_message") ||
                    `You're at level ${state.currentLevel}. Consider stopping to prevent further losses.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t("martingale_warning_title") || "Enable Martingale Mode?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {t("martingale_warning_description") ||
                "Martingale strategy doubles your stake after each loss. This can recover losses quickly but also lead to significant losses if you hit a losing streak."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
              <ul className="text-sm text-orange-400 space-y-1">
                <li>• {t("martingale_warning_1") || "Stakes increase exponentially after losses"}</li>
                <li>• {t("martingale_warning_2") || "Can quickly deplete your balance"}</li>
                <li>• {t("martingale_warning_3") || "Only use with a strict stop-loss limit"}</li>
              </ul>
            </div>
            <div className={`mt-3 rounded-lg p-3 ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
              <div className={`text-xs font-medium mb-2 ${textClass}`}>
                {t("example_progression") || "Example Progression"} ({state.multiplier}x):
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="text-center">
                    <div className={mutedClass}>L{i + 1}</div>
                    <div className={i >= 3 ? "text-red-400 font-semibold" : textClass}>
                      {Math.round(currentAmount * Math.pow(state.multiplier, i))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelEnable} className="border-zinc-700">
              {tCommon("cancel") || "Cancel"}
            </Button>
            <Button onClick={confirmEnable} className="bg-orange-600 hover:bg-orange-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t("enable_martingale") || "Enable Martingale"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default MartingaleSettings;

// Hook for using martingale state - uses global store for persistence
export function useMartingale(initialAmount: number = 100) {
  // Use global settings store for persistent settings
  const { useTradingSettingsStore } = require("@/store/trade/use-trading-settings-store");
  const globalMartingale = useTradingSettingsStore((state: any) => state.martingale);
  const setMartingaleEnabled = useTradingSettingsStore((state: any) => state.setMartingaleEnabled);
  const updateMartingale = useTradingSettingsStore((state: any) => state.updateMartingale);

  // Local state for runtime values (currentLevel, consecutiveLosses, etc.)
  const [runtimeState, setRuntimeState] = useState({
    currentLevel: 0,
    consecutiveLosses: 0,
    baseAmount: initialAmount,
    totalRecovered: 0,
    totalLost: 0,
  });

  // Combine global persistent settings with local runtime state
  const state: MartingaleState = {
    enabled: globalMartingale.enabled,
    multiplier: globalMartingale.multiplier,
    maxConsecutiveIncreases: globalMartingale.maxSteps,
    resetOnWin: globalMartingale.resetOnWin,
    stopLossLimit: 50, // Default
    currentLevel: runtimeState.currentLevel,
    consecutiveLosses: runtimeState.consecutiveLosses,
    baseAmount: runtimeState.baseAmount,
    totalRecovered: runtimeState.totalRecovered,
    totalLost: runtimeState.totalLost,
  };

  // Update base amount when initialAmount changes
  useEffect(() => {
    setRuntimeState(prev => ({ ...prev, baseAmount: initialAmount }));
  }, [initialAmount]);

  // Combined setState that updates both global and local state
  const setState = useCallback((newState: MartingaleState | ((prev: MartingaleState) => MartingaleState)) => {
    const resolvedState = typeof newState === 'function' ? newState(state) : newState;

    // Update global persistent settings
    if (resolvedState.enabled !== globalMartingale.enabled) {
      setMartingaleEnabled(resolvedState.enabled);
    }
    updateMartingale({
      multiplier: resolvedState.multiplier,
      maxSteps: resolvedState.maxConsecutiveIncreases,
      resetOnWin: resolvedState.resetOnWin,
    });

    // Update local runtime state
    setRuntimeState({
      currentLevel: resolvedState.currentLevel,
      consecutiveLosses: resolvedState.consecutiveLosses,
      baseAmount: resolvedState.baseAmount,
      totalRecovered: resolvedState.totalRecovered,
      totalLost: resolvedState.totalLost,
    });
  }, [state, globalMartingale.enabled, setMartingaleEnabled, updateMartingale]);

  // Calculate current amount based on martingale state
  const getCurrentAmount = useCallback(
    (balance: number) => {
      return calculateMartingaleAmount(state.baseAmount || initialAmount, state, balance);
    },
    [state, initialAmount]
  );

  // Process trade result
  const processTradeResult = useCallback(
    (isWin: boolean, tradeAmount: number) => {
      const newState = updateMartingaleAfterTrade(state, isWin, tradeAmount);
      setRuntimeState({
        currentLevel: newState.currentLevel,
        consecutiveLosses: newState.consecutiveLosses,
        baseAmount: newState.baseAmount,
        totalRecovered: newState.totalRecovered,
        totalLost: newState.totalLost,
      });
    },
    [state]
  );

  // Reset martingale
  const reset = useCallback((newBaseAmount?: number) => {
    setRuntimeState((prev) => ({
      ...prev,
      currentLevel: 0,
      consecutiveLosses: 0,
      baseAmount: newBaseAmount ?? prev.baseAmount,
    }));
  }, []);

  return {
    state,
    setState,
    getCurrentAmount,
    processTradeResult,
    reset,
  };
}
