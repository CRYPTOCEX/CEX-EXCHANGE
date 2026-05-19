"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X, ArrowUp, ArrowDown, Command, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface TradingShortcutsProps {
  onPlaceOrder: (type: "CALL" | "PUT") => void;
  onIncreaseAmount: () => void;
  onDecreaseAmount: () => void;
  onQuickAmount: (amount: number) => void;
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
  darkMode = true,
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

  // Shortcut definitions
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Trading",
      icon: <Zap size={14} className="text-emerald-500" />,
      shortcuts: [
        { keys: ["C"], description: "Place RISE order", action: () => onPlaceOrder("CALL") },
        { keys: ["P"], description: "Place FALL order", action: () => onPlaceOrder("PUT") },
      ],
    },
    {
      title: "Amount",
      icon: <ArrowUp size={14} className="text-blue-500" />,
      shortcuts: [
        { keys: ["↑"], description: "Increase amount", action: onIncreaseAmount },
        { keys: ["↓"], description: "Decrease amount", action: onDecreaseAmount },
        { keys: ["1"], description: "Set $100", action: () => onQuickAmount(100) },
        { keys: ["2"], description: "Set $500", action: () => onQuickAmount(500) },
        { keys: ["3"], description: "Set $1000", action: () => onQuickAmount(1000) },
        { keys: ["4"], description: "Set $2000", action: () => onQuickAmount(2000) },
      ],
    },
    {
      title: "Navigation",
      icon: <Command size={14} className="text-amber-500" />,
      shortcuts: [
        { keys: ["K"], description: "Toggle shortcuts panel" },
        { keys: ["Esc"], description: "Close panel" },
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

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Container */}
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
              style={{ pointerEvents: "none" }}
            >
              <motion.div
                ref={popupRef}
                className={`relative w-[340px] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl ${
                  darkMode
                    ? "bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/80"
                    : "bg-white/95 backdrop-blur-xl border border-gray-200"
                }`}
                style={{ pointerEvents: "auto" }}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  darkMode ? "border-zinc-800/50" : "border-gray-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${darkMode ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                      <Keyboard size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {tCommon("keyboard_shortcuts")}
                      </h3>
                      <p className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                        {t("quick_actions_for_faster_trading")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      darkMode
                        ? "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <div className="px-4 py-3 overflow-y-auto max-h-[60vh] space-y-4">
                  {shortcutGroups.map((group, groupIndex) => (
                    <motion.div
                      key={group.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${
                          darkMode ? "bg-zinc-800" : "bg-gray-100"
                        }`}>
                          {group.icon}
                        </div>
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                          darkMode ? "text-zinc-400" : "text-gray-500"
                        }`}>
                          {group.title}
                        </span>
                      </div>
                      <div className={`rounded-xl overflow-hidden ${
                        darkMode ? "bg-zinc-800/50" : "bg-gray-50"
                      }`}>
                        {group.shortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between px-3 py-2.5 ${
                              index !== group.shortcuts.length - 1
                                ? darkMode ? "border-b border-zinc-700/50" : "border-b border-gray-200"
                                : ""
                            } ${
                              shortcut.action
                                ? `cursor-pointer transition-colors ${
                                    darkMode ? "hover:bg-zinc-700/50" : "hover:bg-gray-100"
                                  }`
                                : ""
                            }`}
                            onClick={() => shortcut.action?.()}
                          >
                            <span className={`text-xs ${darkMode ? "text-zinc-300" : "text-gray-600"}`}>
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <kbd
                                  key={keyIndex}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold min-w-[28px] text-center ${
                                    darkMode
                                      ? "bg-zinc-700 text-zinc-200 border border-zinc-600 shadow-sm"
                                      : "bg-white text-gray-700 border border-gray-300 shadow-sm"
                                  }`}
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className={`px-4 py-3 border-t ${
                  darkMode ? "border-zinc-800/50 bg-zinc-900/50" : "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    <kbd className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold ${
                      darkMode
                        ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        : "bg-white text-gray-500 border border-gray-300"
                    }`}>
                      K
                    </kbd>
                    <span className={`text-[10px] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
                      {t("to_toggle_this_panel")}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
          darkMode
            ? "bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700"
            : "bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300"
        } active:scale-95`}
        title={tCommon("keyboard_shortcuts")}
      >
        <div className={`p-1 rounded-md ${darkMode ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
          <Keyboard size={12} className="text-emerald-500" />
        </div>
        <span className={`text-[10px] font-semibold ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
          Keys
        </span>
        <kbd className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
          darkMode ? "bg-zinc-800 text-zinc-500" : "bg-gray-200 text-gray-500"
        }`}>
          K
        </kbd>
      </button>

      {renderModal()}
    </>
  );
}
