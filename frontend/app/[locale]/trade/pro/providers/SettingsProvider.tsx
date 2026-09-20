"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSettingsStore } from "../stores/settings-store";
import type { TPSettings } from "../types/settings";

interface SettingsContextValue {
  settings: TPSettings;
  updateSettings: (updates: Partial<TPSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Settings are automatically loaded from localStorage by Zustand persist
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
