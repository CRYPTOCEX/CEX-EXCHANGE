"use client";

import { useExtensionStatus, TradingSettings } from "../providers/ExtensionStatusProvider";

export function useTradingProStatus() {
  const { isEnabled, settings, isLoading, error, refresh } =
    useExtensionStatus();

  return {
    isEnabled,
    settings,
    // Convenience accessors for commonly used settings
    chartProvider: settings.chartProvider,
    hotkeysEnabled: settings.hotkeysEnabled,
    isLoading,
    error,
    refresh,
  };
}

export type { TradingSettings };
