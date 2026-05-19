"use client";

/**
 * Swipeable Tabs Component
 *
 * Mobile-optimized tab navigation with:
 * - Swipe gestures to switch tabs
 * - Smooth animated transitions
 * - Haptic feedback
 * - Indicator dot animation
 */

import { useState, useCallback, useRef, useEffect, memo, ReactNode } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { triggerHapticFeedback } from "../../hooks/use-gestures";

// ============================================================================
// TYPES
// ============================================================================

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: number;
}

export interface SwipeableTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  /** Threshold distance for completing swipe (default: 100) */
  swipeThreshold?: number;
  /** Enable/disable swipe gestures (default: true) */
  swipeEnabled?: boolean;
  /** Show bottom tab bar (default: true) */
  showTabBar?: boolean;
  /** Custom tab bar className */
  tabBarClassName?: string;
  /** Custom content className */
  contentClassName?: string;
  /** Enable haptic feedback (default: true) */
  hapticEnabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SwipeableTabs = memo(function SwipeableTabs({
  tabs,
  activeTabId,
  onTabChange,
  swipeThreshold = 100,
  swipeEnabled = true,
  showTabBar = true,
  tabBarClassName = "",
  contentClassName = "",
  hapticEnabled = true,
}: SwipeableTabsProps) {
  const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);

  // Motion values for drag animation
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useRef(0);

  // Update container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        containerWidth.current = containerRef.current.offsetWidth;
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Handle swipe
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = swipeThreshold;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      // Determine if swipe should complete
      const shouldComplete = Math.abs(offset) > threshold || Math.abs(velocity) > 500;

      if (shouldComplete) {
        const direction = offset > 0 ? "right" : "left";
        const newIndex = direction === "left"
          ? Math.min(activeIndex + 1, tabs.length - 1)
          : Math.max(activeIndex - 1, 0);

        if (newIndex !== activeIndex) {
          if (hapticEnabled) {
            triggerHapticFeedback("selection");
          }
          onTabChange(tabs[newIndex].id);
        }
      }

      setDragDirection(null);
    },
    [activeIndex, tabs, onTabChange, swipeThreshold, hapticEnabled]
  );

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const direction = info.offset.x > 0 ? "right" : "left";
      if (direction !== dragDirection) {
        setDragDirection(direction);
      }
    },
    [dragDirection]
  );

  // Tab bar click handler
  const handleTabClick = useCallback(
    (tabId: string) => {
      if (hapticEnabled) {
        triggerHapticFeedback("light");
      }
      onTabChange(tabId);
    },
    [onTabChange, hapticEnabled]
  );

  // Calculate drag constraints
  const canSwipeLeft = activeIndex < tabs.length - 1;
  const canSwipeRight = activeIndex > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content Area */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${contentClassName}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTabId}
            initial={{ x: dragDirection === "left" ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dragDirection === "left" ? -300 : 300, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 0.8,
            }}
            drag={swipeEnabled ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{
              left: canSwipeLeft ? 0.2 : 0.05,
              right: canSwipeRight ? 0.2 : 0.05,
            }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
            style={{ x }}
          >
            {tabs[activeIndex]?.content}
          </motion.div>
        </AnimatePresence>

        {/* Swipe hint indicators */}
        {swipeEnabled && (
          <>
            {canSwipeLeft && (
              <motion.div
                className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-blue-500/20 to-transparent"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: dragDirection === "left" ? 0.5 : 0
                }}
                transition={{ duration: 0.2 }}
              />
            )}
            {canSwipeRight && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-blue-500/20 to-transparent"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: dragDirection === "right" ? 0.5 : 0
                }}
                transition={{ duration: 0.2 }}
              />
            )}
          </>
        )}
      </div>

      {/* Tab Bar */}
      {showTabBar && (
        <div
          className={`flex items-center justify-around border-t border-zinc-800 bg-zinc-950 px-2 py-1 pb-safe-or-2 ${tabBarClassName}`}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-2 px-3 rounded-lg transition-colors ${
                  isActive
                    ? "text-blue-500"
                    : "text-zinc-500 active:bg-zinc-800"
                }`}
              >
                {/* Icon with badge */}
                <div className="relative">
                  {tab.icon}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-blue-500 text-white rounded-full flex items-center justify-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-blue-500" : "text-zinc-500"}`}>
                  {tab.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-px left-4 right-4 h-0.5 bg-blue-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// PAGE INDICATOR DOTS
// ============================================================================

export interface PageIndicatorProps {
  totalPages: number;
  currentPage: number;
  onPageClick?: (page: number) => void;
  className?: string;
}

export const PageIndicator = memo(function PageIndicator({
  totalPages,
  currentPage,
  onPageClick,
  className = "",
}: PageIndicatorProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: totalPages }).map((_, index) => {
        const isActive = index === currentPage;

        return (
          <button
            key={index}
            onClick={() => onPageClick?.(index)}
            className={`transition-all duration-200 rounded-full ${
              isActive
                ? "w-6 h-2 bg-blue-500"
                : "w-2 h-2 bg-zinc-600 hover:bg-zinc-500"
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        );
      })}
    </div>
  );
});

export default SwipeableTabs;
