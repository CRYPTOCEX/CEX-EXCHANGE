/**
 * Notification Settings Component
 *
 * Full settings panel for notifications including:
 * - Master enable/disable
 * - Toast position and behavior
 * - Push notification settings
 * - Sound settings
 * - Quiet hours
 * - Per-type preferences
 */

"use client";

import React, { memo, useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Moon,
  Settings,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Zap,
  BellRing,
} from "lucide-react";
import type { NotificationType, SoundType } from "../types";
import { NOTIFICATION_TYPE_INFO } from "../types";
import {
  useTradingNotificationsStore,
  SoundManager,
  requestNotificationPermission,
} from "../core";
import { useTranslations } from "next-intl";
// ============================================================================
// OVERLAY THEME (inline to avoid chart-engine dependency)
// ============================================================================

interface OverlayTheme {
  bg: string;
  bgSubtle: string;
  bgMuted: string;
  bgCard: string;
  bgInput: string;
  bgHover: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  hoverBg: string;
  activeBg: string;
  backdrop: string;
}

function getOverlayTheme(darkMode: boolean): OverlayTheme {
  if (darkMode) {
    return {
      bg: 'bg-surface-2',
      bgSubtle: 'bg-muted/50',
      bgMuted: 'bg-muted/30',
      bgCard: 'bg-muted',
      bgInput: 'bg-muted',
      bgHover: 'bg-muted',
      border: 'border-border/50',
      borderSubtle: 'border-border/30',
      borderStrong: 'border-border-strong',
      text: 'text-white',
      textSecondary: 'text-muted-foreground',
      textMuted: 'text-subtle-foreground',
      textDim: 'text-muted-foreground',
      hoverBg: 'hover:bg-muted/50',
      activeBg: 'bg-muted',
      backdrop: 'bg-overlay/60',
    };
  }

  return {
    bg: 'bg-card',
    bgSubtle: 'bg-muted',
    bgMuted: 'bg-muted/50',
    bgCard: 'bg-muted',
    bgInput: 'bg-muted',
    bgHover: 'bg-muted',
    border: 'border-border/50',
    borderSubtle: 'border-border/50',
    borderStrong: 'border-border-strong',
    text: 'text-foreground',
    textSecondary: 'text-subtle-foreground',
    textMuted: 'text-muted-foreground',
    textDim: 'text-muted-foreground',
    hoverBg: 'hover:bg-muted',
    activeBg: 'bg-muted',
    backdrop: 'bg-overlay/40',
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

const ToggleSwitch = memo(function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",
}: ToggleSwitchProps) {
  const sizeClasses = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const dotSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const dotTranslate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative rounded-full transition-colors ${sizeClasses} ${
        checked ? "bg-primary" : "bg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 ${dotSize} rounded-full bg-card transition-transform ${
          checked ? dotTranslate : "translate-x-0"
        }`}
      />
    </button>
  );
});

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  darkMode?: boolean;
}

const Slider = memo(function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  darkMode = true,
}: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
        darkMode ? "bg-muted" : "bg-muted"
      } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer`}
    />
  );
});

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  darkMode: boolean;
  defaultExpanded?: boolean;
}

const Section = memo(function Section({
  title,
  description,
  children,
  darkMode,
  defaultExpanded = true,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const theme = {
    border: darkMode ? "border-border/50" : "border-border/50",
    text: darkMode ? "text-white" : "text-foreground",
    textMuted: darkMode ? "text-muted-foreground" : "text-subtle-foreground",
    textSecondary: darkMode ? "text-muted-foreground" : "text-subtle-foreground",
    bg: darkMode ? "bg-surface-2/50" : "bg-muted",
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${theme.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${theme.bg} hover:opacity-80 transition-opacity`}
      >
        <div>
          <h3 className={`text-sm font-medium ${theme.text}`}>{title}</h3>
          {description && (
            <p className={`text-xs ${theme.textSecondary} mt-0.5`}>{description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={16} className={theme.textSecondary} />
        ) : (
          <ChevronRight size={16} className={theme.textSecondary} />
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationSettings = memo(function NotificationSettings({
  isOpen,
  onClose,
  darkMode = true,
}: NotificationSettingsProps) {
  const t = useTranslations("components_binary");
  const tCommon = useTranslations("common");
  const settings = useTradingNotificationsStore((state) => state.settings);
  const updateSettings = useTradingNotificationsStore(
    (state) => state.updateSettings
  );
  const resetSettings = useTradingNotificationsStore(
    (state) => state.resetSettings
  );

  const [testingSounds, setTestingSounds] = useState(false);

  // Use shared theme from overlay-theme.ts
  const theme = getOverlayTheme(darkMode);

  // Handlers
  const handleRequestPush = useCallback(async () => {
    const permission = await requestNotificationPermission();
    updateSettings({
      pushPermission: permission,
      pushEnabled: permission === "granted",
    });
  }, [updateSettings]);

  const handleTestAllSounds = useCallback(async () => {
    setTestingSounds(true);
    await SoundManager.testAllSounds();
    setTestingSounds(false);
  }, []);

  const handleTestSound = useCallback(async (type: SoundType) => {
    await SoundManager.testSound(type);
  }, []);

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
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${
              darkMode ? "bg-overlay/70" : "bg-overlay/40"
            } backdrop-blur-sm`}
            onClick={onClose}
          />

          {/* Panel */}
          <m.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className={`relative ml-auto h-full w-full max-w-md flex flex-col ${theme.bg} border-l ${theme.border} shadow-2xl`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${theme.border}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    darkMode ? "bg-primary/10" : "bg-primary/10"
                  }`}
                >
                  <Settings size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${theme.text}`}>
                    {tCommon("notification_settings")}
                  </h2>
                  <p className={`text-chart-sm ${theme.textMuted}`}>
                    {t("customize_alerts_and_sounds")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${theme.hoverBg} ${theme.textSecondary} transition-colors`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Master Toggle */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg ${
                  darkMode ? "bg-surface-2" : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  {settings.enabled ? (
                    <Bell size={20} className="text-primary" />
                  ) : (
                    <BellOff size={20} className={theme.textSecondary} />
                  )}
                  <div>
                    <h3 className={`text-sm font-medium ${theme.text}`}>
                      Notifications
                    </h3>
                    <p className={`text-xs ${theme.textSecondary}`}>
                      {settings.enabled ? tCommon("enabled") : tCommon("disabled")}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.enabled}
                  onChange={(enabled) => updateSettings({ enabled })}
                />
              </div>

              {/* Toast Settings */}
              <Section title={tCommon("toast_notifications")} darkMode={darkMode}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme.text}`}>{tCommon("show_toasts")}</span>
                    <ToggleSwitch
                      checked={settings.toastEnabled}
                      onChange={(toastEnabled) => updateSettings({ toastEnabled })}
                      size="sm"
                    />
                  </div>

                  <div>
                    <label className={`text-xs ${theme.textSecondary} block mb-2`}>
                      Position
                    </label>
                    <select
                      value={settings.toastPosition}
                      onChange={(e) =>
                        updateSettings({
                          toastPosition: e.target.value as typeof settings.toastPosition,
                        })
                      }
                      className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.bgInput} ${theme.text}`}
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
                    <label className={`text-xs ${theme.textSecondary} block mb-2`}>
                      {tCommon("duration")}: {(settings.toastDuration / 1000).toFixed(1)}s
                    </label>
                    <Slider
                      value={settings.toastDuration / 1000}
                      onChange={(val) =>
                        updateSettings({ toastDuration: val * 1000 })
                      }
                      min={2}
                      max={15}
                      step={0.5}
                      darkMode={darkMode}
                    />
                  </div>

                  <div>
                    <label className={`text-xs ${theme.textSecondary} block mb-2`}>
                      {tCommon("max_toasts")}: {settings.maxToasts}
                    </label>
                    <Slider
                      value={settings.maxToasts}
                      onChange={(val) => updateSettings({ maxToasts: Math.round(val) })}
                      min={1}
                      max={10}
                      step={1}
                      darkMode={darkMode}
                    />
                  </div>
                </div>
              </Section>

              {/* Sound Settings */}
              <Section title="Sound" description={t("audio_feedback")} darkMode={darkMode}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.sound.enabled ? (
                        <Volume2 size={16} className="text-primary" />
                      ) : (
                        <VolumeX size={16} className={theme.textSecondary} />
                      )}
                      <span className={`text-sm ${theme.text}`}>{tCommon("sound_effects")}</span>
                    </div>
                    <ToggleSwitch
                      checked={settings.sound.enabled}
                      onChange={(enabled) =>
                        updateSettings({
                          sound: { ...settings.sound, enabled },
                        })
                      }
                      size="sm"
                    />
                  </div>

                  {settings.sound.enabled && (
                    <>
                      <div>
                        <label className={`text-xs ${theme.textSecondary} block mb-2`}>
                          {tCommon("volume")}: {Math.round(settings.sound.volume * 100)}%
                        </label>
                        <Slider
                          value={settings.sound.volume}
                          onChange={(volume) => {
                            updateSettings({
                              sound: { ...settings.sound, volume },
                            });
                            SoundManager.setConfig({ volume });
                          }}
                          min={0}
                          max={1}
                          step={0.1}
                          darkMode={darkMode}
                        />
                      </div>

                      <div className="space-y-2">
                        {(Object.keys(settings.sound.sounds) as SoundType[]).map(
                          (soundType) => (
                            <div
                              key={soundType}
                              className="flex items-center justify-between"
                            >
                              <span className={`text-xs ${theme.textSecondary} capitalize`}>
                                {soundType.replace(/_/g, " ")}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTestSound(soundType)}
                                  className={`p-1 rounded ${theme.hoverBg} ${theme.textSecondary}`}
                                  title={tCommon("test_sound")}
                                >
                                  <Play size={12} />
                                </button>
                                <ToggleSwitch
                                  checked={settings.sound.sounds[soundType]}
                                  onChange={(enabled) =>
                                    updateSettings({
                                      sound: {
                                        ...settings.sound,
                                        sounds: {
                                          ...settings.sound.sounds,
                                          [soundType]: enabled,
                                        },
                                      },
                                    })
                                  }
                                  size="sm"
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <button
                        onClick={handleTestAllSounds}
                        disabled={testingSounds}
                        className={`w-full py-2 text-xs font-medium rounded-lg ${
                          darkMode
                            ? "bg-muted text-white hover:bg-muted"
                            : "bg-muted text-foreground hover:bg-muted"
                        } transition-colors disabled:opacity-50`}
                      >
                        {testingSounds ? `${t("playing")}…` : t("test_all_sounds")}
                      </button>
                    </>
                  )}
                </div>
              </Section>

              {/* Push Notifications */}
              <Section
                title={tCommon("push_notifications")}
                description={tCommon("browser_notifications")}
                darkMode={darkMode}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme.text}`}>{tCommon("enable_push")}</span>
                    <ToggleSwitch
                      checked={settings.pushEnabled}
                      onChange={(pushEnabled) => updateSettings({ pushEnabled })}
                      disabled={settings.pushPermission !== "granted"}
                      size="sm"
                    />
                  </div>

                  {settings.pushPermission !== "granted" && (
                    <div className={`p-3 rounded-lg ${darkMode ? "bg-muted" : "bg-muted"}`}>
                      <p className={`text-xs ${theme.textSecondary} mb-2`}>
                        {settings.pushPermission === "denied"
                          ? tCommon("push_notifications_are_blocked_enable_them")
                          : tCommon("allow_push_notifications_to_receive_alerts")}
                      </p>
                      {settings.pushPermission !== "denied" && (
                        <button
                          onClick={handleRequestPush}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary transition-colors"
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
                darkMode={darkMode}
                defaultExpanded={false}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon size={16} className={theme.textSecondary} />
                      <span className={`text-sm ${theme.text}`}>{tCommon("enable_quiet_hours")}</span>
                    </div>
                    <ToggleSwitch
                      checked={settings.quietHoursEnabled}
                      onChange={(quietHoursEnabled) =>
                        updateSettings({ quietHoursEnabled })
                      }
                      size="sm"
                    />
                  </div>

                  {settings.quietHoursEnabled && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className={`text-xs ${theme.textSecondary} block mb-1`}>
                          Start
                        </label>
                        <input
                          type="time"
                          value={settings.quietHoursStart}
                          onChange={(e) =>
                            updateSettings({ quietHoursStart: e.target.value })
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.bgInput} ${theme.text}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className={`text-xs ${theme.textSecondary} block mb-1`}>
                          End
                        </label>
                        <input
                          type="time"
                          value={settings.quietHoursEnd}
                          onChange={(e) =>
                            updateSettings({ quietHoursEnd: e.target.value })
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.bgInput} ${theme.text}`}
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
                darkMode={darkMode}
                defaultExpanded={false}
              >
                <div className="space-y-3">
                  {(Object.keys(settings.typePreferences) as NotificationType[]).map(
                    (type) => {
                      const Icon = typeIcons[type] || Bell;
                      const typeInfo = NOTIFICATION_TYPE_INFO[type];
                      const prefs = settings.typePreferences[type];

                      return (
                        <div
                          key={type}
                          className={`p-3 rounded-lg ${
                            darkMode ? "bg-surface-2/50" : "bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {/* Was `text-${typeInfo.color}-500`, a class name
                                  assembled at runtime. Tailwind scans source
                                  TEXT, so that class is never emitted and the
                                  icon has been painting inherited colour all
                                  along. Neutral by design: eleven adjacent rows
                                  cannot each carry a hue and still mean
                                  anything, and the icon already names the type.
                                  Matches the same fix in
                                  binary/components/settings/tabs/notifications-tab-settings.tsx. */}
                              <Icon size={14} className="text-muted-foreground" />
                              <span className={`text-xs font-medium ${theme.text}`}>
                                {typeInfo?.label || type}
                              </span>
                            </div>
                            <ToggleSwitch
                              checked={prefs.enabled}
                              onChange={(enabled) =>
                                handleUpdateTypePreference(type, "enabled", enabled)
                              }
                              size="sm"
                            />
                          </div>
                          {prefs.enabled && (
                            <div className="flex items-center gap-4 mt-2 text-chart-xs">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={prefs.showToast}
                                  onChange={(e) =>
                                    handleUpdateTypePreference(
                                      type,
                                      "showToast",
                                      e.target.checked
                                    )
                                  }
                                  className="w-3 h-3"
                                />
                                <span className={theme.textSecondary}>Toast</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={prefs.playSound}
                                  onChange={(e) =>
                                    handleUpdateTypePreference(
                                      type,
                                      "playSound",
                                      e.target.checked
                                    )
                                  }
                                  className="w-3 h-3"
                                />
                                <span className={theme.textSecondary}>Sound</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={prefs.pushNotification}
                                  onChange={(e) =>
                                    handleUpdateTypePreference(
                                      type,
                                      "pushNotification",
                                      e.target.checked
                                    )
                                  }
                                  className="w-3 h-3"
                                />
                                <span className={theme.textSecondary}>Push</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className={`px-4 py-3 border-t ${theme.border}`}>
              <button
                onClick={resetSettings}
                className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg ${
                  darkMode
                    ? "bg-muted text-white hover:bg-muted"
                    : "bg-muted text-foreground hover:bg-muted"
                } transition-colors`}
              >
                <RotateCcw size={14} />
                {tCommon("reset_to_defaults")}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

export default NotificationSettings;
