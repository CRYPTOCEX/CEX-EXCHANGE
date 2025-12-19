"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/routing";
import { Icon } from "@iconify/react";
import {
  ChevronRight, Sparkles, ArrowRight,
  Lock, Check, ExternalLink, Zap, Info
} from "lucide-react";

interface MegaDropdownProps {
  item: MenuItem;
  onClose: () => void;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  colorSchema?: NavColorSchema | null;
  primaryColor?: string;
  secondaryColor?: string;
  gradientStyle?: string;
}

// Category color schemes for Extensions mega menu
const categoryColors: Record<string, { gradient: string; bg: string; text: string; border: string; glow: string }> = {
  "admin-trading-extensions": {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20"
  },
  "admin-investment-extensions": {
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
    glow: "shadow-violet-500/20"
  },
  "admin-marketplace-extensions": {
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-amber-500/20"
  },
  "admin-business-extensions": {
    gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20"
  },
};

const defaultColorScheme = {
  gradient: "from-primary/20 via-primary/10 to-transparent",
  bg: "bg-primary/10",
  text: "text-primary",
  border: "border-primary/30",
  glow: "shadow-primary/20"
};

export default function MegaDropdown({
  item,
  onClose,
  isDark,
  getTitle,
  colorSchema,
  primaryColor,
  secondaryColor,
  gradientStyle,
}: MegaDropdownProps) {
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const isItemActive = (menuItem: MenuItem): boolean => {
    if (pathname === menuItem.href) return true;
    if (menuItem.href && pathname.startsWith(menuItem.href + "/")) return true;
    return false;
  };

  // Determine if this is a mega menu or regular child menu
  const isMegaMenu = item.megaMenu && item.megaMenu.length > 0;
  const children = isMegaMenu ? item.megaMenu : item.child;

  // Check if children have nested items (for partial mega menu style)
  const hasNestedChildren = children?.some(child => child.child && child.child.length > 0);

  // Set first category as selected by default for mega menu
  useEffect(() => {
    if (isMegaMenu && children && children.length > 0 && !selectedCategory) {
      setSelectedCategory(children[0].key);
    }
  }, [isMegaMenu, children, selectedCategory]);

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute top-full left-0 mt-2 z-50",
        "rounded-2xl overflow-hidden",
        "border shadow-2xl",
        isDark
          ? "bg-zinc-900/98 backdrop-blur-2xl border-zinc-800/80 shadow-black/40"
          : "bg-white/98 backdrop-blur-2xl border-zinc-200/80 shadow-zinc-300/30",
        isMegaMenu ? "w-[1000px] -left-[350px]" : hasNestedChildren ? "min-w-[600px]" : "min-w-[280px]"
      )}
      onMouseEnter={() => {}}
      onMouseLeave={onClose}
    >
      {/* Gradient top border - uses theme colors */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: gradientStyle || 'linear-gradient(to right, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.5))'
        }}
      />

      {isMegaMenu ? (
        <ExtensionsMegaMenu
          items={children!}
          isDark={isDark}
          getTitle={getTitle}
          isItemActive={isItemActive}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onClose={onClose}
        />
      ) : hasNestedChildren ? (
        <NestedMenuContent
          items={children!}
          isDark={isDark}
          getTitle={getTitle}
          isItemActive={isItemActive}
          onClose={onClose}
          colorSchema={colorSchema}
          primaryColor={primaryColor}
        />
      ) : (
        <SimpleMenuContent
          items={children!}
          isDark={isDark}
          getTitle={getTitle}
          isItemActive={isItemActive}
          onClose={onClose}
          colorSchema={colorSchema}
          primaryColor={primaryColor}
        />
      )}
    </motion.div>
  );
}

// New Extensions Mega Menu with 3-panel layout
function ExtensionsMegaMenu({
  items,
  isDark,
  getTitle,
  isItemActive,
  hoveredItem,
  setHoveredItem,
  selectedCategory,
  setSelectedCategory,
  onClose,
}: {
  items: MenuItem[];
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isItemActive: (item: MenuItem) => boolean;
  hoveredItem: MenuItem | null;
  setHoveredItem: (item: MenuItem | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (key: string) => void;
  onClose: () => void;
}) {
  const selectedCategoryData = items.find(c => c.key === selectedCategory);
  const colorScheme = categoryColors[selectedCategory || ""] || defaultColorScheme;

  return (
    <div className="flex h-[480px]">
      {/* Left Panel: Categories */}
      <div className={cn(
        "w-[220px] p-3 border-r shrink-0",
        isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-100 bg-zinc-50/50"
      )}>
        <div className="space-y-1">
          {items.map((category, idx) => {
            const catColor = categoryColors[category.key] || defaultColorScheme;
            const isSelected = selectedCategory === category.key;

            return (
              <motion.button
                key={category.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedCategory(category.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? cn("border", catColor.border, catColor.bg)
                    : isDark
                      ? "hover:bg-white/5 border border-transparent"
                      : "hover:bg-zinc-100 border border-transparent"
                )}
              >
                {/* Icon with glow effect when selected */}
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isSelected
                    ? cn(catColor.bg, catColor.text, "shadow-lg", catColor.glow)
                    : isDark
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-zinc-200 text-zinc-500"
                )}>
                  {category.icon && <Icon icon={category.icon} className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-semibold block truncate",
                    isSelected
                      ? catColor.text
                      : isDark ? "text-zinc-300" : "text-zinc-700"
                  )}>
                    {getTitle(category)}
                  </span>
                  <span className={cn(
                    "text-xs",
                    isDark ? "text-zinc-600" : "text-zinc-400"
                  )}>
                    {category.child?.length || 0} extensions
                  </span>
                </div>

                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  isSelected ? cn(catColor.text, "translate-x-0.5") : "text-zinc-500"
                )} />
              </motion.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={cn(
          "mt-4 pt-4 border-t",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}>
          <Link
            href="/admin/system/extension"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
              "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Manage Extensions
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Link>
        </div>
      </div>

      {/* Middle Panel: Extensions List */}
      <div className={cn(
        "w-[340px] p-3 border-r overflow-y-auto shrink-0",
        isDark ? "border-zinc-800" : "border-zinc-100"
      )}>
        <AnimatePresence mode="wait">
          {selectedCategoryData && (
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Category Header */}
              <div className={cn(
                "relative px-4 py-3 rounded-xl mb-3 overflow-hidden",
                isDark ? "bg-zinc-800/50" : "bg-zinc-100/50"
              )}>
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-30",
                  colorScheme.gradient
                )} />
                <div className="relative flex items-center gap-2">
                  <span className={cn("font-bold text-sm", colorScheme.text)}>
                    {getTitle(selectedCategoryData)}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    colorScheme.bg, colorScheme.text
                  )}>
                    {selectedCategoryData.child?.length} available
                  </span>
                </div>
              </div>

              {/* Extensions */}
              <div className="space-y-1">
                {selectedCategoryData.child?.map((ext, idx) => (
                  <ExtensionListItem
                    key={ext.key}
                    item={ext}
                    idx={idx}
                    isDark={isDark}
                    getTitle={getTitle}
                    isActive={isItemActive(ext)}
                    isHovered={hoveredItem?.key === ext.key}
                    onHover={() => setHoveredItem(ext)}
                    onClose={onClose}
                    colorScheme={colorScheme}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel: Extension Details Preview */}
      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredItem ? (
            <ExtensionPreview
              item={hoveredItem}
              isDark={isDark}
              getTitle={getTitle}
              isActive={isItemActive(hoveredItem)}
              onClose={onClose}
              colorScheme={colorScheme}
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                isDark ? "bg-zinc-800" : "bg-zinc-100"
              )}>
                <Info className={cn(
                  "w-7 h-7",
                  isDark ? "text-zinc-600" : "text-zinc-400"
                )} />
              </div>
              <p className={cn(
                "text-sm font-medium mb-1",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                Extension Details
              </p>
              <p className={cn(
                "text-xs max-w-[200px]",
                isDark ? "text-zinc-600" : "text-zinc-400"
              )}>
                Hover over an extension to see its details and features
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Extension List Item
function ExtensionListItem({
  item,
  idx,
  isDark,
  getTitle,
  isActive,
  isHovered,
  onHover,
  onClose,
  colorScheme,
}: {
  item: MenuItem;
  idx: number;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onClose: () => void;
  colorScheme: { gradient: string; bg: string; text: string; border: string; glow: string };
}) {
  const isDisabled = item.disabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
    >
      <Link
        href={isDisabled ? "#" : item.href || "#"}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
      >
        <div
          onMouseEnter={onHover}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
            isDisabled
              ? "opacity-40 cursor-not-allowed"
              : isHovered
                ? cn("border", colorScheme.border, colorScheme.bg)
                : isActive
                  ? cn("border", colorScheme.border, colorScheme.bg)
                  : isDark
                    ? "hover:bg-white/5 border border-transparent"
                    : "hover:bg-zinc-50 border border-transparent"
          )}
        >
          {/* Icon */}
          {item.icon && (
            <div className={cn(
              "p-2 rounded-lg transition-all duration-200 shrink-0",
              isHovered || isActive
                ? cn(colorScheme.bg, colorScheme.text)
                : isDark
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-zinc-100 text-zinc-500"
            )}>
              <Icon icon={item.icon} className="w-4 h-4" />
            </div>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm font-medium block",
              isHovered || isActive
                ? colorScheme.text
                : isDark ? "text-zinc-300" : "text-zinc-700"
            )}>
              {getTitle(item)}
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 shrink-0">
            {isDisabled && (
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
            )}
            {isActive && (
              <Check className={cn("w-4 h-4", colorScheme.text)} />
            )}
            {!isDisabled && !isActive && (
              <ChevronRight className={cn(
                "w-4 h-4 transition-all",
                isHovered ? cn(colorScheme.text, "translate-x-0.5") : "text-zinc-500 opacity-0 group-hover:opacity-100"
              )} />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Extension Preview Panel
function ExtensionPreview({
  item,
  isDark,
  getTitle,
  isActive,
  onClose,
  colorScheme,
}: {
  item: MenuItem;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
  colorScheme: { gradient: string; bg: string; text: string; border: string; glow: string };
}) {
  const isDisabled = item.disabled;

  return (
    <motion.div
      key={item.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className={cn(
        "relative p-4 rounded-xl mb-4 overflow-hidden",
        isDark ? "bg-zinc-800/50" : "bg-zinc-100/50"
      )}>
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-40",
          colorScheme.gradient
        )} />
        <div className="relative">
          <div className="flex items-start gap-3">
            {item.icon && (
              <div className={cn(
                "p-3 rounded-xl shrink-0",
                colorScheme.bg, colorScheme.text,
                "shadow-lg", colorScheme.glow
              )}>
                <Icon icon={item.icon} className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-lg font-bold mb-1",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                {getTitle(item)}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  colorScheme.bg, colorScheme.text
                )}>
                  Extension
                </span>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    Currently Active
                  </span>
                )}
                {isDisabled && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/20 text-zinc-400">
                    Not Installed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1">
        <h4 className={cn(
          "text-xs font-semibold uppercase tracking-wider mb-2",
          isDark ? "text-zinc-500" : "text-zinc-400"
        )}>
          Description
        </h4>
        <p className={cn(
          "text-sm leading-relaxed",
          isDark ? "text-zinc-400" : "text-zinc-600"
        )}>
          {item.description || "No description available for this extension."}
        </p>

        {/* Features if available */}
        {item.features && item.features.length > 0 && (
          <div className="mt-4">
            <h4 className={cn(
              "text-xs font-semibold uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-400"
            )}>
              Key Features
            </h4>
            <ul className="space-y-2">
              {item.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Zap className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", colorScheme.text)} />
                  <span className={cn(
                    "text-sm",
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Button */}
      {!isDisabled && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <Link href={item.href || "#"} onClick={onClose}>
            <button className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              colorScheme.bg, colorScheme.text,
              "hover:opacity-80"
            )}>
              {isActive ? "Go to Extension" : "Open Extension"}
              <ExternalLink className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Nested Menu Content (for Finance, Users, etc.) - 2-panel layout
function NestedMenuContent({
  items,
  isDark,
  getTitle,
  isItemActive,
  onClose,
  colorSchema,
  primaryColor,
}: {
  items: MenuItem[];
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isItemActive: (item: MenuItem) => boolean;
  onClose: () => void;
  colorSchema?: NavColorSchema | null;
  primaryColor?: string;
}) {
  const [hoveredCategory, setHoveredCategory] = useState<MenuItem | null>(null);

  // Auto-select first category or the one with active item
  useEffect(() => {
    const activeCategory = items.find(item =>
      isItemActive(item) || item.child?.some(c => isItemActive(c) || c.child?.some(cc => isItemActive(cc)))
    );
    if (activeCategory) {
      setHoveredCategory(activeCategory);
    } else if (items[0]) {
      setHoveredCategory(items[0]);
    }
  }, [items, isItemActive]);

  return (
    <div className="flex min-h-80">
      {/* Left Panel: Categories */}
      <div className={cn(
        "w-56 p-2.5 border-r shrink-0 overflow-y-auto space-y-1",
        isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-100 bg-zinc-50/50"
      )}>
        {items.map((category, idx) => {
          const isHovered = hoveredCategory?.key === category.key;
          const isActive = isItemActive(category) || category.child?.some(c =>
            isItemActive(c) || c.child?.some(cc => isItemActive(cc))
          );
          const hasChildren = category.child && category.child.length > 0;

          const itemContent = (
            <>
              {category.icon && (
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors shrink-0",
                    isHovered || isActive
                      ? colorSchema?.bgActive || "bg-primary/20"
                      : isDark
                        ? "bg-zinc-800 text-zinc-500"
                        : "bg-zinc-200 text-zinc-500"
                  )}
                  style={(isHovered || isActive) && primaryColor ? { color: primaryColor } : undefined}
                >
                  <Icon icon={category.icon} className="w-4 h-4" />
                </div>
              )}
              <span className="flex-1 font-medium truncate text-[13px]">{getTitle(category)}</span>
              {hasChildren && (
                <ChevronRight
                  className="w-4 h-4 transition-transform shrink-0"
                  style={isHovered && primaryColor ? { color: primaryColor } : undefined}
                />
              )}
            </>
          );

          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              {hasChildren ? (
                // Items with children - hoverable only, no cursor-pointer
                <div
                  onMouseEnter={() => setHoveredCategory(category)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                    isHovered || isActive
                      ? colorSchema?.bgActive || (isDark ? "bg-white/10 text-white" : "bg-zinc-900/5 text-zinc-900")
                      : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/5"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                  style={(isHovered || isActive) && primaryColor ? { color: primaryColor } : undefined}
                >
                  {itemContent}
                </div>
              ) : (
                // Items without children - directly clickable
                <Link href={category.href || "#"} onClick={onClose}>
                  <div
                    onMouseEnter={() => setHoveredCategory(category)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer",
                      isHovered || isActive
                        ? colorSchema?.bgActive || (isDark ? "bg-white/10 text-white" : "bg-zinc-900/5 text-zinc-900")
                        : isDark
                          ? "text-zinc-400 hover:text-white hover:bg-white/5"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                    style={(isHovered || isActive) && primaryColor ? { color: primaryColor } : undefined}
                  >
                    {itemContent}
                  </div>
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Right Panel: Category Details + Sub-items */}
      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredCategory && (
            <motion.div
              key={hoveredCategory.key}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              {/* Category Header */}
              <div className={cn(
                "relative p-4 rounded-xl mb-4 overflow-hidden",
                isDark ? "bg-zinc-800/50" : "bg-zinc-100/50"
              )}>
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: primaryColor
                      ? `linear-gradient(to bottom right, ${primaryColor}33, ${primaryColor}1a, transparent)`
                      : 'linear-gradient(to bottom right, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1), transparent)'
                  }}
                />
                <div className="relative flex items-start gap-3">
                  {hoveredCategory.icon && (
                    <div
                      className={cn(
                        "p-2.5 rounded-xl shadow-lg shrink-0",
                        colorSchema?.bgActive || "bg-primary/20"
                      )}
                      style={primaryColor ? { color: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}33` } : undefined}
                    >
                      <Icon icon={hoveredCategory.icon} className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "text-base font-bold mb-1",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {getTitle(hoveredCategory)}
                    </h3>
                    {hoveredCategory.description && (
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-zinc-400" : "text-zinc-500"
                      )}>
                        {hoveredCategory.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-items List */}
              {hoveredCategory.child && hoveredCategory.child.length > 0 && (
                <div className="flex-1 space-y-1">
                  {hoveredCategory.child.map((child, idx) => {
                    const hasNestedChild = child.child && child.child.length > 0;
                    const childIsActive = isItemActive(child) || child.child?.some(c => isItemActive(c));

                    return (
                      <motion.div
                        key={child.key}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        {hasNestedChild ? (
                          // Subcategory with children - render as expandable section
                          <div className="mb-3">
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                              isDark ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              {child.icon && <Icon icon={child.icon} className="w-3.5 h-3.5" />}
                              {getTitle(child)}
                              <span className={cn(
                                "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
                                isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-200 text-zinc-500"
                              )}>
                                {child.child?.length}
                              </span>
                            </div>
                            <div className="space-y-0.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800 ml-2">
                              {child.child?.map((nested) => {
                                const nestedIsActive = isItemActive(nested);
                                return (
                                  <Link key={nested.key} href={nested.href || "#"} onClick={onClose}>
                                    <div
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group cursor-pointer",
                                        nestedIsActive
                                          ? colorSchema?.bgActive || "bg-primary/10"
                                          : isDark
                                            ? "text-zinc-400 hover:text-white hover:bg-white/5"
                                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                                      )}
                                      style={nestedIsActive && primaryColor ? { color: primaryColor } : undefined}
                                    >
                                      {nested.icon && (
                                        <Icon icon={nested.icon} className="w-4 h-4 shrink-0" />
                                      )}
                                      <span className="flex-1 truncate">{getTitle(nested)}</span>
                                      {nestedIsActive && (
                                        <Check
                                          className="w-4 h-4 shrink-0"
                                          style={primaryColor ? { color: primaryColor } : undefined}
                                        />
                                      )}
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          // Direct link item
                          <Link href={child.href || "#"} onClick={onClose}>
                            <div
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer",
                                childIsActive
                                  ? colorSchema?.bgActive || "bg-primary/10"
                                  : isDark
                                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                              )}
                              style={childIsActive && primaryColor ? { color: primaryColor } : undefined}
                            >
                              {child.icon && (
                                <div
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors shrink-0",
                                    childIsActive
                                      ? colorSchema?.bgActive || "bg-primary/20"
                                      : isDark
                                        ? "bg-zinc-800 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
                                        : "bg-zinc-100 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
                                  )}
                                  style={childIsActive && primaryColor ? { color: primaryColor } : undefined}
                                >
                                  <Icon icon={child.icon} className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="flex-1 font-medium truncate">{getTitle(child)}</span>
                              {childIsActive ? (
                                <Check
                                  className="w-4 h-4 shrink-0"
                                  style={primaryColor ? { color: primaryColor } : undefined}
                                />
                              ) : (
                                <ArrowRight className={cn(
                                  "w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                  isDark ? "text-zinc-600" : "text-zinc-400"
                                )} />
                              )}
                            </div>
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Items without children are directly clickable from left panel - no button needed here */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Item Preview Panel for items without children
function ItemPreviewPanel({
  item,
  isDark,
  getTitle,
  isActive,
  onClose,
}: {
  item: MenuItem;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "relative p-4 rounded-xl mb-4 overflow-hidden",
        isDark ? "bg-zinc-800/50" : "bg-zinc-100/50"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-40" />
        <div className="relative flex items-start gap-3">
          {item.icon && (
            <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-lg shadow-primary/20 shrink-0">
              <Icon icon={item.icon} className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-lg font-bold mb-1",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {getTitle(item)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {isActive && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                  Currently Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1">
        <h4 className={cn(
          "text-xs font-semibold uppercase tracking-wider mb-2",
          isDark ? "text-zinc-500" : "text-zinc-400"
        )}>
          Description
        </h4>
        <p className={cn(
          "text-sm leading-relaxed",
          isDark ? "text-zinc-400" : "text-zinc-600"
        )}>
          {item.description || `Access and manage ${getTitle(item).toLowerCase()} settings and configurations.`}
        </p>
      </div>

      {/* Action Button */}
      <div className={cn(
        "mt-4 pt-4 border-t",
        isDark ? "border-zinc-800" : "border-zinc-200"
      )}>
        <Link href={item.href || "#"} onClick={onClose}>
          <button className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
            "bg-primary/10 text-primary hover:bg-primary/20"
          )}>
            {isActive ? "View Settings" : "Open"}
            <ExternalLink className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}

// Nested Menu Item
function NestedMenuItem({
  item,
  isDark,
  getTitle,
  isActive,
  onClose,
}: {
  item: MenuItem;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <Link href={item.href || "#"} onClick={onClose}>
      <motion.div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
          isActive
            ? isDark
              ? "bg-primary/10 text-primary"
              : "bg-primary/5 text-primary"
            : isDark
              ? "text-zinc-400 hover:text-white hover:bg-white/5"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
        )}
        whileHover={{ x: 2 }}
      >
        {item.icon && (
          <div className={cn(
            "p-1.5 rounded-lg transition-colors shrink-0",
            isActive
              ? "bg-primary/20 text-primary"
              : isDark
                ? "bg-zinc-800 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
                : "bg-zinc-100 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <Icon icon={item.icon} className="w-3.5 h-3.5" />
          </div>
        )}
        <span className="text-sm font-medium flex-1">{getTitle(item)}</span>
        {isActive && (
          <Check className="w-4 h-4 text-primary shrink-0" />
        )}
        {!isActive && (
          <ArrowRight className={cn(
            "w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
            isDark ? "text-zinc-600" : "text-zinc-400"
          )} />
        )}
      </motion.div>
    </Link>
  );
}

// Simple Menu Content (flat list)
function SimpleMenuContent({
  items,
  isDark,
  getTitle,
  isItemActive,
  onClose,
  colorSchema,
  primaryColor,
}: {
  items: MenuItem[];
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isItemActive: (item: MenuItem) => boolean;
  onClose: () => void;
  colorSchema?: NavColorSchema | null;
  primaryColor?: string;
}) {
  // Use theme colors or fallback to primary
  const getActiveStyles = (isActive: boolean) => {
    if (isActive && colorSchema) {
      return {
        className: colorSchema.bgActive || (isDark ? "bg-primary/10" : "bg-primary/5"),
        style: primaryColor ? { color: primaryColor } : undefined
      };
    }
    return {
      className: isActive
        ? isDark ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"
        : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
      style: undefined
    };
  };

  return (
    <div className="p-2">
      {items.map((item, idx) => {
        const isActive = isItemActive(item);
        const activeStyles = getActiveStyles(isActive);

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <Link href={item.href || "#"} onClick={onClose}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer",
                  activeStyles.className
                )}
                style={activeStyles.style}
              >
                {item.icon && (
                  <div
                    className={cn(
                      "p-1.5 rounded-lg transition-colors shrink-0",
                      isActive && colorSchema
                        ? `${colorSchema.bgActive || "bg-primary/20"}`
                        : isActive
                          ? "bg-primary/20 text-primary"
                          : isDark
                            ? "bg-zinc-800 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
                            : "bg-zinc-100 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                    style={isActive && primaryColor ? { color: primaryColor } : undefined}
                  >
                    <Icon icon={item.icon} className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{getTitle(item)}</span>
                  {item.description && (
                    <p className={cn(
                      "text-xs mt-0.5 line-clamp-1",
                      isDark ? "text-zinc-600" : "text-zinc-400"
                    )}>
                      {item.description}
                    </p>
                  )}
                </div>
                {isActive ? (
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={primaryColor ? { color: primaryColor } : undefined}
                  />
                ) : (
                  <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isDark ? "text-zinc-600" : "text-zinc-400"
                  )} />
                )}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
