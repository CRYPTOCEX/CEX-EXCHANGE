import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { TPSettings } from "../types/settings";

const DEFAULT_SETTINGS: TPSettings = {
  chartProvider: "tradingview",
  defaultTimeframe: "1h",
  defaultChartType: "candles",
  layoutMode: "pro",
  oneClickTrading: false,
  orderConfirmation: true,
  defaultOrderType: "limit",
  defaultLeverage: 1,
  soundEnabled: true,
  soundOrderPlaced: true,
  soundOrderFilled: true,
  soundVolume: 50,
  showPnlInCurrency: true,
  showPnlPercentage: true,
  decimalPlacesPrice: 2,
  decimalPlacesAmount: 4,
  hotkeysEnabled: true,
  customHotkeys: {},
};

interface SettingsStore {
  settings: TPSettings;

  // Actions (all synchronous - persisted to localStorage automatically)
  updateSettings: (updates: Partial<TPSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        settings: DEFAULT_SETTINGS,

        // Update settings - automatically persisted to localStorage
        updateSettings: (updates) => {
          set((state) => ({
            settings: { ...state.settings, ...updates },
          }));
        },

        // Reset to defaults - automatically persisted to localStorage
        resetSettings: () => {
          set({ settings: DEFAULT_SETTINGS });
        },
      }),
      {
        name: "trading-pro-settings",
        // Persist entire settings object
        partialize: (state) => ({ settings: state.settings }),
      }
    ),
    { name: "TradingProSettings" }
  )
);
