"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import {
  Search, Command, ArrowRight, CornerDownLeft, ChevronRight,
  Clock, Star, TrendingUp, Hash, Sparkles, X, ArrowUp, ArrowDown
} from "lucide-react";
import { createPortal } from "react-dom";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
}

interface FlattenedItem {
  key: string;
  title: string;
  href: string;
  icon?: string;
  description?: string;
  breadcrumb: string[];
  extension?: string;
  disabled?: boolean;
}

export default function CommandPalette({
  isOpen,
  onClose,
  menuItems,
  isDark,
  getTitle,
}: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin-recent-searches");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch {
          // Ignore invalid JSON in localStorage
        }
      }
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Flatten menu items for search
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];

    const flatten = (menuItems: MenuItem[], breadcrumb: string[] = []) => {
      menuItems.forEach((item) => {
        const title = getTitle(item);
        const currentBreadcrumb = [...breadcrumb, title];

        if (item.href && item.href !== "#") {
          items.push({
            key: item.key,
            title,
            href: item.href,
            icon: item.icon,
            description: item.description,
            breadcrumb: currentBreadcrumb,
            extension: item.extension,
            disabled: item.disabled,
          });
        }

        if (item.child) {
          flatten(item.child, currentBreadcrumb);
        }
        if (item.megaMenu) {
          flatten(item.megaMenu, currentBreadcrumb);
        }
      });
    };

    flatten(menuItems);
    return items;
  }, [menuItems, getTitle]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show popular/recent items when no query
      return flattenedItems.slice(0, 8);
    }

    const lowerQuery = query.toLowerCase();
    return flattenedItems
      .filter((item) => {
        if (item.disabled) return false;
        const searchString = [
          item.title,
          item.description,
          ...item.breadcrumb,
        ].join(" ").toLowerCase();
        return searchString.includes(lowerQuery);
      })
      .slice(0, 10);
  }, [query, flattenedItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleSelect(filteredItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, filteredItems.length]);

  // Handle item selection
  const handleSelect = useCallback(
    (item: FlattenedItem) => {
      if (item.disabled) return;

      // Save to recent searches
      const updated = [
        item.title,
        ...recentSearches.filter((s) => s !== item.title),
      ].slice(0, 5);
      setRecentSearches(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin-recent-searches", JSON.stringify(updated));
      }

      router.push(item.href);
      onClose();
    },
    [router, onClose, recentSearches]
  );

  if (!isOpen) return null;

  // Use portal to render outside of any container constraints
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-0",
            isDark ? "bg-black/80" : "bg-zinc-900/60",
            "backdrop-blur-sm"
          )}
          onClick={onClose}
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden",
            "border shadow-2xl",
            isDark
              ? "bg-zinc-900 border-zinc-800 shadow-black/50"
              : "bg-white border-zinc-200 shadow-zinc-300/50"
          )}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/50 via-violet-500/50 to-primary/50" />

          {/* Search Input */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-4 border-b",
            isDark ? "border-zinc-800" : "border-zinc-200"
          )}>
            <Search className={cn(
              "w-5 h-5 flex-shrink-0",
              isDark ? "text-zinc-500" : "text-zinc-400"
            )} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search pages, settings, extensions..."
              className={cn(
                "flex-1 bg-transparent outline-none text-base",
                isDark
                  ? "text-white placeholder:text-zinc-500"
                  : "text-zinc-900 placeholder:text-zinc-400"
              )}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className={cn(
              "hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium",
              isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-500"
            )}>
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <div className={cn(
                  "w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <Search className={cn(
                    "w-5 h-5",
                    isDark ? "text-zinc-600" : "text-zinc-400"
                  )} />
                </div>
                <p className={cn(
                  "text-sm",
                  isDark ? "text-zinc-500" : "text-zinc-400"
                )}>
                  No results found for "{query}"
                </p>
              </div>
            ) : (
              <>
                {/* Section Header */}
                {!query && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-400"
                  )}>
                    <TrendingUp className="w-3 h-3" />
                    Quick Access
                  </div>
                )}

                {/* Items */}
                {filteredItems.map((item, index) => (
                  <motion.button
                    key={item.key}
                    data-index={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleSelect(item)}
                    disabled={item.disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group",
                      index === selectedIndex
                        ? isDark
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "bg-primary/5 ring-1 ring-primary/20"
                        : isDark
                          ? "hover:bg-white/5"
                          : "hover:bg-zinc-50",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 p-2 rounded-lg transition-colors",
                      index === selectedIndex
                        ? "bg-primary/20 text-primary"
                        : isDark
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-zinc-100 text-zinc-500"
                    )}>
                      {item.icon ? (
                        <Icon icon={item.icon} className="w-4 h-4" />
                      ) : (
                        <Hash className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          index === selectedIndex
                            ? "text-primary"
                            : isDark
                              ? "text-zinc-200"
                              : "text-zinc-700"
                        )}>
                          {item.title}
                        </span>
                        {item.extension && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded-md",
                            isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600"
                          )}>
                            {item.extension}
                          </span>
                        )}
                      </div>

                      {/* Breadcrumb */}
                      {item.breadcrumb.length > 1 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {item.breadcrumb.slice(0, -1).map((crumb, idx) => (
                            <React.Fragment key={idx}>
                              <span className={cn(
                                "text-xs",
                                isDark ? "text-zinc-600" : "text-zinc-400"
                              )}>
                                {crumb}
                              </span>
                              {idx < item.breadcrumb.length - 2 && (
                                <ChevronRight className={cn(
                                  "w-3 h-3",
                                  isDark ? "text-zinc-700" : "text-zinc-300"
                                )} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Hint */}
                    <div className={cn(
                      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                      index === selectedIndex && "opacity-100"
                    )}>
                      <CornerDownLeft className={cn(
                        "w-4 h-4",
                        isDark ? "text-zinc-600" : "text-zinc-400"
                      )} />
                    </div>
                  </motion.button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-t",
            isDark ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"
          )}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className={cn(
                  "flex items-center justify-center w-6 h-6 rounded text-xs font-medium",
                  isDark ? "bg-zinc-800 text-zinc-400" : "bg-white text-zinc-500 border border-zinc-200"
                )}>
                  <ArrowUp className="w-3 h-3" />
                </kbd>
                <kbd className={cn(
                  "flex items-center justify-center w-6 h-6 rounded text-xs font-medium",
                  isDark ? "bg-zinc-800 text-zinc-400" : "bg-white text-zinc-500 border border-zinc-200"
                )}>
                  <ArrowDown className="w-3 h-3" />
                </kbd>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-zinc-600" : "text-zinc-400"
                )}>
                  to navigate
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <kbd className={cn(
                  "flex items-center justify-center px-2 h-6 rounded text-xs font-medium",
                  isDark ? "bg-zinc-800 text-zinc-400" : "bg-white text-zinc-500 border border-zinc-200"
                )}>
                  Enter
                </kbd>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-zinc-600" : "text-zinc-400"
                )}>
                  to select
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className={cn(
                "w-3 h-3",
                isDark ? "text-primary/60" : "text-primary/60"
              )} />
              <span className={cn(
                "text-xs",
                isDark ? "text-zinc-600" : "text-zinc-400"
              )}>
                Powered by Admin Search
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
