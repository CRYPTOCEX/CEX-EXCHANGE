"use client";

/**
 * Notifications Tab Settings Component
 *
 * Complete notification settings including:
 * - Toast notifications
 * - Push notifications
 * - Quiet hours
 * - Per-type preferences
 *
 * Bug fixed here: the per-type icon was painted with
 * `text-${typeInfo.color}-500`, a class Tailwind v4 constructs at runtime and
 * therefore never compiles — the eleven notification hues have been rendering
 * as inherited colour for as long as v4 has been in the build. They stay
 * neutral: eleven adjacent rows in a settings list cannot each carry a
 * different hue and still mean anything, and the icon already names the type.
 */

import { memo, useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Moon,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Zap,
  BellRing,
  X,
} from "lucide-react";
import type { NotificationType } from "@/components/binary/notifications";
import {
  NOTIFICATION_TYPE_INFO,
  useTradingNotificationsStore,
  requestNotificationPermission,
} from "@/components/binary/notifications";
import { RangeSlider, Toggle } from "../../risk-management/risk-ui";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationsTabSettingsProps {
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const Section = memo(function Section({
  title,
  description,
  children,
  defaultExpanded = true,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:opacity-80 transition-opacity"
      >
        <div className="text-left">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/** Checkbox + label used for the per-type toast/sound/push trio. */
function CheckOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3 h-3 accent-primary"
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationsTabSettings = memo(function NotificationsTabSettings(
  _props: NotificationsTabSettingsProps
) {
  const tCommon = useTranslations("common");
  const settings = useTradingNotificationsStore((state) => state.settings);
  const updateSettings = useTradingNotificationsStore((state) => state.updateSettings);
  const resetSettings = useTradingNotificationsStore((state) => state.resetSettings);

  // Handlers
  const handleRequestPush = useCallback(async () => {
    const permission = await requestNotificationPermission();
    updateSettings({
      pushPermission: permission,
      pushEnabled: permission === "granted",
    });
  }, [updateSettings]);

  const handleUpdateTypePreference = useCallback(
    (type: NotificationType, key: string, value: boolean) => {
      updateSettings({
        typePreferences: {
          ...settings.typePreferences,
          [type]: {
            ...settings.typePreferences[type],
            [key]: value,
          },
        },
      });
    },
    [settings.typePreferences, updateSettings]
  );

  // Type icons
  const typeIcons: Record<NotificationType, React.ElementType> = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    info: Info,
    trade_win: TrendingUp,
    trade_loss: TrendingDown,
    order_placed: CheckCircle,
    order_cancelled: X,
    alert_triggered: BellRing,
    price_alert: Bell,
    signal: Zap,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell size={20} className="text-primary" />
          ) : (
            <BellOff size={20} className="text-muted-foreground" />
          )}
          <div>
            <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {settings.enabled ? tCommon("enabled") : tCommon("disabled")}
            </p>
          </div>
        </div>
        <Toggle
          checked={settings.enabled}
          onChange={(enabled) => updateSettings({ enabled })}
          ariaLabel="Notifications"
        />
      </div>

      {/* Toast Settings */}
      <Section title={tCommon("toast_notifications")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{tCommon("show_toasts")}</span>
            <Toggle
              size="sm"
              checked={settings.toastEnabled}
              onChange={(toastEnabled) => updateSettings({ toastEnabled })}
              ariaLabel={tCommon("show_toasts")}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2" htmlFor="toast-position">
              Position
            </label>
            <select
              id="toast-position"
              value={settings.toastPosition}
              onChange={(e) =>
                updateSettings({
                  toastPosition: e.target.value as typeof settings.toastPosition,
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-3 text-foreground"
            >
              <option value="top-right">{tCommon("top_right")}</option>
              <option value="top-left">{tCommon("top_left")}</option>
              <option value="top-center">{tCommon("top_center")}</option>
              <option value="bottom-right">{tCommon("bottom_right")}</option>
              <option value="bottom-left">{tCommon("bottom_left")}</option>
              <option value="bottom-center">{tCommon("bottom_center")}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              {tCommon("duration")} {(settings.toastDuration / 1000).toFixed(1)}s
            </label>
            <RangeSlider
              value={settings.toastDuration / 1000}
              onChange={(val) => updateSettings({ toastDuration: val * 1000 })}
              min={2}
              max={15}
              step={0.5}
              ariaLabel={tCommon("duration")}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              {tCommon("max_toasts")}: {settings.maxToasts}
            </label>
            <RangeSlider
              value={settings.maxToasts}
              onChange={(val) => updateSettings({ maxToasts: Math.round(val) })}
              min={1}
              max={10}
              step={1}
              ariaLabel={`${tCommon("max_toasts")}:`}
            />
          </div>
        </div>
      </Section>

      {/* Push Notifications */}
      <Section
        title={tCommon("push_notifications")}
        description={tCommon("browser_notifications")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{tCommon("enable_push")}</span>
            <Toggle
              size="sm"
              checked={settings.pushEnabled}
              onChange={(pushEnabled) => updateSettings({ pushEnabled })}
              ariaLabel={tCommon("enable_push")}
              disabled={settings.pushPermission !== "granted"}
            />
          </div>

          {settings.pushPermission !== "granted" && (
            <div className="p-3 rounded-lg bg-surface-2">
              <p className="text-xs text-muted-foreground mb-2">
                {settings.pushPermission === "denied"
                  ? tCommon("push_notifications_are_blocked_enable_them")
                  : tCommon("allow_push_notifications_to_receive_alerts")}
              </p>
              {settings.pushPermission !== "denied" && (
                <button
                  type="button"
                  onClick={handleRequestPush}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {tCommon("enable_push_notifications")}
                </button>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Quiet Hours */}
      <Section
        title={tCommon("quiet_hours")}
        description={tCommon("pause_notifications")}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground">{tCommon("enable_quiet_hours")}</span>
            </div>
            <Toggle
              size="sm"
              checked={settings.quietHoursEnabled}
              onChange={(quietHoursEnabled) => updateSettings({ quietHoursEnabled })}
              ariaLabel={tCommon("enable_quiet_hours")}
            />
          </div>

          {settings.quietHoursEnabled && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="quiet-start">
                  Start
                </label>
                <input
                  id="quiet-start"
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-3 text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="quiet-end">
                  End
                </label>
                <input
                  id="quiet-end"
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-3 text-foreground"
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Type Preferences */}
      <Section
        title={tCommon("notification_types")}
        description={tCommon("per_type_settings")}
        defaultExpanded={false}
      >
        <div className="space-y-3">
          {(Object.keys(settings.typePreferences) as NotificationType[]).map((type) => {
            const Icon = typeIcons[type] || Bell;
            const typeInfo = NOTIFICATION_TYPE_INFO[type];
            const prefs = settings.typePreferences[type];

            return (
              <div key={type} className="p-3 rounded-lg bg-surface-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      {typeInfo?.label || type}
                    </span>
                  </div>
                  <Toggle
                    size="sm"
                    checked={prefs.enabled}
                    onChange={(enabled) =>
                      handleUpdateTypePreference(type, "enabled", enabled)
                    }
                    ariaLabel={typeInfo?.label || type}
                  />
                </div>
                {prefs.enabled && (
                  <div className="flex items-center gap-4 mt-2 text-[10px]">
                    <CheckOption
                      label="Toast"
                      checked={prefs.showToast}
                      onChange={(v) => handleUpdateTypePreference(type, "showToast", v)}
                    />
                    <CheckOption
                      label="Sound"
                      checked={prefs.playSound}
                      onChange={(v) => handleUpdateTypePreference(type, "playSound", v)}
                    />
                    <CheckOption
                      label="Push"
                      checked={prefs.pushNotification}
                      onChange={(v) =>
                        handleUpdateTypePreference(type, "pushNotification", v)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Reset Button */}
      <button
        type="button"
        onClick={resetSettings}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg bg-surface-2 text-foreground hover:bg-surface-3 transition-colors"
      >
        <RotateCcw size={14} />
        {tCommon("reset_to_defaults")}
      </button>
    </div>
  );
});

export default NotificationsTabSettings;
