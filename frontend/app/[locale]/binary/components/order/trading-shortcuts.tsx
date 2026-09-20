"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { m } from "framer-motion";
import { Keyboard, ArrowUp, Command, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { OverlayModal, ToolbarButton } from "./order-ui";

interface TradingShortcutsProps {
  onPlaceOrder: (type: "CALL" | "PUT") => void;
  onIncreaseAmount: () => void;
  onDecreaseAmount: () => void;
  onQuickAmount: (amount: number) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  shortcuts: Array<{
    keys: string[];
    description: string;
    action?: () => void;
  }>;
}

export default function TradingShortcuts({
  onPlaceOrder,
  onIncreaseAmount,
  onDecreaseAmount,
  onQuickAmount,
}: TradingShortcutsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Check if component is mounted
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Shortcut definitions. The group glyphs are wayfinding, not status, so they
  // all take the one accent rather than a hue each.
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: tCommon("trading"),
      icon: <Zap size={14} className="text-primary" />,
      shortcuts: [
        { keys: ["C"], description: t("place_rise_order"), action: () => onPlaceOrder("CALL") },
        { keys: ["P"], description: t("place_fall_order"), action: () => onPlaceOrder("PUT") },
      ],
    },
    {
      title: tCommon("amount"),
      icon: <ArrowUp size={14} className="text-primary" />,
      shortcuts: [
        { keys: ["↑"], description: t("increase_amount"), action: onIncreaseAmount },
        { keys: ["↓"], description: t("decrease_amount"), action: onDecreaseAmount },
        { keys: ["1"], description: "Set $100", action: () => onQuickAmount(100) },
        { keys: ["2"], description: "Set $500", action: () => onQuickAmount(500) },
        { keys: ["3"], description: "Set $1000", action: () => onQuickAmount(1000) },
        { keys: ["4"], description: "Set $2000", action: () => onQuickAmount(2000) },
      ],
    },
    {
      title: t("navigation"),
      icon: <Command size={14} className="text-primary" />,
      shortcuts: [
        { keys: ["K"], description: t("toggle_shortcuts_panel") },
        { keys: ["Esc"], description: t("close_panel") },
      ],
    },
  ];

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against undefined e.key (can happen with IME input or certain keyboard events)
      if (!e.key) return;

      // Toggle shortcuts panel with K
      if (e.key.toLowerCase() === "k" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement;

        if (!isInputFocused) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
          return;
        }
      }

      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        return;
      }

      // Only process other shortcuts when panel is closed
      if (isOpen) return;

      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      if (isInputFocused) return;

      // Trading shortcuts - only trigger if no modifier keys are pressed
      // This prevents Ctrl+C (copy) and Cmd+C from triggering trades
      if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onPlaceOrder("CALL");
      } else if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onPlaceOrder("PUT");
      }
      // Amount shortcuts
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        onIncreaseAmount();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onDecreaseAmount();
      }
      // Quick amount shortcuts
      else if (e.key === "1") {
        e.preventDefault();
        onQuickAmount(100);
      } else if (e.key === "2") {
        e.preventDefault();
        onQuickAmount(500);
      } else if (e.key === "3") {
        e.preventDefault();
        onQuickAmount(1000);
      } else if (e.key === "4") {
        e.preventDefault();
        onQuickAmount(2000);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onPlaceOrder, onIncreaseAmount, onDecreaseAmount, onQuickAmount]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderModal = () => {
    if (!isMounted || !isOpen) return null;

    return (
      <OverlayModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        panelRef={popupRef}
        icon={Keyboard}
        title={tCommon("keyboard_shortcuts")}
        subtitle={t("quick_actions_for_faster_trading")}
      >
        {/* Content */}
        <div className="px-4 py-3 overflow-y-auto max-h-[60vh] space-y-4">
          {shortcutGroups.map((group, groupIndex) => (
            <m.div
              key={group.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-surface-3">{group.icon}</div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden bg-surface-3">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5",
                      index !== group.shortcuts.length - 1 &&
                        "border-b border-border",
                      shortcut.action &&
                        "cursor-pointer transition-colors hover:bg-primary/10"
                    )}
                    onClick={() => shortcut.action?.()}
                  >
                    <span className="text-xs text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold min-w-[28px] text-center bg-card text-foreground border border-border-strong "
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface-2">
          <div className="flex items-center justify-center gap-2">
            <kbd className="px-2 py-1 rounded-lg text-[10px] font-mono font-semibold bg-card text-muted-foreground border border-border-strong">
              K
            </kbd>
            <span className="text-[10px] text-subtle-foreground">
              {t("to_toggle_this_panel")}
            </span>
          </div>
        </div>
      </OverlayModal>
    );
  };

  return (
    <>
      <ToolbarButton
        icon={Keyboard}
        label="Keys"
        badge="K"
        badgeAs="kbd"
        onClick={() => setIsOpen(true)}
        title={tCommon("keyboard_shortcuts")}
      />

      {renderModal()}
    </>
  );
}
