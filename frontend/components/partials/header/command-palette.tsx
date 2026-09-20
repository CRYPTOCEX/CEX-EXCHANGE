"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { Icon } from "@/components/ui/icon";
import {
  Search, Command, ArrowRight, CornerDownLeft, ChevronRight,
  Clock, Star, TrendingUp, Hash, Sparkles, X, ArrowUp, ArrowDown
} from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
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
  getTitle,
}: CommandPaletteProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /**
   * Hover and keyboard drive the SAME selection (see the row's `onMouseMove`),
   * so the auto-scroll below has to know which one moved it. Scrolling on a
   * pointer-driven change slides the list under a stationary cursor, which
   * fires another mousemove on a different row — the selection then walks by
   * itself. Only keyboard navigation scrolls.
   */
  const pointerNavRef = useRef(false);

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
      pointerNavRef.current = false;
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
          pointerNavRef.current = false;
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          pointerNavRef.current = false;
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

  // Scroll selected item into view (keyboard navigation only)
  useEffect(() => {
    if (pointerNavRef.current) return;
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
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[var(--z-overlay-scrim)] flex items-start justify-center pt-[15vh]"
      >
        {/* Backdrop */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-0",
            "bg-overlay/70",
            "backdrop-blur-sm"
          )}
          onClick={onClose}
        />

        {/* Command Palette */}
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden",
            "border shadow-2xl",
            "bg-popover border-border shadow-shadow/50"
          )}
        >
          {/* Accent rule along the top edge. Was primary → violet → primary;
              the violet midpoint was a second brand hue with no meaning. */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />

          {/* Search Input */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-4 border-b",
            "border-border"
          )}>
            <Search className={cn(
              "w-5 h-5 flex-shrink-0",
              "text-subtle-foreground"
            )} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
                pointerNavRef.current = false;
              }}
              placeholder={`${t("search_pages_settings_extensions")}…`}
              className={cn(
                "flex-1 bg-transparent outline-none text-base",
                "text-foreground placeholder:text-subtle-foreground"
              )}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  "hover:bg-muted"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className={cn(
              "hidden sm:flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium",
              "bg-muted text-subtle-foreground"
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
                  "bg-muted"
                )}>
                  <Search className={cn(
                    "w-5 h-5",
                    "text-subtle-foreground"
                  )} />
                </div>
                <p className={cn(
                  "text-sm",
                  "text-subtle-foreground"
                )}>
                  {t("no_results_found_for")}{query}"
                </p>
              </div>
            ) : (
              <>
                {/* Section Header */}
                {!query && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider",
                    "text-subtle-foreground"
                  )}>
                    <TrendingUp className="w-3 h-3" />
                    {tCommon("quick_access")}
                  </div>
                )}

                {/* Items
                    Hover MOVES the selection rather than painting a second
                    highlight: the old `hover:bg-muted` lit a grey row while the
                    keyboard row stayed blue, so two rows read as active at once
                    and Enter fired the one the pointer was NOT on. It also put
                    `bg-muted` behind the `bg-muted` icon tile, which erased the
                    tile on exactly the row being pointed at. */}
                {filteredItems.map((item, index) => (
                  <button
                    key={item.key}
                    data-index={index}
                    onClick={() => handleSelect(item)}
                    onMouseMove={() => {
                      if (item.disabled || selectedIndex === index) return;
                      pointerNavRef.current = true;
                      setSelectedIndex(index);
                    }}
                    disabled={item.disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left",
                      "transition-[color,background-color,box-shadow] duration-150",
                      index === selectedIndex
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "ring-1 ring-transparent",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 p-2 rounded-lg transition-colors",
                      index === selectedIndex
                        ? "bg-primary/20 text-primary-ink"
                        : "bg-muted text-muted-foreground"
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
                        {/* `-ink` is the AA-safe ink the system pairs with a
                            tone tint; the label wears it now that hover — not
                            just the keyboard — lands on this state. */}
                        <span className={cn(
                          "font-medium",
                          index === selectedIndex
                            ? "text-primary-ink"
                            : "text-foreground"
                        )}>
                          {item.title}
                        </span>
                        {item.extension && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded-md",
                            "bg-primary/15 text-primary-ink"
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
                                "text-subtle-foreground"
                              )}>
                                {crumb}
                              </span>
                              {idx < item.breadcrumb.length - 2 && (
                                <ChevronRight className={cn(
                                  "w-3 h-3",
                                  "text-subtle-foreground"
                                )} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Hint */}
                    <div className={cn(
                      "flex items-center gap-1 transition-opacity",
                      index === selectedIndex ? "opacity-100" : "opacity-0"
                    )}>
                      <CornerDownLeft className={cn(
                        "w-4 h-4",
                        "text-subtle-foreground"
                      )} />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between px-4 py-3 border-t",
            "border-border bg-surface-2/50"
          )}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className={cn(
                  "flex items-center justify-center w-6 h-6 rounded text-xs font-medium",
                  "bg-muted text-muted-foreground"
                )}>
                  <ArrowUp className="w-3 h-3" />
                </kbd>
                <kbd className={cn(
                  "flex items-center justify-center w-6 h-6 rounded text-xs font-medium",
                  "bg-muted text-muted-foreground"
                )}>
                  <ArrowDown className="w-3 h-3" />
                </kbd>
                <span className={cn(
                  "text-xs",
                  "text-subtle-foreground"
                )}>
                  {tCommon("to_navigate")}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <kbd className={cn(
                  "flex items-center justify-center px-2 h-6 rounded text-xs font-medium",
                  "bg-muted text-muted-foreground"
                )}>
                  Enter
                </kbd>
                <span className={cn(
                  "text-xs",
                  "text-subtle-foreground"
                )}>
                  {t("to_select")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className={cn(
                "w-3 h-3",
                "text-primary/60"
              )} />
              <span className={cn(
                "text-xs",
                "text-subtle-foreground"
              )}>
                {t("powered_by_admin_search")}
              </span>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>,
    document.body
  );
}
