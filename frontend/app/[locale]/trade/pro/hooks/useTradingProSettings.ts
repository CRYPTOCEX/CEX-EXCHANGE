"use client";

import { useSettings } from "../providers/SettingsProvider";

export function useTradingProSettings() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
