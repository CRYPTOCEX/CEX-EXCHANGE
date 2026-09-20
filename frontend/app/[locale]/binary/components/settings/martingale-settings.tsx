"use client";

/**
 * Martingale strategy settings.
 *
 * Structure: the confirmation dialog existed in all three render branches
 * (compact / alwaysExpanded / full) as three copies of the same markup with
 * different translation keys, and the three sliders and the status block each
 * existed twice. They are now `WarningDialog`, `SliderField` and `StatusBlock`,
 * parameterised by the handful of things that actually differ. Every `t("…")`
 * call is still written out literally at the call site, because the i18n build
 * scrapes those keys statically.
 *
 * Colour: martingale is a risk-amplifying feature, so the escalation ladder is
 * the only thing that carries hue — neutral at level 0, `warning` once the
 * stake has been multiplied, `destructive` past the high-risk level or when the
 * stake has been capped. The multiplier, the max-increases count and the
 * stop-loss percentage are settings values, not states, and are plain
 * `foreground`; they used to be orange and red respectively, which made a
 * dormant panel look like it was already in trouble.
 */

import { useState, useEffect, useCallback, memo, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  AlertTriangle,
  Info,
  RotateCcw,
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toneInk, type Tone } from "../risk-management/risk-ui";
import { useTranslations } from "next-intl";

// Storage key for martingale settings
const MARTINGALE_STORAGE_KEY = "binary-martingale-settings";

/** Level at which the panel escalates from caution to alarm. */
const HIGH_RISK_LEVEL = 2;

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
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
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

// ============================================================================
// SHARED PIECES
// ============================================================================

/** Confirmation dialog. One definition; the three call sites differ only in copy. */
function WarningDialog({
  open,
  onOpenChange,
  title,
  description,
  bullets,
  extra,
  onCancel,
  onConfirm,
  cancelLabel,
  confirmLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  bullets: ReactNode[];
  extra?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
            <ul className="text-sm text-foreground space-y-1">
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
          {extra}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Label + current value + slider + scale, the shape used three times per branch. */
function SliderField({
  label,
  tooltip,
  sliderValue,
  display,
  onValueChange,
  min,
  max,
  step,
  scale,
  footer,
  dense,
}: {
  label: ReactNode;
  tooltip?: ReactNode;
  /** The controlled numeric value fed to the Slider. */
  sliderValue: number;
  /** What the reader sees next to the label ("2x", "50%", a bare count). */
  display: ReactNode;
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  scale?: ReactNode[];
  footer?: ReactNode;
  dense: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center ${dense ? "gap-1" : "gap-1.5"}`}>
          <Label className={`${dense ? "text-xs" : "text-sm"} text-foreground`}>
            {label}
          </Label>
          {tooltip && (
              <Tooltip>
                <TooltipTrigger>
                  <Info size={dense ? 10 : 12} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
          )}
        </div>
        {/* A settings value is not a state — these used to be orange and red. */}
        <span
          className={`${dense ? "text-xs" : "text-sm"} font-semibold text-foreground`}
        >
          {display}
        </span>
      </div>
      <Slider
        value={[sliderValue]}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        className="mt-1"
      />
      {scale && (
        <div
          className={`flex justify-between ${
            dense ? "text-[9px] mt-1" : "text-xs mt-1.5"
          } text-muted-foreground`}
        >
          {scale.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      )}
      {footer && (
        <div
          className={`${dense ? "text-[9px] mt-1" : "text-xs mt-1.5"} text-muted-foreground`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

const MartingaleSettings = memo(function MartingaleSettings({
  state,
  onChange,
  balance,
  currentAmount,
  className = "",
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

  // The escalation ladder. Level 0 is deliberately neutral — a dormant
  // martingale is not a success, it is just off.
  const levelTone: Tone =
    state.currentLevel > HIGH_RISK_LEVEL
      ? "danger"
      : state.currentLevel > 0
      ? "warning"
      : "neutral";
  const nextAmountTone: Tone = isLimited ? "danger" : levelTone;
  const levelTint =
    levelTone === "danger"
      ? "bg-destructive/10 border border-destructive/30"
      : levelTone === "warning"
      ? "bg-warning/10 border border-warning/30"
      : "bg-surface-2";

  const highRiskWarning = state.enabled && state.currentLevel > HIGH_RISK_LEVEL;

  // --------------------------------------------------------------------------
  // Status block — shared by the two expanded branches.
  // --------------------------------------------------------------------------
  const statusBlock = (dense: boolean, withLimitTooltip: boolean) =>
    state.enabled && (
      <div className={`rounded-lg ${dense ? "p-2.5" : "p-3"} ${levelTint}`}>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`${
              dense ? "text-[10px] uppercase" : "text-xs"
            } font-medium text-muted-foreground`}
          >
            {tCommon("current_status")}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className={`${
              dense ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
            } flex items-center gap-1 rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground`}
          >
            <RotateCcw size={dense ? 9 : 10} />
            {dense ? tCommon("reset") || tCommon("reset") : tCommon("reset")}
          </button>
        </div>
        <div
          className={`grid grid-cols-2 ${dense ? "gap-2 text-xs" : "gap-3 text-sm"}`}
        >
          <div>
            <div className="text-muted-foreground">
              {dense ? tCommon("level") || tCommon("level") : tCommon("level")}
            </div>
            <div className="font-semibold text-foreground">
              {state.currentLevel} / {state.maxConsecutiveIncreases}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {dense ? t("next_amount") || t("next_amount") : t("next_amount")}
            </div>
            <div
              className={`font-semibold ${
                nextAmountTone === "neutral" ? "text-foreground" : toneInk(nextAmountTone)
              }`}
            >
              {nextAmount.toLocaleString()}
              {isLimited &&
                (withLimitTooltip ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="w-3 h-3 inline ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {limitReason === "max_increases_reached"
                            ? t("max_increases_reached") || t("max_increases_reached")
                            : limitReason === "stop_loss_limit"
                              ? t("stop_loss_limit_reached") || t("stop_loss_limit_reached")
                              : t("balance_limit_reached") || t("balance_limit_reached")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                ) : (
                  <AlertTriangle className="w-3 h-3 inline ml-1" />
                ))}
            </div>
          </div>
        </div>
        {state.consecutiveLosses > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div
              className={`flex items-center gap-1 ${
                dense ? "text-[10px]" : "text-xs"
              } text-foreground`}
            >
              <AlertTriangle size={dense ? 10 : 12} className={toneInk("warning")} />
              {state.consecutiveLosses}{" "}
              {dense
                ? t("consecutive_losses") || t("consecutive_losses")
                : t("consecutive_losses")}
            </div>
          </div>
        )}
      </div>
    );

  // --------------------------------------------------------------------------
  // Compact mode
  // --------------------------------------------------------------------------
  if (compact) {
    return (
      <>
        <div className={`flex items-center justify-between gap-2 ${className}`}>
          <div className="flex items-center gap-2">
            <Switch
              id="martingale-toggle"
              checked={state.enabled}
              onCheckedChange={handleToggle}
            />
            <Label
              htmlFor="martingale-toggle"
              className={`text-xs cursor-pointer flex items-center gap-1 ${
                state.enabled ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              {tCommon("martingale") || tCommon("martingale")}
            </Label>
          </div>
          {state.enabled && state.currentLevel > 0 && (
            <span
              className={`text-[10px] font-medium ${
                levelTone === "neutral" ? "text-foreground" : toneInk(levelTone)
              }`}
            >
              {state.multiplier}{t("x_level")} {state.currentLevel}
            </span>
          )}
        </div>

        <WarningDialog
          open={showWarning}
          onOpenChange={setShowWarning}
          onCancel={cancelEnable}
          onConfirm={confirmEnable}
          title={t("martingale_warning_title") || t("enable_martingale_mode")}
          description={
            t("martingale_warning_description") ||
            t("martingale_strategy_doubles_your_stake_after")
          }
          bullets={[
            <>• {t("martingale_warning_1") || t("stakes_increase_exponentially_after_losses")}</>,
            <>• {t("martingale_warning_2") || t("can_quickly_deplete_your_balance")}</>,
            <>• {t("martingale_warning_3") || t("only_use_with_a_strict_stop_loss_limit")}</>,
          ]}
          cancelLabel={tCommon("cancel") || "Cancel"}
          confirmLabel={t("enable_martingale") || "Enable Martingale"}
        />
      </>
    );
  }

  // Determine if content should be shown
  const showContent = alwaysExpanded || isExpanded;

  // --------------------------------------------------------------------------
  // When alwaysExpanded, render just the settings content without wrapper
  // --------------------------------------------------------------------------
  if (alwaysExpanded) {
    return (
      <>
        <div className={`space-y-4 ${className}`}>
          {statusBlock(false, false)}

          <SliderField
            dense={false}
            label="Multiplier"
            sliderValue={state.multiplier}
            display={`${state.multiplier}x`}
            onValueChange={handleMultiplierChange}
            min={1.5}
            max={3}
            step={0.5}
            scale={["1.5x", "2x", "2.5x", "3x"]}
          />

          <SliderField
            dense={false}
            label={t("max_increases")}
            sliderValue={state.maxConsecutiveIncreases}
            display={state.maxConsecutiveIncreases}
            onValueChange={handleMaxIncreasesChange}
            min={2}
            max={7}
            step={1}
            scale={["2", "7"]}
          />

          <SliderField
            dense={false}
            label={t("stop_loss_limit")}
            tooltip={t("maximum_percentage_of_balance_that_can")}
            sliderValue={state.stopLossLimit}
            display={`${state.stopLossLimit}%`}
            onValueChange={handleStopLossChange}
            min={10}
            max={100}
            step={10}
            footer={
              <>
                {t("max_trade")}{" "}
                {((balance * state.stopLossLimit) / 100).toLocaleString()}
              </>
            }
          />

          {/* Reset on Win */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
            <div className="flex items-center gap-1.5">
              <Label
                htmlFor="reset-on-win-expanded"
                className="text-sm cursor-pointer text-foreground"
              >
                {t("reset_on_win")}
              </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={12} className="text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      {t("when_enabled_returns_to_base_amount")}
                    </p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <Switch
              id="reset-on-win-expanded"
              checked={state.resetOnWin}
              onCheckedChange={handleResetOnWinChange}
            />
          </div>

          {/* High Risk Warning */}
          {highRiskWarning && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <div className="flex items-center gap-2 text-foreground text-sm">
                <AlertTriangle size={14} className={toneInk("danger")} />
                <span className="font-medium">{t("high_risk_warning")}</span>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {t("youre_at_level")} {state.currentLevel}
                . Consider stopping to prevent further losses.
              </p>
            </div>
          )}
        </div>

        <WarningDialog
          open={showWarning}
          onOpenChange={setShowWarning}
          onCancel={cancelEnable}
          onConfirm={confirmEnable}
          title={t("enable_martingale_mode")}
          description={t("martingale_strategy_doubles_your_stake_after")}
          bullets={[
            t("stakes_increase_exponentially_after_losses"),
            t("can_quickly_deplete_your_balance"),
            t("only_use_with_a_strict_stop_loss_limit"),
          ]}
          cancelLabel="Cancel"
          confirmLabel={t("enable_martingale")}
        />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // Full mode with wrapper
  // --------------------------------------------------------------------------
  return (
    <>
      <div
        className={`rounded-lg overflow-hidden bg-card border border-border ${className}`}
      >
        {/* Header - collapsible */}
        <div
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer hover:bg-surface-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                state.enabled ? "bg-primary/15" : "bg-surface-3"
              }`}
            >
              <TrendingUp
                className={`w-3.5 h-3.5 ${
                  state.enabled ? "text-primary" : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">
                {t("martingale_strategy") || t("martingale_strategy")}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {state.enabled
                  ? state.currentLevel > 0
                    ? t("x_level_1", { multiplier: String(state.multiplier), currentLevel: String(state.currentLevel) })
                    : t("martingale_active") || tCommon("active")
                  : t("martingale_inactive") || tCommon("disabled")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="martingale-toggle-full"
              checked={state.enabled}
              onCheckedChange={handleToggle}
              onClick={(e) => e.stopPropagation()}
            />
            {isExpanded ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded settings */}
        {showContent && (
          <div className="border-t border-border p-3 space-y-4">
            {statusBlock(true, true)}

            <SliderField
              dense
              label={t("multiplier") || t("multiplier")}
              sliderValue={state.multiplier}
              display={`${state.multiplier}x`}
              onValueChange={handleMultiplierChange}
              min={1.5}
              max={3}
              step={0.5}
              scale={["1.5x", "2x", "2.5x", "3x"]}
            />

            <SliderField
              dense
              label={t("max_increases") || t("max_increases")}
              sliderValue={state.maxConsecutiveIncreases}
              display={state.maxConsecutiveIncreases}
              onValueChange={handleMaxIncreasesChange}
              min={2}
              max={7}
              step={1}
              scale={["2", "7"]}
            />

            <SliderField
              dense
              label={t("stop_loss_limit") || t("stop_loss_limit")}
              tooltip={
                t("stop_loss_tooltip") ||
                t("maximum_percentage_of_balance_that_can")
              }
              sliderValue={state.stopLossLimit}
              display={`${state.stopLossLimit}%`}
              onValueChange={handleStopLossChange}
              min={10}
              max={100}
              step={10}
              footer={
                <>
                  {t("max_trade") || t("max_trade")}:{" "}
                  {((balance * state.stopLossLimit) / 100).toLocaleString()}
                </>
              }
            />

            {/* Reset on Win */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label
                  htmlFor="reset-on-win"
                  className="text-xs cursor-pointer text-foreground"
                >
                  {t("reset_on_win") || t("reset_on_win")}
                </Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={10} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        {t("reset_on_win_tooltip") ||
                          t("when_enabled_returns_to_base_amount")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
              </div>
              <Switch
                id="reset-on-win"
                checked={state.resetOnWin}
                onCheckedChange={handleResetOnWinChange}
              />
            </div>

            {/* Statistics — realised P&L, so up/down (R1) */}
            {state.enabled && (state.totalRecovered > 0 || state.totalLost > 0) && (
              <div className="rounded-lg p-2.5 bg-surface-2">
                <div className="flex items-center gap-1 mb-2">
                  <BarChart3 size={11} className="text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("statistics") || t("statistics")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">
                      {t("recovered") || t("recovered")}
                    </div>
                    <div className="font-semibold text-up">
                      +{state.totalRecovered.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("lost") || t("lost")}</div>
                    <div className="font-semibold text-down">
                      -{state.totalLost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Potential Loss Warning */}
            {highRiskWarning && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5">
                <div className="flex items-center gap-1.5 text-foreground text-[11px]">
                  <AlertTriangle size={12} className={toneInk("danger")} />
                  <span className="font-medium">
                    {t("high_risk_warning") || t("high_risk_warning")}
                  </span>
                </div>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  {t("high_risk_message") ||
                    t("youre_at_level_consider_stopping_to", { currentLevel: String(state.currentLevel) })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <WarningDialog
        open={showWarning}
        onOpenChange={setShowWarning}
        onCancel={cancelEnable}
        onConfirm={confirmEnable}
        title={t("martingale_warning_title") || t("enable_martingale_mode")}
        description={
          t("martingale_warning_description") ||
          t("martingale_strategy_doubles_your_stake_after")
        }
        bullets={[
          <>• {t("martingale_warning_1") || t("stakes_increase_exponentially_after_losses")}</>,
          <>• {t("martingale_warning_2") || t("can_quickly_deplete_your_balance")}</>,
          <>• {t("martingale_warning_3") || t("only_use_with_a_strict_stop_loss_limit")}</>,
        ]}
        extra={
          <div className="mt-3 rounded-lg p-3 bg-surface-2">
            <div className="text-xs font-medium mb-2 text-foreground">
              {t("example_progression") || t("example_progression")} ({state.multiplier}x):
            </div>
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="text-center">
                  <div className="text-muted-foreground">L{i + 1}</div>
                  <div
                    className={
                      i >= 3 ? "text-destructive font-semibold" : "text-foreground"
                    }
                  >
                    {Math.round(currentAmount * Math.pow(state.multiplier, i))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
        cancelLabel={tCommon("cancel") || "Cancel"}
        confirmLabel={t("enable_martingale") || "Enable Martingale"}
      />
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
