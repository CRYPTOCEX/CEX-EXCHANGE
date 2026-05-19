/**
 * Global Trading Settings Store
 *
 * Persisted store for trading settings that should be shared across components:
 * - Audio/Sound settings
 * - Notification preferences
 * - One-click trading settings
 * - Martingale strategy settings
 *
 * All settings auto-save to localStorage for persistence across sessions.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// AUDIO TYPES (defined locally to avoid chart-engine dependency)
// ============================================================================

export type SoundType =
  | "order_placed"
  | "order_won"
  | "order_lost"
  | "order_expired"
  | "countdown_tick"
  | "countdown_final"
  | "price_alert"
  | "error"
  | "success";

export interface AudioConfig {
  enabled: boolean;
  volume: number;
  sounds: Record<SoundType, boolean>;
}

export const defaultAudioConfig: AudioConfig = {
  enabled: true,
  volume: 0.5,
  sounds: {
    order_placed: true,
    order_won: true,
    order_lost: true,
    order_expired: true,
    countdown_tick: false,
    countdown_final: true,
    price_alert: true,
    error: true,
    success: true,
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface MartingaleSettings {
  enabled: boolean;
  multiplier: number;
  maxSteps: number;
  currentStep: number;
  resetOnWin: boolean;
}

export interface OneClickSettings {
  enabled: boolean;
  maxAmount: number;
  confirmLargeOrders: boolean;
  largeOrderThreshold: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  toastEnabled: boolean;
  pushEnabled: boolean;
  tradeWinNotify: boolean;
  tradeLossNotify: boolean;
  orderPlacedNotify: boolean;
  priceAlertNotify: boolean;
}

export interface TradingSettingsState {
  // Audio settings
  audio: AudioConfig;

  // One-click trading
  oneClick: OneClickSettings;

  // Martingale strategy
  martingale: MartingaleSettings;

  // Notification preferences
  notifications: NotificationPreferences;

  // Audio actions
  setAudioEnabled: (enabled: boolean) => void;
  setAudioVolume: (volume: number) => void;
  setSoundEnabled: (soundType: SoundType, enabled: boolean) => void;
  setAudioConfig: (config: Partial<AudioConfig>) => void;

  // One-click actions
  setOneClickEnabled: (enabled: boolean) => void;
  setOneClickMaxAmount: (amount: number) => void;
  updateOneClick: (settings: Partial<OneClickSettings>) => void;

  // Martingale actions
  setMartingaleEnabled: (enabled: boolean) => void;
  updateMartingale: (settings: Partial<MartingaleSettings>) => void;
  incrementMartingaleStep: () => void;
  resetMartingaleStep: () => void;

  // Notification actions
  setNotificationsEnabled: (enabled: boolean) => void;
  updateNotifications: (settings: Partial<NotificationPreferences>) => void;

  // Reset all settings to defaults
  resetToDefaults: () => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultOneClick: OneClickSettings = {
  enabled: false,
  maxAmount: 100,
  confirmLargeOrders: true,
  largeOrderThreshold: 500,
};

const defaultMartingale: MartingaleSettings = {
  enabled: false,
  multiplier: 2,
  maxSteps: 5,
  currentStep: 0,
  resetOnWin: true,
};

const defaultNotifications: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  toastEnabled: true,
  pushEnabled: false,
  tradeWinNotify: true,
  tradeLossNotify: true,
  orderPlacedNotify: true,
  priceAlertNotify: true,
};

// ============================================================================
// STORE
// ============================================================================

export const useTradingSettingsStore = create<TradingSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      audio: defaultAudioConfig,
      oneClick: defaultOneClick,
      martingale: defaultMartingale,
      notifications: defaultNotifications,

      // Audio actions
      setAudioEnabled: (enabled) =>
        set((state) => ({
          audio: { ...state.audio, enabled },
        })),

      setAudioVolume: (volume) =>
        set((state) => ({
          audio: { ...state.audio, volume: Math.max(0, Math.min(1, volume)) },
        })),

      setSoundEnabled: (soundType, enabled) =>
        set((state) => ({
          audio: {
            ...state.audio,
            sounds: { ...state.audio.sounds, [soundType]: enabled },
          },
        })),

      setAudioConfig: (config) =>
        set((state) => ({
          audio: { ...state.audio, ...config },
        })),

      // One-click actions
      setOneClickEnabled: (enabled) =>
        set((state) => ({
          oneClick: { ...state.oneClick, enabled },
        })),

      setOneClickMaxAmount: (maxAmount) =>
        set((state) => ({
          oneClick: { ...state.oneClick, maxAmount },
        })),

      updateOneClick: (settings) =>
        set((state) => ({
          oneClick: { ...state.oneClick, ...settings },
        })),

      // Martingale actions
      setMartingaleEnabled: (enabled) =>
        set((state) => ({
          martingale: { ...state.martingale, enabled },
        })),

      updateMartingale: (settings) =>
        set((state) => ({
          martingale: { ...state.martingale, ...settings },
        })),

      incrementMartingaleStep: () =>
        set((state) => ({
          martingale: {
            ...state.martingale,
            currentStep: Math.min(
              state.martingale.currentStep + 1,
              state.martingale.maxSteps
            ),
          },
        })),

      resetMartingaleStep: () =>
        set((state) => ({
          martingale: { ...state.martingale, currentStep: 0 },
        })),

      // Notification actions
      setNotificationsEnabled: (enabled) =>
        set((state) => ({
          notifications: { ...state.notifications, enabled },
        })),

      updateNotifications: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),

      // Reset all settings
      resetToDefaults: () =>
        set({
          audio: defaultAudioConfig,
          oneClick: defaultOneClick,
          martingale: defaultMartingale,
          notifications: defaultNotifications,
        }),
    }),
    {
      name: "trading-settings-store",
      // Only persist these keys
      partialize: (state) => ({
        audio: state.audio,
        oneClick: state.oneClick,
        martingale: state.martingale,
        notifications: state.notifications,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectAudioConfig = (state: TradingSettingsState) => state.audio;
export const selectOneClickSettings = (state: TradingSettingsState) => state.oneClick;
export const selectMartingaleSettings = (state: TradingSettingsState) => state.martingale;
export const selectNotificationPreferences = (state: TradingSettingsState) => state.notifications;

// ============================================================================
// HOOKS FOR COMMON USE CASES
// ============================================================================

/**
 * Hook to get audio settings and controls
 */
export function useAudioSettings() {
  const audio = useTradingSettingsStore((state) => state.audio);
  const setAudioEnabled = useTradingSettingsStore((state) => state.setAudioEnabled);
  const setAudioVolume = useTradingSettingsStore((state) => state.setAudioVolume);
  const setSoundEnabled = useTradingSettingsStore((state) => state.setSoundEnabled);
  const setAudioConfig = useTradingSettingsStore((state) => state.setAudioConfig);

  return {
    config: audio,
    enabled: audio.enabled,
    volume: audio.volume,
    sounds: audio.sounds,
    setEnabled: setAudioEnabled,
    setVolume: setAudioVolume,
    setSoundEnabled,
    setConfig: setAudioConfig,
  };
}

/**
 * Hook to get one-click trading settings
 */
export function useOneClickSettings() {
  const oneClick = useTradingSettingsStore((state) => state.oneClick);
  const setEnabled = useTradingSettingsStore((state) => state.setOneClickEnabled);
  const setMaxAmount = useTradingSettingsStore((state) => state.setOneClickMaxAmount);
  const update = useTradingSettingsStore((state) => state.updateOneClick);

  return {
    ...oneClick,
    setEnabled,
    setMaxAmount,
    update,
  };
}

/**
 * Hook to get martingale settings
 */
export function useMartingaleSettings() {
  const martingale = useTradingSettingsStore((state) => state.martingale);
  const setEnabled = useTradingSettingsStore((state) => state.setMartingaleEnabled);
  const update = useTradingSettingsStore((state) => state.updateMartingale);
  const incrementStep = useTradingSettingsStore((state) => state.incrementMartingaleStep);
  const resetStep = useTradingSettingsStore((state) => state.resetMartingaleStep);

  return {
    ...martingale,
    setEnabled,
    update,
    incrementStep,
    resetStep,
  };
}

export default useTradingSettingsStore;
