"use client";

/**
 * Trade Cooldown Component
 *
 * Prevents revenge trading by enforcing a cooldown after consecutive losses.
 *
 * The settings body was previously written twice, byte-identically, for the
 * `alwaysExpanded` and standalone cases. It is now one `body`.
 *
 * Colour: the whole feature speaks one language now. A running cooldown and a
 * building loss streak are both `warning` — they used to be an amber panel
 * containing a red counter, which is two urgencies for one state. Only
 * overriding a live cooldown is `destructive`, because that is the action that
 * removes the protection.
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
import {
  FieldLabel,
  Meter,
  NoticeStrip,
  OptionRow,
  Panel,
  PanelTitle,
  Pips,
  SubtleButton,
  Toggle,
  ToggleRow,
  toneInk,
  type Tone,
} from "./risk-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface TradeCooldownProps {
  settings: CooldownSettings;
  onChange: (settings: Partial<CooldownSettings>) => void;
  onOverride: () => void;
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  theme?: "dark" | "light";
  compact?: boolean;
  /** When true, renders only the settings content without wrapper (for use inside SettingSection) */
  alwaysExpanded?: boolean;
}

const LOSS_TRIGGERS = [2, 3, 4, 5] as const;
const COOLDOWN_MINUTES = [5, 10, 15, 30] as const;

/** Streak share at which the panel starts warning. */
const STREAK_WARNING_AT = 66;

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
  compact = false,
  alwaysExpanded = false,
}: TradeCooldownProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);

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
  const streakHot = streakProgress >= STREAK_WARNING_AT;
  const streakTone: Tone = streakHot ? "warning" : "neutral";

  // --------------------------------------------------------------------------
  // Shared body — one definition, rendered bare or inside the card.
  // --------------------------------------------------------------------------
  const body = (
    <>
      {/* Active cooldown display */}
      {settings.isInCooldown && (
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pause size={16} className={toneInk("warning")} />
              <span className="text-sm font-medium text-foreground">
                {t("trading_paused")}
              </span>
            </div>
            <span className="text-2xl font-mono font-bold text-foreground">
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Progress bar */}
          <Meter percent={progress * 100} tone="warning" />

          {/* Override option */}
          {settings.allowOverride && (
            <div className="mt-3">
              {showOverrideWarning ? (
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={12} className={toneInk("danger")} />
                    <span className="text-xs text-foreground">
                      {t("are_you_sure_cooldowns_help_prevent")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleOverride}
                      className="flex-1 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("override_anyway")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverrideWarning(false)}
                      className="flex-1 py-1.5 rounded text-xs bg-surface-2 text-foreground hover:bg-surface-3"
                    >
                      {t("keep_cooldown")}
                    </button>
                  </div>
                </div>
              ) : (
                <SubtleButton onClick={handleOverride} className="py-2">
                  <Play size={12} className="inline mr-1" />
                  Resume Trading (Not Recommended)
                </SubtleButton>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loss streak indicator */}
      {settings.enabled && !settings.isInCooldown && (
        <div
          className={`p-3 rounded-lg ${
            streakHot ? "bg-warning/10 border border-warning/30" : "bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame
                size={14}
                className={streakHot ? toneInk("warning") : "text-muted-foreground"}
              />
              <span className="text-xs text-muted-foreground">
                {t("consecutive_losses")}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {settings.consecutiveLosses} / {settings.triggerAfterLosses}
            </span>
          </div>
          <Pips
            total={settings.triggerAfterLosses}
            filled={settings.consecutiveLosses}
            tone={streakTone}
          />
          {streakHot && (
            <div className="text-[10px] mt-2 text-foreground">
              {settings.triggerAfterLosses - settings.consecutiveLosses}{" "}
              {t("more_loss_es_will_trigger_cooldown")}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="space-y-3">
        {/* Trigger after losses */}
        <div>
          <FieldLabel>{t("trigger_after_losses")}</FieldLabel>
          <OptionRow
            className="mt-1"
            value={settings.triggerAfterLosses}
            onSelect={(triggerAfterLosses) => onChange({ triggerAfterLosses })}
            options={LOSS_TRIGGERS.map((num) => ({
              value: num,
              label: t("losses", { num: String(num) }),
            }))}
          />
        </div>

        {/* Cooldown duration */}
        <div>
          <FieldLabel>{tCommon("cooldown_duration")}</FieldLabel>
          <OptionRow
            className="mt-1"
            value={settings.cooldownMinutes}
            onSelect={(cooldownMinutes) => onChange({ cooldownMinutes })}
            options={COOLDOWN_MINUTES.map((mins) => ({
              value: mins,
              label: `${mins}m`,
            }))}
          />
        </div>

        {/* Allow override toggle */}
        <ToggleRow
          icon={<Shield size={14} />}
          label={t("allow_override")}
          checked={settings.allowOverride}
          onChange={(allowOverride) => onChange({ allowOverride })}
        />
      </div>

      {/* Info */}
      <NoticeStrip tone="info" dense icon={<Shield size={12} />}>
        {t("cooldowns_prevent_revenge_trading") + " " + t("take_break_to_analyze_and_reset")}
      </NoticeStrip>
    </>
  );

  // Always expanded mode - just render the settings content without wrapper
  // Used when embedded in SettingSection which provides its own header and toggle
  if (alwaysExpanded) {
    return <div className="space-y-4">{body}</div>;
  }

  // Compact view when in cooldown
  if (compact && !isExpanded && settings.isInCooldown) {
    return (
      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={16} className={toneInk("warning")} />
            <span className="text-sm font-medium text-foreground">
              {tCommon("cooldown_active")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-foreground">
              {formatTime(timeRemaining)}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="p-1 rounded hover:bg-surface-3"
            >
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <Meter percent={progress * 100} tone="warning" height="h-1" className="mt-2" />
      </div>
    );
  }

  // Compact view when not in cooldown
  if (compact && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
          settings.enabled && streakHot
            ? "bg-warning/10 border-warning/30"
            : "bg-surface-2 border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <Timer
            size={14}
            className={settings.enabled ? toneInk("warning") : "text-muted-foreground"}
          />
          <span className="text-xs font-medium text-foreground">
            {t("trade_cooldown")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {settings.enabled && (
            <Pips
              total={settings.triggerAfterLosses}
              filled={settings.consecutiveLosses}
              tone="warning"
              pipClassName="w-1.5 h-1.5"
            />
          )}
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <Panel
      className={settings.isInCooldown ? "border-warning/30" : undefined}
      header={
        <>
          <PanelTitle
            icon={<Timer size={16} />}
            tone={settings.isInCooldown ? "warning" : "neutral"}
          >
            {t("trade_cooldown")}
          </PanelTitle>
          <div className="flex items-center gap-2">
            <Toggle
              checked={settings.enabled}
              onChange={(enabled) => onChange({ enabled })}
              ariaLabel={t("trade_cooldown")}
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

export default TradeCooldown;
