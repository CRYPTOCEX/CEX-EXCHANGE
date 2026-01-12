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
import { motion, AnimatePresence } from "framer-motion";
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
      bg: 'bg-zinc-900',
      bgSubtle: 'bg-zinc-800/50',
      bgMuted: 'bg-zinc-800/30',
      bgCard: 'bg-zinc-800',
      bgInput: 'bg-zinc-700',
      bgHover: 'bg-zinc-700',
      border: 'border-zinc-800/50',
      borderSubtle: 'border-zinc-800/30',
      borderStrong: 'border-zinc-700',
      text: 'text-white',
      textSecondary: 'text-zinc-400',
      textMuted: 'text-zinc-500',
      textDim: 'text-zinc-600',
      hoverBg: 'hover:bg-zinc-700/50',
      activeBg: 'bg-zinc-700',
      backdrop: 'bg-black/60',
    };
  }

  return {
    bg: 'bg-white',
    bgSubtle: 'bg-gray-50',
    bgMuted: 'bg-gray-50/50',
    bgCard: 'bg-gray-100',
    bgInput: 'bg-gray-100',
    bgHover: 'bg-gray-100',
    border: 'border-gray-200/50',
    borderSubtle: 'border-gray-100/50',
    borderStrong: 'border-gray-300',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    textMuted: 'text-gray-400',
    textDim: 'text-gray-300',
    hoverBg: 'hover:bg-gray-100',
    activeBg: 'bg-gray-100',
    backdrop: 'bg-black/40',
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
    border: darkMode ? "border-zinc-800/50" : "border-gray-200/50",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-500",
    textSecondary: darkMode ? "text-zinc-400" : "text-gray-500",
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

export const NotificationSettings = memo(function NotificationSettings({
  isOpen,
  onClose,
  darkMode = true,
}: NotificationSettingsProps) {
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${
              darkMode ? "bg-black/70" : "bg-black/40"
            } backdrop-blur-sm`}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
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
                    darkMode ? "bg-blue-500/10" : "bg-blue-50"
                  }`}
                >
                  <Settings size={18} className="text-blue-500" />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${theme.text}`}>
                    Notification Settings
                  </h2>
                  <p className={`text-chart-sm ${theme.textMuted}`}>
                    Customize alerts and sounds
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
                  darkMode ? "bg-zinc-900" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {settings.enabled ? (
                    <Bell size={20} className="text-blue-500" />
                  ) : (
                    <BellOff size={20} className={theme.textSecondary} />
                  )}
                  <div>
                    <h3 className={`text-sm font-medium ${theme.text}`}>
                      Notifications
                    </h3>
                    <p className={`text-xs ${theme.textSecondary}`}>
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
              <Section title="Toast Notifications" darkMode={darkMode}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme.text}`}>Show toasts</span>
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
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-xs ${theme.textSecondary} block mb-2`}>
                      Duration: {(settings.toastDuration / 1000).toFixed(1)}s
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
                      Max toasts: {settings.maxToasts}
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
              <Section title="Sound" description="Audio feedback" darkMode={darkMode}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.sound.enabled ? (
                        <Volume2 size={16} className="text-blue-500" />
                      ) : (
                        <VolumeX size={16} className={theme.textSecondary} />
                      )}
                      <span className={`text-sm ${theme.text}`}>Sound effects</span>
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
                          Volume: {Math.round(settings.sound.volume * 100)}%
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
                                  title="Test sound"
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
                            ? "bg-zinc-800 text-white hover:bg-zinc-700"
                            : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                        } transition-colors disabled:opacity-50`}
                      >
                        {testingSounds ? "Playing..." : "Test All Sounds"}
                      </button>
                    </>
                  )}
                </div>
              </Section>

              {/* Push Notifications */}
              <Section
                title="Push Notifications"
                description="Browser notifications"
                darkMode={darkMode}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme.text}`}>Enable push</span>
                    <ToggleSwitch
                      checked={settings.pushEnabled}
                      onChange={(pushEnabled) => updateSettings({ pushEnabled })}
                      disabled={settings.pushPermission !== "granted"}
                      size="sm"
                    />
                  </div>

                  {settings.pushPermission !== "granted" && (
                    <div className={`p-3 rounded-lg ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
                      <p className={`text-xs ${theme.textSecondary} mb-2`}>
                        {settings.pushPermission === "denied"
                          ? "Push notifications are blocked. Enable them in your browser settings."
                          : "Allow push notifications to receive alerts when the tab is not active."}
                      </p>
                      {settings.pushPermission !== "denied" && (
                        <button
                          onClick={handleRequestPush}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Enable Push Notifications
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Section>

              {/* Quiet Hours */}
              <Section
                title="Quiet Hours"
                description="Pause notifications"
                darkMode={darkMode}
                defaultExpanded={false}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon size={16} className={theme.textSecondary} />
                      <span className={`text-sm ${theme.text}`}>Enable quiet hours</span>
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
                title="Notification Types"
                description="Per-type settings"
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
                            darkMode ? "bg-zinc-900/50" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon
                                size={14}
                                className={`text-${typeInfo?.color || "gray"}-500`}
                              />
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
                    ? "bg-zinc-800 text-white hover:bg-zinc-700"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                } transition-colors`}
              >
                <RotateCcw size={14} />
                Reset to Defaults
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default NotificationSettings;
