import { useEffect, useCallback, useRef } from "react";

type KeyModifier = "ctrl" | "alt" | "shift" | "meta" | "mod";

interface HotkeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  enableOnInput?: boolean;
}

/**
 * Parse a key combination string into parts
 * e.g., "mod+k" -> { modifiers: ["mod"], key: "k" }
 */
function parseKeyCombo(combo: string): { modifiers: KeyModifier[]; key: string } {
  const parts = combo.toLowerCase().split("+");
  const key = parts.pop() || "";
  const modifiers = parts as KeyModifier[];
  return { modifiers, key };
}

/**
 * Check if a keyboard event matches a key combination
 */
function matchesKeyCombo(
  event: KeyboardEvent,
  modifiers: KeyModifier[],
  key: string
): boolean {
  const eventKey = event.key.toLowerCase();

  // Check key match
  if (eventKey !== key && event.code.toLowerCase() !== `key${key}`) {
    // Also check for special keys
    if (key === "escape" && eventKey !== "escape") return false;
    if (key === "enter" && eventKey !== "enter") return false;
    if (key === "tab" && eventKey !== "tab") return false;
    if (key === "space" && eventKey !== " " && eventKey !== "space") return false;
    if (![key, "escape", "enter", "tab", "space"].includes(eventKey) && eventKey !== key) {
      return false;
    }
  }

  // Check modifiers
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  for (const mod of modifiers) {
    if (mod === "mod") {
      // mod = Command on Mac, Ctrl on others
      if (isMac && !event.metaKey) return false;
      if (!isMac && !event.ctrlKey) return false;
    } else if (mod === "ctrl" && !event.ctrlKey) {
      return false;
    } else if (mod === "alt" && !event.altKey) {
      return false;
    } else if (mod === "shift" && !event.shiftKey) {
      return false;
    } else if (mod === "meta" && !event.metaKey) {
      return false;
    }
  }

  // Ensure no extra modifiers are pressed
  if (!modifiers.includes("ctrl") && !modifiers.includes("mod") && event.ctrlKey) return false;
  if (!modifiers.includes("alt") && event.altKey) return false;
  if (!modifiers.includes("shift") && event.shiftKey) return false;
  if (!modifiers.includes("meta") && !modifiers.includes("mod") && event.metaKey) return false;

  return true;
}

/**
 * Hook to register a hotkey handler
 */
export function useHotkey(
  keyCombo: string | string[],
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
): void {
  const { enabled = true, preventDefault = true, enableOnInput = false } = options;
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const combos = Array.isArray(keyCombo) ? keyCombo : [keyCombo];
    const parsedCombos = combos.map(parseKeyCombo);

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in input/textarea (unless explicitly enabled)
      if (!enableOnInput) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isInput = tagName === "input" || tagName === "textarea" || target.isContentEditable;
        if (isInput) return;
      }

      // Check if any combo matches
      for (const { modifiers, key } of parsedCombos) {
        if (matchesKeyCombo(event, modifiers, key)) {
          if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }
          callbackRef.current(event);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [keyCombo, enabled, preventDefault, enableOnInput]);
}

/**
 * Get the display string for a key combination
 */
export function getHotkeyDisplay(keyCombo: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return keyCombo
    .split("+")
    .map((part) => {
      switch (part.toLowerCase()) {
        case "mod":
          return isMac ? "⌘" : "Ctrl";
        case "ctrl":
          return isMac ? "⌃" : "Ctrl";
        case "alt":
          return isMac ? "⌥" : "Alt";
        case "shift":
          return isMac ? "⇧" : "Shift";
        case "meta":
          return isMac ? "⌘" : "Win";
        case "enter":
          return "↵";
        case "escape":
          return "Esc";
        case "tab":
          return "Tab";
        case "space":
          return "Space";
        default:
          return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

export default useHotkey;
