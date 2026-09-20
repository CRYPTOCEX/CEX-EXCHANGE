"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSettings } from "./SettingsProvider";
import { useExtensionStatus } from "./ExtensionStatusProvider";
import { useUIStore } from "../stores/ui-store";
import { useLayout } from "./LayoutProvider";
import { DEFAULT_HOTKEYS } from "../utils/constants";

interface HotkeysContextValue {
  hotkeys: Record<string, string>;
  isEnabled: boolean;
  executeAction: (action: string) => void;
}

const HotkeysContext = createContext<HotkeysContextValue | null>(null);

function getKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.metaKey || e.ctrlKey) {
    parts.push("mod");
  }
  if (e.shiftKey) {
    parts.push("shift");
  }
  if (e.altKey) {
    parts.push("alt");
  }

  // Get the key
  let key = e.key.toLowerCase();
  if (key === " ") key = "space";
  if (key === "arrowup") key = "up";
  if (key === "arrowdown") key = "down";
  if (key === "arrowleft") key = "left";
  if (key === "arrowright") key = "right";

  // Don't include modifier keys as the main key
  if (!["control", "meta", "shift", "alt"].includes(key)) {
    parts.push(key);
  }

  return parts.join("+");
}

export function HotkeysProvider({ children }: { children: ReactNode }) {
  const { settings: userSettings } = useSettings();
  const { settings: adminSettings } = useExtensionStatus();
  const uiStore = useUIStore();
  const layoutStore = useLayout();

  // Admin setting takes priority - if admin disables hotkeys, they're disabled for all
  // If admin enables them, user can still disable for themselves
  const isEnabled = adminSettings.hotkeysEnabled && userSettings.hotkeysEnabled;

  // Merge default hotkeys with custom
  const hotkeys = { ...DEFAULT_HOTKEYS, ...userSettings.customHotkeys };

  const executeAction = useCallback(
    (action: string) => {
      switch (action) {
        // Navigation
        case "openCommandPalette":
          uiStore.openCommandPalette();
          break;
        case "closeModal":
          uiStore.closeAllModals();
          break;
        case "layout1":
          layoutStore.applyPreset("trading-pro");
          break;
        case "layout2":
          layoutStore.applyPreset("chart-focus");
          break;
        case "layout3":
          layoutStore.applyPreset("scalping");
          break;

        // Trading
        case "setBuyMode":
          uiStore.setTradingSide("buy");
          break;
        case "setSellMode":
          uiStore.setTradingSide("sell");
          break;
        case "setLimitOrder":
          uiStore.setOrderType("limit");
          break;
        case "setMarketOrder":
          uiStore.setOrderType("market");
          break;

        // Panels
        case "togglePositionsPanel":
          layoutStore.togglePanel("positions");
          break;
        case "focusOrderbook":
          uiStore.setFocusedPanel("orderbook");
          break;
        case "focusTradingForm":
          uiStore.setFocusedPanel("trading");
          break;

        // Chart actions (these would be handled by the chart component)
        case "zoomIn":
        case "zoomOut":
        case "timeframe1m":
        case "timeframe5m":
        case "timeframe1h":
        case "timeframe1d":
        case "toggleFullscreen":
          // Dispatch custom event for chart component
          window.dispatchEvent(new CustomEvent("tp-chart-action", { detail: action }));
          break;

        default:
          console.debug("Unknown hotkey action:", action);
      }
    },
    [uiStore, layoutStore]
  );

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = getKeyCombo(e);
      const action = hotkeys[key];

      if (action) {
        e.preventDefault();
        executeAction(action);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys, isEnabled, executeAction]);

  return (
    <HotkeysContext.Provider
      value={{
        hotkeys,
        isEnabled,
        executeAction,
      }}
    >
      {children}
    </HotkeysContext.Provider>
  );
}

export function useHotkeys() {
  const context = useContext(HotkeysContext);
  if (!context) {
    throw new Error("useHotkeys must be used within HotkeysProvider");
  }
  return context;
}
