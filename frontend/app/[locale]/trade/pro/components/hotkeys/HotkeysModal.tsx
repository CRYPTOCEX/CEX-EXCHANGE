"use client";

import React, { memo, useEffect } from "react";
import { cn } from "../../utils/cn";
import { getHotkeyDisplay } from "./useHotkey";
import { DEFAULT_HOTKEYS } from "./HotkeysManager";

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTKEY_CATEGORIES = [
  {
    name: "Navigation",
    hotkeys: [
      { combo: "mod+k", description: "Open command palette" },
      { combo: "mod+1", description: "Switch to layout 1" },
      { combo: "mod+2", description: "Switch to layout 2" },
      { combo: "mod+3", description: "Switch to layout 3" },
      { combo: "escape", description: "Close modal/cancel" },
    ],
  },
  {
    name: "Trading",
    hotkeys: [
      { combo: "b", description: "Set buy mode" },
      { combo: "s", description: "Set sell mode" },
      { combo: "l", description: "Set limit order" },
      { combo: "m", description: "Set market order" },
      { combo: "enter", description: "Submit order" },
      { combo: "mod+enter", description: "Submit (skip confirmation)" },
    ],
  },
  {
    name: "Order Management",
    hotkeys: [
      { combo: "c", description: "Cancel last order" },
      { combo: "mod+shift+c", description: "Cancel all orders" },
      { combo: "p", description: "Toggle positions panel" },
    ],
  },
  {
    name: "Chart",
    hotkeys: [
      { combo: "+", description: "Zoom in" },
      { combo: "-", description: "Zoom out" },
      { combo: "1", description: "1 minute timeframe" },
      { combo: "5", description: "5 minute timeframe" },
      { combo: "h", description: "1 hour timeframe" },
      { combo: "d", description: "1 day timeframe" },
      { combo: "f", description: "Toggle fullscreen" },
    ],
  },
  {
    name: "Quick Actions",
    hotkeys: [
      { combo: "o", description: "Focus orderbook" },
      { combo: "t", description: "Focus trading form" },
      { combo: "/", description: "Focus market search" },
    ],
  },
];

export const HotkeysModal = memo(function HotkeysModal({
  isOpen,
  onClose,
}: HotkeysModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "w-full max-w-2xl mx-4 max-h-[80vh]",
          "bg-[var(--tp-bg-secondary)]",
          "border border-[var(--tp-border)]",
          "rounded-xl shadow-2xl",
          "flex flex-col",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tp-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tp-text-primary)]">
              Keyboard Shortcuts
            </h2>
            <p className="text-xs text-[var(--tp-text-muted)] mt-0.5">
              Quick reference for all available hotkeys
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)] rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOTKEY_CATEGORIES.map((category) => (
              <div key={category.name}>
                <h3 className="text-sm font-semibold text-[var(--tp-text-primary)] mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.hotkeys.map((hotkey) => (
                    <div
                      key={hotkey.combo}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-[var(--tp-text-secondary)]">
                        {hotkey.description}
                      </span>
                      <kbd
                        className={cn(
                          "px-2 py-1",
                          "text-xs font-mono",
                          "bg-[var(--tp-bg-tertiary)]",
                          "border border-[var(--tp-border)]",
                          "rounded",
                          "text-[var(--tp-text-muted)]"
                        )}
                      >
                        {getHotkeyDisplay(hotkey.combo)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]/50">
          <p className="text-[10px] text-[var(--tp-text-muted)] text-center">
            Press <kbd className="px-1 py-0.5 bg-[var(--tp-bg-tertiary)] border border-[var(--tp-border)] rounded text-[var(--tp-text-secondary)]">?</kbd> anywhere to open this reference
          </p>
        </div>
      </div>
    </div>
  );
});

export default HotkeysModal;
