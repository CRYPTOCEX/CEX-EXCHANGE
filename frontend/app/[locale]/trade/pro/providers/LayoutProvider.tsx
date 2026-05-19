"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useLayoutStore } from "../stores/layout-store";
import type { TPLayoutConfig, TPLayoutPreset } from "../types/layout";

interface LayoutContextValue {
  layout: TPLayoutConfig;
  activePreset: string | null;
  presets: TPLayoutPreset[];
  customLayouts: TPLayoutPreset[];

  // Panel operations
  setPanelSize: (panelId: string, size: number) => void;
  setPanelVisible: (panelId: string, visible: boolean) => void;
  togglePanel: (panelId: string) => void;
  togglePanelCollapse: (panelId: string) => void;
  isPanelCollapsed: (panelId: string) => boolean;
  resetPanelSizes: () => void;

  // Layout operations (all localStorage based)
  applyPreset: (presetId: string) => void;
  saveCurrentLayout: (name: string, description?: string) => void;
  deleteLayout: (layoutId: string) => void;
  setDefaultLayout: (layoutId: string) => void;

  // Mode
  layoutMode: "pro" | "lite";
  setLayoutMode: (mode: "pro" | "lite") => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  // Layouts are automatically loaded from localStorage by Zustand persist
  const store = useLayoutStore();

  return (
    <LayoutContext.Provider value={store}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}
