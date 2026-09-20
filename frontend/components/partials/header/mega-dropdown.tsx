"use client";

import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createIsItemActive } from "@/lib/menu-active";
import { Link, usePathname } from "@/i18n/routing";
import { Icon } from "@/components/ui/icon";
import {
  ChevronRight, Sparkles, ArrowRight,
  Lock, Check, ExternalLink, Zap, Info
} from "lucide-react";
import { getAccentAlpha } from "@/lib/nav-color-schema";
import { clampToBar } from "@/lib/dropdown-clamp";
import { useTranslations } from "next-intl";

interface MegaDropdownProps {
  item: MenuItem;
  onClose: () => void;
  getTitle: (item: MenuItem) => string;
  colorSchema?: NavColorSchema | null;
  primaryColor?: string;
  secondaryColor?: string;
  gradientStyle?: string;
}

/**
 * Accent used for the selected category and the hovered extension.
 *
 * This was a four-hue map (trading=emerald, investment=violet, marketplace=amber,
 * business=blue) keyed on the category. It is the same "colour as a section
 * label" pattern that `lib/nav-color-schema.ts` carried, one level further in,
 * and it broke R2 the same way: a green pill next to an amber pill reads as two
 * different states, not two different categories.
 *
 * The `text-*-400` steps were also dark-mode values with no light variant, so in
 * light mode the selected category label sat at roughly 2:1 against white.
 *
 * One accent now. `categoryColors` stays as a lookup so `catColor` / `colorScheme`
 * call sites are untouched; every key resolves to the same object.
 */
const defaultColorScheme = {
  gradient: "from-primary/20 via-primary/10 to-transparent",
  bg: "bg-primary/10",
  text: "text-primary",
  border: "border-primary/30",
  glow: "shadow-primary/20"
};

const categoryColors: Record<string, typeof defaultColorScheme> = {
  "admin-trading-extensions": defaultColorScheme,
  "admin-automation-extensions": defaultColorScheme,
  "admin-investment-extensions": defaultColorScheme,
  "admin-marketplace-extensions": defaultColorScheme,
  "admin-business-extensions": defaultColorScheme,
};

export default function MegaDropdown({
  item,
  onClose,
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

  // Resolved across the whole dropdown rather than per item: a bare prefix test
  // marks a parent page and its own sub-page active at the same time, which is
  // why "Geo Restrictions" and "Geo Policy" both showed a checkmark. Only the
  // longest matching href wins.
  const isItemActive = useMemo(
    () => createIsItemActive(pathname, [item]),
    [pathname, item]
  );

  // Determine if this is a mega menu or regular child menu
  const isMegaMenu = item.megaMenu && item.megaMenu.length > 0;
  const children = isMegaMenu ? item.megaMenu : item.child;

  // Check if children have nested items (for partial mega menu style)
  const hasNestedChildren = children?.some(child => child.child && child.child.length > 0);

  /**
   * How far this panel has to move to stay on the screen.
   *
   * ---------------------------------------------------------------------------
   * THE MAGIC NUMBER IT REPLACES
   * ---------------------------------------------------------------------------
   * The mega panel is `w-[1000px] -left-[350px]`: a fixed width pulled a fixed
   * distance left of whichever nav item opened it. That offset was tuned by eye
   * against one layout — logo present, nav indented — and it is only ever
   * correct for that layout. Narrow the bar for the pinned assistant and shift
   * the nav flush left, and the same 350px walks a 1000px panel straight off the
   * left edge with its first column unreadable.
   *
   * It was already fragile before that: a 1000px panel offset 350px needs about
   * 1350px of room to the right of the trigger, and nothing checked.
   *
   * So the panel is measured and clamped instead. This is collision detection,
   * which is what every dropdown does, and it is correct for every layout rather
   * than for the one it was measured in — narrowed bar, wide bar, small laptop,
   * a trigger at either end of the nav.
   *
   * MEASURED FROM LAYOUT, NOT FROM THE ANIMATED BOX. Framer is mid-entrance when
   * this runs (`scale: 0.98`), and `getBoundingClientRect` on a scaled element
   * reports the scaled box — on a 1000px panel that is a 10px error each side,
   * which is the same order as the correction being computed. `offsetLeft` and
   * `offsetWidth` are layout values that transforms do not touch, and the offset
   * parent is not animated, so its rect is real.
   */
  const [nudge, setNudge] = useState(0);

  useLayoutEffect(() => {
    const el = dropdownRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;

    /*
     * THE BAR'S OWN BOX IS THE AVAILABLE WIDTH — not the viewport minus a
     * variable, which is the version of this that silently did nothing.
     *
     * Reading `--assistant-rail` off the root and `parseFloat`-ing it looks
     * obvious and returns NaN: a custom property computes AS SPECIFIED unless it
     * has been registered with `@property`, so `getPropertyValue` hands back the
     * literal string `min(26rem, 100vw)`. `parseFloat` of that is NaN, `|| 0`
     * turns it into zero, and the clamp then believes the whole viewport is
     * free — letting the panel run underneath the pinned assistant, which is the
     * bug it was written to prevent. (The same variable used inside a real
     * `calc()` resolves fine; it is only reading it back that does not.)
     *
     * The header is already narrowed to exactly the room there is, and its
     * `getBoundingClientRect()` is resolved pixels. It is also the correct
     * answer for anything else that ever narrows the bar.
     */
    const bar = el.closest("[data-site-header]") as HTMLElement | null;
    const barRight = bar
      ? bar.getBoundingClientRect().right
      : window.innerWidth;

    // Subtract the correction already applied, so this measures the panel's
    // natural position and converges instead of drifting on a re-run.
    const next = clampToBar({
      left: parent.getBoundingClientRect().left + el.offsetLeft - nudge,
      width: el.offsetWidth,
      availableRight: barRight,
    });

    if (Math.abs(next - nudge) > 0.5) setNudge(next);
    // `nudge` is read above to remove its own effect, and the guard above stops
    // this re-running once it has settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMegaMenu, hasNestedChildren, selectedCategory, nudge]);

  // Set first category as selected by default for mega menu
  useEffect(() => {
    if (isMegaMenu && children && children.length > 0 && !selectedCategory) {
      setSelectedCategory(children[0].key);
    }
  }, [isMegaMenu, children, selectedCategory]);

  return (
    <m.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      /* The clamp — see `nudge`. `marginLeft` rather than a transform, because
         framer owns `transform` here for the entrance and would overwrite it. */
      style={nudge ? { marginLeft: nudge } : undefined}
      className={cn(
        "absolute top-full left-0 mt-2 z-50",
        "rounded-2xl overflow-hidden",
        "border shadow-2xl",
        "bg-popover/98 backdrop-blur-2xl border-border shadow-shadow/40",
        /*
         * The width is capped at the room actually available, so a panel wider
         * than the screen is impossible before the clamp above even runs — on a
         * small laptop, or beside a pinned assistant, 1000px simply does not
         * fit and shifting it left would only move which half is unreadable.
         */
        isMegaMenu
          ? "w-[min(1000px,calc(100vw-var(--assistant-rail)-1.5rem))] -left-[350px]"
          : hasNestedChildren
            ? "min-w-[600px] max-w-[calc(100vw-var(--assistant-rail)-1.5rem)]"
            : "min-w-[280px] max-w-[calc(100vw-var(--assistant-rail)-1.5rem)]"
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
          getTitle={getTitle}
          isItemActive={isItemActive}
          onClose={onClose}
          colorSchema={colorSchema}
          primaryColor={primaryColor}
        />
      ) : (
        <SimpleMenuContent
          items={children!}
          getTitle={getTitle}
          isItemActive={isItemActive}
          onClose={onClose}
          colorSchema={colorSchema}
          primaryColor={primaryColor}
        />
      )}
    </m.div>
  );
}

// New Extensions Mega Menu with 3-panel layout
function ExtensionsMegaMenu({
  items,
  getTitle,
  isItemActive,
  hoveredItem,
  setHoveredItem,
  selectedCategory,
  setSelectedCategory,
  onClose,
}: {
  items: MenuItem[];
  getTitle: (item: MenuItem) => string;
  isItemActive: (item: MenuItem) => boolean;
  hoveredItem: MenuItem | null;
  setHoveredItem: (item: MenuItem | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (key: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const selectedCategoryData = items.find(c => c.key === selectedCategory);
  const colorScheme = categoryColors[selectedCategory || ""] || defaultColorScheme;

  return (
    <div className="flex h-[480px]">
      {/* Left Panel: Categories.

          `flex flex-col` with the list as the only scrolling child, rather than
          a plain block: the panel is inside a fixed 480px dropdown and had no
          overflow rule, so the category list and the "Manage Extensions" footer
          were one static column that silently clipped past the panel's height.
          Four categories fit; five is close to the limit and a sixth would have
          pushed the footer out of the dropdown with nothing to scroll it back.
          The footer is pinned, the list absorbs the growth. */}
      <div className={cn(
        "w-[220px] p-3 border-r shrink-0 flex flex-col",
        "border-border bg-surface-2/50"
      )}>
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
          {items.map((category, idx) => {
            const catColor = categoryColors[category.key] || defaultColorScheme;
            const isSelected = selectedCategory === category.key;

            return (
              <m.button
                key={category.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedCategory(category.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? cn("border", catColor.border, catColor.bg)
                    : "hover:bg-muted border border-transparent"
                )}
              >
                {/* Icon with glow effect when selected */}
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isSelected
                    ? cn(catColor.bg, catColor.text, "shadow-lg", catColor.glow)
                    : "bg-muted text-muted-foreground"
                )}>
                  {category.icon && <Icon icon={category.icon} className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-semibold block truncate",
                    isSelected
                      ? catColor.text
                      : "text-foreground"
                  )}>
                    {getTitle(category)}
                  </span>
                  <span className={cn(
                    "text-xs",
                    "text-subtle-foreground"
                  )}>
                    {category.child?.length || 0} extensions
                  </span>
                </div>

                <ChevronRight className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  isSelected ? cn(catColor.text, "translate-x-0.5") : "text-subtle-foreground"
                )} />
              </m.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={cn(
          "mt-4 pt-4 border-t shrink-0",
          "border-border"
        )}>
          <Link
            href="/admin/system/extension"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer",
              "bg-primary/10 text-primary-ink hover:bg-primary/15"
            )}
          >
            <Sparkles className="w-4 h-4" />
            {tCommon("manage_extensions")}
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Link>
        </div>
      </div>

      {/* Middle Panel: Extensions List */}
      <div className={cn(
        "w-[340px] p-3 border-r overflow-y-auto shrink-0",
        "border-border"
      )}>
        <AnimatePresence mode="wait">
          {selectedCategoryData && (
            <m.div
              key={selectedCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Category Header */}
              <div className={cn(
                "relative px-4 py-3 rounded-xl mb-3 overflow-hidden",
                "bg-muted/50"
              )}>
                <div className={cn(
                  "absolute inset-0 opacity-30",
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
                    getTitle={getTitle}
                    isActive={isItemActive(ext)}
                    isHovered={hoveredItem?.key === ext.key}
                    onHover={() => setHoveredItem(ext)}
                    onClose={onClose}
                    colorScheme={colorScheme}
                  />
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel: Extension Details Preview */}
      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredItem ? (
            <ExtensionPreview
              item={hoveredItem}
              getTitle={getTitle}
              isActive={isItemActive(hoveredItem)}
              onClose={onClose}
              colorScheme={colorScheme}
            />
          ) : (
            <m.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                "bg-muted"
              )}>
                <Info className={cn(
                  "w-7 h-7",
                  "text-subtle-foreground"
                )} />
              </div>
              <p className={cn(
                "text-sm font-medium mb-1",
                "text-muted-foreground"
              )}>
                {t("extension_details")}
              </p>
              <p className={cn(
                "text-xs max-w-[200px]",
                "text-subtle-foreground"
              )}>
                {t("hover_over_an_extension_to_see")}
              </p>
            </m.div>
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
  getTitle,
  isActive,
  isHovered,
  onHover,
  onClose,
  colorScheme,
}: {
  item: MenuItem;
  idx: number;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onClose: () => void;
  colorScheme: { gradient: string; bg: string; text: string; border: string; glow: string };
}) {
  const isDisabled = item.disabled;

  return (
    <m.div
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
                  : "hover:bg-muted border border-transparent"
          )}
        >
          {/* Icon */}
          {item.icon && (
            <div className={cn(
              "p-2 rounded-lg transition-all duration-200 shrink-0",
              isHovered || isActive
                ? cn(colorScheme.bg, colorScheme.text)
                : "bg-muted text-muted-foreground"
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
                : "text-foreground"
            )}>
              {getTitle(item)}
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 shrink-0">
            {isDisabled && (
              <Lock className="w-3.5 h-3.5 text-subtle-foreground" />
            )}
            {isActive && (
              <Check className={cn("w-4 h-4", colorScheme.text)} />
            )}
            {!isDisabled && !isActive && (
              <ChevronRight className={cn(
                "w-4 h-4 transition-all",
                isHovered ? cn(colorScheme.text, "translate-x-0.5") : "text-subtle-foreground opacity-0 group-hover:opacity-100"
              )} />
            )}
          </div>
        </div>
      </Link>
    </m.div>
  );
}

// Extension Preview Panel
function ExtensionPreview({
  item,
  getTitle,
  isActive,
  onClose,
  colorScheme,
}: {
  item: MenuItem;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
  colorScheme: { gradient: string; bg: string; text: string; border: string; glow: string };
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const isDisabled = item.disabled;

  return (
    <m.div
      key={item.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col"
    >
      {/* Header.

          `shrink-0`, because the mega menu is a fixed 480px box: an extension
          with a long feature list (Web3 Trading has seven) overflows it, and
          without this every flex child shrinks to fit. The card is
          `overflow-hidden`, so it lost ~half its height and clipped the title
          mid-glyph and the badges away entirely. The scroll below absorbs the
          overflow instead. */}
      <div className={cn(
        "relative p-4 rounded-xl mb-4 overflow-hidden shrink-0",
        "bg-muted/50"
      )}>
        <div className={cn(
          "absolute inset-0 opacity-40",
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
                "text-foreground"
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
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success-ink">
                    {t("currently_active")}
                  </span>
                )}
                {isDisabled && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {tCommon("not_installed")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <h4 className={cn(
          "text-xs font-semibold uppercase tracking-wider mb-2",
          "text-subtle-foreground"
        )}>
          {tCommon("description")}
        </h4>
        <p className={cn(
          "text-sm leading-relaxed",
          "text-muted-foreground"
        )}>
          {item.description || t("no_description_available_for_this_extension")}
        </p>

        {/* Features if available */}
        {item.features && item.features.length > 0 && (
          <div className="mt-4">
            <h4 className={cn(
              "text-xs font-semibold uppercase tracking-wider mb-2",
              "text-subtle-foreground"
            )}>
              {tCommon("key_features")}
            </h4>
            <ul className="space-y-2">
              {item.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Zap className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", colorScheme.text)} />
                  <span className={cn(
                    "text-sm",
                    "text-muted-foreground"
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
        <div className="mt-4 pt-4 border-t border-border shrink-0">
          <Link href={item.href || "#"} onClick={onClose}>
            <button className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
              colorScheme.bg, colorScheme.text,
              "hover:opacity-80"
            )}>
              {isActive ? t("go_to_extension") : t("open_extension")}
              <ExternalLink className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}
    </m.div>
  );
}

// Nested Menu Content (for Finance, Users, etc.) - 2-panel layout
function NestedMenuContent({
  items,
  getTitle,
  isItemActive,
  onClose,
  colorSchema,
  primaryColor,
}: {
  items: MenuItem[];
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
        "border-border bg-surface-2/50"
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
                      : "bg-muted text-subtle-foreground"
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
            <m.div
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
                      ? colorSchema?.bgActive || ("bg-muted text-foreground")
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                        ? colorSchema?.bgActive || ("bg-muted text-foreground")
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    style={(isHovered || isActive) && primaryColor ? { color: primaryColor } : undefined}
                  >
                    {itemContent}
                  </div>
                </Link>
              )}
            </m.div>
          );
        })}
      </div>

      {/* Right Panel: Category Details + Sub-items */}
      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {hoveredCategory && (
            <m.div
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
                "bg-muted/50"
              )}>
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: primaryColor
                      ? `linear-gradient(to bottom right, ${getAccentAlpha(0.2)}, ${getAccentAlpha(0.1)}, transparent)`
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
                      style={primaryColor ? { color: primaryColor, boxShadow: `0 10px 15px -3px ${getAccentAlpha(0.2)}` } : undefined}
                    >
                      <Icon icon={hoveredCategory.icon} className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "text-base font-bold mb-1",
                      "text-foreground"
                    )}>
                      {getTitle(hoveredCategory)}
                    </h3>
                    {hoveredCategory.description && (
                      <p className={cn(
                        "text-xs",
                        "text-subtle-foreground"
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
                      <m.div
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
                              "text-subtle-foreground"
                            )}>
                              {child.icon && <Icon icon={child.icon} className="w-3.5 h-3.5" />}
                              {getTitle(child)}
                              <span className={cn(
                                "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
                                "bg-muted text-subtle-foreground"
                              )}>
                                {child.child?.length}
                              </span>
                            </div>
                            <div className="space-y-0.5 pl-2 border-l-2 border-border ml-2">
                              {child.child?.map((nested) => {
                                const nestedIsActive = isItemActive(nested);
                                return (
                                  <Link key={nested.key} href={nested.href || "#"} onClick={onClose}>
                                    <div
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group cursor-pointer",
                                        nestedIsActive
                                          ? colorSchema?.bgActive || "bg-primary/10"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                              style={childIsActive && primaryColor ? { color: primaryColor } : undefined}
                            >
                              {child.icon && (
                                <div
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors shrink-0",
                                    childIsActive
                                      ? colorSchema?.bgActive || "bg-primary/20"
                                      : "bg-muted text-subtle-foreground group-hover:bg-primary/10 group-hover:text-primary"
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
                                  "text-subtle-foreground"
                                )} />
                              )}
                            </div>
                          </Link>
                        )}
                      </m.div>
                    );
                  })}
                </div>
              )}

              {/* Items without children are directly clickable from left panel - no button needed here */}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Item Preview Panel for items without children
function ItemPreviewPanel({
  item,
  getTitle,
  isActive,
  onClose,
}: {
  item: MenuItem;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "relative p-4 rounded-xl mb-4 overflow-hidden",
        "bg-muted/50"
      )}>
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-transparent opacity-40" />
        <div className="relative flex items-start gap-3">
          {item.icon && (
            <div className="p-3 rounded-xl bg-primary/20 text-primary-ink shadow-lg shadow-primary/20 shrink-0">
              <Icon icon={item.icon} className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-lg font-bold mb-1",
              "text-foreground"
            )}>
              {getTitle(item)}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {isActive && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success-ink">
                  {t("currently_active")}
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
          "text-subtle-foreground"
        )}>
          Description
        </h4>
        <p className={cn(
          "text-sm leading-relaxed",
          "text-muted-foreground"
        )}>
          {item.description || `Access and manage ${getTitle(item).toLowerCase()} settings and configurations.`}
        </p>
      </div>

      {/* Action Button */}
      <div className={cn(
        "mt-4 pt-4 border-t",
        "border-border"
      )}>
        <Link href={item.href || "#"} onClick={onClose}>
          <button className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer",
            "bg-primary/10 text-primary-ink hover:bg-primary/15"
          )}>
            {isActive ? t("view_settings") : tCommon("open")}
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
  getTitle,
  isActive,
  onClose,
}: {
  item: MenuItem;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <Link href={item.href || "#"} onClick={onClose}>
      <m.div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
          isActive
            ? "bg-primary/10 text-primary-ink"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        whileHover={{ x: 2 }}
      >
        {item.icon && (
          <div className={cn(
            "p-1.5 rounded-lg transition-colors shrink-0",
            isActive
              ? "bg-primary/20 text-primary-ink"
              : "bg-muted text-subtle-foreground group-hover:bg-primary/10 group-hover:text-primary"
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
            "text-subtle-foreground"
          )} />
        )}
      </m.div>
    </Link>
  );
}

// Simple Menu Content (flat list)
function SimpleMenuContent({
  items,
  getTitle,
  isItemActive,
  onClose,
  colorSchema,
  primaryColor,
}: {
  items: MenuItem[];
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
        className: colorSchema.bgActive || ("bg-primary/10"),
        style: primaryColor ? { color: primaryColor } : undefined
      };
    }
    return {
      className: isActive
        ? "bg-primary/10 text-primary-ink"
        : "text-muted-foreground hover:text-foreground hover:bg-muted",
      style: undefined
    };
  };

  return (
    <div className="p-2">
      {items.map((item, idx) => {
        const isActive = isItemActive(item);
        const activeStyles = getActiveStyles(isActive);

        return (
          <m.div
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
                          ? "bg-primary/20 text-primary-ink"
                          : "bg-muted text-subtle-foreground group-hover:bg-primary/10 group-hover:text-primary"
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
                      "text-subtle-foreground"
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
                    "text-subtle-foreground"
                  )} />
                )}
              </div>
            </Link>
          </m.div>
        );
      })}
    </div>
  );
}
