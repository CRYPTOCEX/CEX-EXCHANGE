"use client";

import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useHotkey } from "./useHotkey";

// Default hotkey mappings
export const DEFAULT_HOTKEYS: Record<string, string> = {
  // Navigation
  "mod+k": "openCommandPalette",
  "mod+1": "layout1",
  "mod+2": "layout2",
  "mod+3": "layout3",
  escape: "closeModal",

  // Trading
  b: "setBuyMode",
  s: "setSellMode",
  l: "setLimitOrder",
  m: "setMarketOrder",
  enter: "submitOrder",
  "mod+enter": "submitOrderBypass",

  // Order management
  c: "cancelLastOrder",
  "mod+shift+c": "cancelAllOrders",
  p: "togglePositionsPanel",

  // Chart
  "+": "zoomIn",
  "-": "zoomOut",
  "1": "timeframe1m",
  "5": "timeframe5m",
  h: "timeframe1h",
  d: "timeframe1d",
  f: "toggleFullscreen",

  // Quick actions
  o: "focusOrderbook",
  t: "focusTradingForm",
};

type HotkeyAction = keyof typeof DEFAULT_HOTKEYS extends string
  ? (typeof DEFAULT_HOTKEYS)[keyof typeof DEFAULT_HOTKEYS]
  : string;

interface HotkeysContextValue {
  hotkeys: Record<string, string>;
  executeAction: (action: string) => void;
  registerAction: (action: string, handler: () => void) => () => void;
  isEnabled: boolean;
}

const HotkeysContext = createContext<HotkeysContextValue | null>(null);

interface HotkeysManagerProps {
  children: React.ReactNode;
  customHotkeys?: Record<string, string>;
  enabled?: boolean;
  onAction?: (action: string) => void;
}

export function HotkeysManager({
  children,
  customHotkeys = {},
  enabled = true,
  onAction,
}: HotkeysManagerProps) {
  // Merge default and custom hotkeys
  const hotkeys = useMemo(
    () => ({ ...DEFAULT_HOTKEYS, ...customHotkeys }),
    [customHotkeys]
  );

  // Action handlers registry
  const actionHandlersRef = React.useRef<Map<string, Set<() => void>>>(new Map());

  // Register an action handler
  const registerAction = useCallback((action: string, handler: () => void) => {
    if (!actionHandlersRef.current.has(action)) {
      actionHandlersRef.current.set(action, new Set());
    }
    actionHandlersRef.current.get(action)!.add(handler);

    // Return unregister function
    return () => {
      actionHandlersRef.current.get(action)?.delete(handler);
    };
  }, []);

  // Execute an action
  const executeAction = useCallback(
    (action: string) => {
      const handlers = actionHandlersRef.current.get(action);
      if (handlers && handlers.size > 0) {
        handlers.forEach((handler) => handler());
      }
      onAction?.(action);
    },
    [onAction]
  );

  // Register all hotkeys
  const allKeyCombos = useMemo(() => Object.keys(hotkeys), [hotkeys]);

  useHotkey(
    allKeyCombos,
    useCallback(
      (event: KeyboardEvent) => {
        if (!enabled) return;

        // Find the matching action
        const keyCombo = getKeyComboFromEvent(event);
        const action = hotkeys[keyCombo];
        if (action) {
          executeAction(action);
        }
      },
      [enabled, hotkeys, executeAction]
    ),
    { enabled }
  );

  const contextValue = useMemo(
    () => ({
      hotkeys,
      executeAction,
      registerAction,
      isEnabled: enabled,
    }),
    [hotkeys, executeAction, registerAction, enabled]
  );

  return (
    <HotkeysContext.Provider value={contextValue}>
      {children}
    </HotkeysContext.Provider>
  );
}

export function useHotkeys() {
  const context = useContext(HotkeysContext);
  if (!context) {
    throw new Error("useHotkeys must be used within a HotkeysManager");
  }
  return context;
}

/**
 * Hook to register an action handler
 */
export function useHotkeyAction(action: string, handler: () => void) {
  const { registerAction } = useHotkeys();

  React.useEffect(() => {
    return registerAction(action, handler);
  }, [action, handler, registerAction]);
}

/**
 * Get key combo string from a keyboard event
 */
function getKeyComboFromEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Add modifiers
  if (isMac ? event.metaKey : event.ctrlKey) parts.push("mod");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  // Add key
  let key = event.key.toLowerCase();
  if (key === " ") key = "space";
  parts.push(key);

  return parts.join("+");
}

export default HotkeysManager;
