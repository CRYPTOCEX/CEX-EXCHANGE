"use client";

/**
 * Daily Loss Limit Settings Component
 *
 * Configure and monitor daily trading loss limits.
 *
 * The settings body used to exist twice — once for `alwaysExpanded` and once
 * inside the standalone card — as two byte-identical copies. It is now one
 * `LimitBody`, rendered bare or wrapped.
 *
 * Status colour follows the deviation ladder: neutral while inside the limit,
 * `warning` past the user's own threshold, `destructive` once trading is
 * locked. There is deliberately no green "you are fine" state — a tick on
 * every satisfied setting is what teaches people to stop reading green.
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from "lucide-react";
import type { DailyLimitSettings } from "./risk-management-types";
import {
  FieldLabel,
  Hint,
  Meter,
  NoticeStrip,
  NumberField,
  OptionRow,
  Panel,
  PanelTitle,
  SubtleButton,
  SummaryRow,
  Toggle,
  toneInk,
  type Tone,
} from "./risk-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface DailyLimitSettingsProps {
  settings: DailyLimitSettings;
  balance: number;
  onChange: (settings: Partial<DailyLimitSettings>) => void;
  onOverride: (durationMinutes: number) => void;
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
  currency?: string; // Currency for displaying amounts (e.g., "USDT", "USD", "BTC")
}

const OVERRIDE_MINUTES = [15, 30, 60] as const;
const PERCENT_PRESETS = [5, 10, 15, 20] as const;
const AMOUNT_PRESETS = [200, 500, 1000, 2000] as const;
const WARNING_PRESETS = [60, 70, 80, 90] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export const DailyLimitSettingsComponent = memo(function DailyLimitSettingsComponent({
  settings,
  balance,
  onChange,
  onOverride,
  compact = false,
  alwaysExpanded = false,
  currency = "USDT",
}: DailyLimitSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  // Calculate current status
  const status = useMemo(() => {
    const maxLoss =
      settings.maxDailyLossType === "percentage"
        ? (balance * settings.maxDailyLoss) / 100
        : settings.maxDailyLoss;

    const currentLoss = Math.abs(Math.min(0, settings.currentDailyPL));
    const usagePercent = maxLoss > 0 ? (currentLoss / maxLoss) * 100 : 0;
    const remaining = Math.max(0, maxLoss - currentLoss);

    // Neutral until something is actually wrong.
    let tone: Tone = "neutral";
    if (usagePercent >= 100) {
      tone = "danger";
    } else if (usagePercent >= settings.warningThreshold) {
      tone = "warning";
    }

    return {
      maxLoss,
      currentLoss,
      usagePercent: Math.min(100, usagePercent),
      remaining,
      tone,
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

  const shieldTone: Tone = settings.enabled
    ? status.isReached
      ? "danger"
      : status.isWarning
      ? "warning"
      : "neutral"
    : "neutral";

  // --------------------------------------------------------------------------
  // Shared body — one definition, rendered bare or inside the card.
  // --------------------------------------------------------------------------
  const body = (
    <>
      {/* Status display */}
      {settings.enabled && (
        <div
          className={`p-3 rounded-lg ${
            status.isReached
              ? "bg-destructive/10 border border-destructive/30"
              : status.isWarning
              ? "bg-warning/10 border border-warning/30"
              : "bg-surface-2"
          }`}
        >
          {/* The figure stays on `foreground`. `text-warning` on `bg-warning/10`
              measures 3.22:1 here in light mode and `text-destructive` on its
              own tint 3.91:1, both under the 4.5:1 floor. The state is carried
              by the panel tint, the meter and the lock icon instead — all of
              which are marks, not 14px type. */}
          <SummaryRow
            className="mb-2"
            label={t("todays_loss")}
            value={`${status.currentLoss.toFixed(2)} / ${status.maxLoss.toFixed(2)}`}
          />
          <Meter percent={status.usagePercent} tone={status.tone} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {tCommon("remaining")}: {status.remaining.toFixed(2)} USDT
            </span>
            {status.isReached && (
              <div className="flex items-center gap-1 text-foreground">
                <Lock size={10} className={toneInk("danger")} />
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
            <div className="p-3 rounded-lg bg-surface-2">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className={toneInk("warning")} />
                <span className="text-xs font-medium text-foreground">
                  {t("override_for_how_long")}
                </span>
              </div>
              <OptionRow
                layout="grid-3"
                options={OVERRIDE_MINUTES.map((mins) => ({
                  value: mins,
                  label: mins < 60 ? `${mins}m` : `${mins / 60}h`,
                }))}
                onSelect={handleOverride}
              />
              <button
                type="button"
                onClick={() => setShowOverrideConfirm(false)}
                className="w-full mt-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <SubtleButton tone="warning" onClick={() => setShowOverrideConfirm(true)}>
              <Unlock size={14} className={toneInk("warning")} />
              Override Limit (Not Recommended)
            </SubtleButton>
          )}
        </>
      )}

      {/* Settings */}
      <div className="space-y-3">
        {/* Limit type */}
        <div>
          <FieldLabel>{t("limit_type")}</FieldLabel>
          <OptionRow
            className="mt-1"
            layout="grid-2"
            value={settings.maxDailyLossType}
            onSelect={(maxDailyLossType) => onChange({ maxDailyLossType })}
            options={[
              { value: "amount", label: tCommon("fixed_amount") },
              { value: "percentage", label: "% of Balance" },
            ]}
          />
        </div>

        {/* Limit value */}
        <div>
          <FieldLabel>{t("maximum_daily_loss")}</FieldLabel>
          <NumberField
            value={settings.maxDailyLoss}
            onChange={(maxDailyLoss) => onChange({ maxDailyLoss })}
            suffix={settings.maxDailyLossType === "percentage" ? "%" : currency}
          />
          {settings.maxDailyLossType === "percentage" && (
            <Hint>
              = {((balance * settings.maxDailyLoss) / 100).toFixed(2)} {currency}
            </Hint>
          )}
        </div>

        {/* Quick presets */}
        {settings.maxDailyLossType === "percentage" ? (
          <OptionRow
            size="sm"
            value={settings.maxDailyLoss}
            onSelect={(maxDailyLoss) => onChange({ maxDailyLoss })}
            options={PERCENT_PRESETS.map((pct) => ({ value: pct, label: `${pct}%` }))}
          />
        ) : (
          <OptionRow
            size="sm"
            value={settings.maxDailyLoss}
            onSelect={(maxDailyLoss) => onChange({ maxDailyLoss })}
            options={AMOUNT_PRESETS.map((amt) => ({ value: amt, label: `$${amt}` }))}
          />
        )}

        {/* Warning threshold */}
        <div>
          <FieldLabel>{t("warning_at")}</FieldLabel>
          <OptionRow
            className="mt-1"
            size="sm"
            value={settings.warningThreshold}
            onSelect={(warningThreshold) => onChange({ warningThreshold })}
            options={WARNING_PRESETS.map((pct) => ({ value: pct, label: `${pct}%` }))}
          />
        </div>
      </div>

      {/* Info */}
      <NoticeStrip tone="info" dense icon={<Clock size={12} />}>
        {t("limit_resets_daily_at_midnight_local")}:{" "}
        {/* 10px inside an info tint — the sign carries the direction and the
            ink stays on `foreground`; `text-up`/`text-down` here measured
            3.87:1 in light mode. */}
        <span className="text-foreground font-medium">
          {settings.currentDailyPL >= 0 ? "+" : ""}
          {settings.currentDailyPL.toFixed(2)} USDT
        </span>
      </NoticeStrip>
    </>
  );

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return <div className="space-y-4">{body}</div>;
  }

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
          settings.enabled && status.isReached
            ? "bg-destructive/10 border-destructive/30"
            : settings.enabled && status.isWarning
            ? "bg-warning/10 border-warning/30"
            : "bg-surface-2 border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className={toneInk(shieldTone)} />
          <span className="text-xs font-medium text-foreground">
            {tCommon("daily_limit")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {settings.enabled && (
            // Same rule as the expanded figure: the Shield icon beside it
            // already carries the tone, so the number stays legible.
            <span className="text-xs font-semibold text-foreground">
              {status.usagePercent.toFixed(0)}%
            </span>
          )}
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <Panel
      header={
        <>
          <PanelTitle
            icon={<Shield size={16} />}
            tone={settings.enabled && status.isReached ? "danger" : "neutral"}
          >
            {tCommon("daily_loss_limit")}
          </PanelTitle>
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.enabled}
              onChange={(enabled) => onChange({ enabled })}
              ariaLabel={tCommon("daily_loss_limit")}
            />
            {compact && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-surface-3"
              >
                <ChevronUp size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </>
      }
    >
      {body}
    </Panel>
  );
});

export default DailyLimitSettingsComponent;
