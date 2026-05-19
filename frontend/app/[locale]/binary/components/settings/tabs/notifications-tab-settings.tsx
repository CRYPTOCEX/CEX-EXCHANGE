"use client";

/**
 * Notifications Tab Settings Component
 *
 * Complete notification settings including:
 * - Toast notifications
 * - Push notifications
 * - Quiet hours
 * - Per-type preferences
 */

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Moon,
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
  X,
} from "lucide-react";
import type { NotificationType, SoundType } from "@/components/binary/notifications";
import {
  NOTIFICATION_TYPE_INFO,
  useTradingNotificationsStore,
  SoundManager,
  requestNotificationPermission,
} from "@/components/binary/notifications";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationsTabSettingsProps {
  darkMode: boolean;
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
        checked ? "bg-blue-500" : "bg-zinc-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 ${dotSize} rounded-full bg-white transition-transform ${
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
        darkMode ? "bg-zinc-700" : "bg-gray-200"
      } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer`}
    />
  );
});

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
    border: darkMode ? "border-zinc-800" : "border-gray-200",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-500",
    bg: darkMode ? "bg-zinc-900/50" : "bg-gray-50",
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
            <p className={`text-xs ${theme.textMuted} mt-0.5`}>{description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={16} className={theme.textMuted} />
        ) : (
          <ChevronRight size={16} className={theme.textMuted} />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationsTabSettings = memo(function NotificationsTabSettings({
  darkMode,
}: NotificationsTabSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const settings = useTradingNotificationsStore((state) => state.settings);
  const updateSettings = useTradingNotificationsStore((state) => state.updateSettings);
  const resetSettings = useTradingNotificationsStore((state) => state.resetSettings);

  const [testingSounds, setTestingSounds] = useState(false);

  // Theme
  const theme = {
    border: darkMode ? "border-zinc-800" : "border-gray-200",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-500",
    textSubtle: darkMode ? "text-zinc-500" : "text-gray-400",
    inputBg: darkMode ? "bg-zinc-900" : "bg-gray-100",
    hoverBg: darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100",
  };

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
    <div className="p-4 space-y-4">
      {/* Master Toggle */}
      <div
        className={`flex items-center justify-between p-4 rounded-lg ${
          darkMode ? "bg-zinc-900" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell size={20} className="text-blue-500" />
          ) : (
            <BellOff size={20} className={theme.textMuted} />
          )}
          <div>
            <h3 className={`text-sm font-medium ${theme.text}`}>Notifications</h3>
            <p className={`text-xs ${theme.textMuted}`}>
              {settings.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        <ToggleSwitch
          checked={settings.enabled}
          onChange={(enabled) => updateSettings({ enabled })}
        />
      </div>

      {/* Toast Settings */}
      <Section title={t("toast_notifications")} darkMode={darkMode}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme.text}`}>{t("show_toasts")}</span>
            <ToggleSwitch
              checked={settings.toastEnabled}
              onChange={(toastEnabled) => updateSettings({ toastEnabled })}
              size="sm"
            />
          </div>

          <div>
            <label className={`text-xs ${theme.textMuted} block mb-2`}>Position</label>
            <select
              value={settings.toastPosition}
              onChange={(e) =>
                updateSettings({
                  toastPosition: e.target.value as typeof settings.toastPosition,
                })
              }
              className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text}`}
            >
              <option value="top-right">{t("top_right")}</option>
              <option value="top-left">{tCommon("top_left")}</option>
              <option value="top-center">{t("top_center")}</option>
              <option value="bottom-right">{tCommon("bottom_right")}</option>
              <option value="bottom-left">{t("bottom_left")}</option>
              <option value="bottom-center">{t("bottom_center")}</option>
            </select>
          </div>

          <div>
            <label className={`text-xs ${theme.textMuted} block mb-2`}>
              {tCommon("duration")} {(settings.toastDuration / 1000).toFixed(1)}s
            </label>
            <Slider
              value={settings.toastDuration / 1000}
              onChange={(val) => updateSettings({ toastDuration: val * 1000 })}
              min={2}
              max={15}
              step={0.5}
              darkMode={darkMode}
            />
          </div>

          <div>
            <label className={`text-xs ${theme.textMuted} block mb-2`}>
              {t("max_toasts")} {settings.maxToasts}
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

      {/* Push Notifications */}
      <Section
        title={tCommon("push_notifications")}
        description={t("browser_notifications")}
        darkMode={darkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme.text}`}>{t("enable_push")}</span>
            <ToggleSwitch
              checked={settings.pushEnabled}
              onChange={(pushEnabled) => updateSettings({ pushEnabled })}
              disabled={settings.pushPermission !== "granted"}
              size="sm"
            />
          </div>

          {settings.pushPermission !== "granted" && (
            <div className={`p-3 rounded-lg ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
              <p className={`text-xs ${theme.textMuted} mb-2`}>
                {settings.pushPermission === "denied"
                  ? "Push notifications are blocked. Enable them in your browser settings."
                  : "Allow push notifications to receive alerts when the tab is not active."}
              </p>
              {settings.pushPermission !== "denied" && (
                <button
                  onClick={handleRequestPush}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  {t("enable_push_notifications")}
                </button>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Quiet Hours */}
      <Section
        title={t("quiet_hours")}
        description={t("pause_notifications")}
        darkMode={darkMode}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon size={16} className={theme.textMuted} />
              <span className={`text-sm ${theme.text}`}>{t("enable_quiet_hours")}</span>
            </div>
            <ToggleSwitch
              checked={settings.quietHoursEnabled}
              onChange={(quietHoursEnabled) => updateSettings({ quietHoursEnabled })}
              size="sm"
            />
          </div>

          {settings.quietHoursEnabled && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className={`text-xs ${theme.textMuted} block mb-1`}>Start</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text}`}
                />
              </div>
              <div className="flex-1">
                <label className={`text-xs ${theme.textMuted} block mb-1`}>End</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${theme.border} ${theme.inputBg} ${theme.text}`}
                />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Type Preferences */}
      <Section
        title={t("notification_types")}
        description={t("per_type_settings")}
        darkMode={darkMode}
        defaultExpanded={false}
      >
        <div className="space-y-3">
          {(Object.keys(settings.typePreferences) as NotificationType[]).map((type) => {
            const Icon = typeIcons[type] || Bell;
            const typeInfo = NOTIFICATION_TYPE_INFO[type];
            const prefs = settings.typePreferences[type];

            return (
              <div
                key={type}
                className={`p-3 rounded-lg ${darkMode ? "bg-zinc-900/50" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={`text-${typeInfo?.color || "gray"}-500`} />
                    <span className={`text-xs font-medium ${theme.text}`}>
                      {typeInfo?.label || type}
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={prefs.enabled}
                    onChange={(enabled) => handleUpdateTypePreference(type, "enabled", enabled)}
                    size="sm"
                  />
                </div>
                {prefs.enabled && (
                  <div className="flex items-center gap-4 mt-2 text-[10px]">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={prefs.showToast}
                        onChange={(e) =>
                          handleUpdateTypePreference(type, "showToast", e.target.checked)
                        }
                        className="w-3 h-3"
                      />
                      <span className={theme.textMuted}>Toast</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={prefs.playSound}
                        onChange={(e) =>
                          handleUpdateTypePreference(type, "playSound", e.target.checked)
                        }
                        className="w-3 h-3"
                      />
                      <span className={theme.textMuted}>Sound</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={prefs.pushNotification}
                        onChange={(e) =>
                          handleUpdateTypePreference(type, "pushNotification", e.target.checked)
                        }
                        className="w-3 h-3"
                      />
                      <span className={theme.textMuted}>Push</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Reset Button */}
      <button
        onClick={resetSettings}
        className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-lg ${
          darkMode
            ? "bg-zinc-800 text-white hover:bg-zinc-700"
            : "bg-gray-200 text-gray-900 hover:bg-gray-300"
        } transition-colors`}
      >
        <RotateCcw size={14} />
        {t("reset_to_defaults")}
      </button>
    </div>
  );
});

export default NotificationsTabSettings;
