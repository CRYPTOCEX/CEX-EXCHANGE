"use client";

import React, { memo, useRef, useState, useCallback, useEffect } from "react";
import { cn } from "../../utils/cn";

type MobileTab = "chart" | "orderbook" | "trade" | "orders" | "positions";

interface SwipeablePanelProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  children: React.ReactNode;
  className?: string;
}

const TABS_ORDER: MobileTab[] = ["chart", "orderbook", "trade", "orders", "positions"];

export const SwipeablePanel = memo(function SwipeablePanel({
  activeTab,
  onTabChange,
  children,
  className,
}: SwipeablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false);

  const currentIndex = TABS_ORDER.indexOf(activeTab);
  const swipeThreshold = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
    setIsHorizontalSwipe(false);
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;

      // Determine swipe direction on first significant move
      if (!isHorizontalSwipe && Math.abs(deltaX) > 10) {
        // Only consider horizontal if it's more horizontal than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          setIsHorizontalSwipe(true);
        }
      }

      if (isHorizontalSwipe) {
        // Prevent vertical scroll during horizontal swipe
        e.preventDefault();
        setTouchDelta(deltaX);
      }
    },
    [touchStart, isHorizontalSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !isHorizontalSwipe) {
      setTouchStart(null);
      setTouchDelta(0);
      return;
    }

    if (touchDelta > swipeThreshold && currentIndex > 0) {
      // Swipe right - go to previous tab
      onTabChange(TABS_ORDER[currentIndex - 1]);
    } else if (touchDelta < -swipeThreshold && currentIndex < TABS_ORDER.length - 1) {
      // Swipe left - go to next tab
      onTabChange(TABS_ORDER[currentIndex + 1]);
    }

    setTouchStart(null);
    setTouchDelta(0);
    setIsHorizontalSwipe(false);
  }, [touchStart, touchDelta, currentIndex, onTabChange, isHorizontalSwipe]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onTabChange(TABS_ORDER[currentIndex - 1]);
      } else if (e.key === "ArrowRight" && currentIndex < TABS_ORDER.length - 1) {
        onTabChange(TABS_ORDER[currentIndex + 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, onTabChange]);

  // Calculate visual offset during swipe
  const visualOffset = isHorizontalSwipe
    ? Math.max(-50, Math.min(50, touchDelta * 0.3))
    : 0;

  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="h-full transition-transform duration-150 ease-out"
        style={{
          transform: `translateX(${visualOffset}px)`,
        }}
      >
        {children}
      </div>

      {/* Swipe Indicators */}
      {isHorizontalSwipe && Math.abs(touchDelta) > 20 && (
        <>
          {touchDelta > 0 && currentIndex > 0 && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-[var(--tp-bg-elevated)]/80 rounded-r-lg">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--tp-text-secondary)]"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
          )}
          {touchDelta < 0 && currentIndex < TABS_ORDER.length - 1 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-[var(--tp-bg-elevated)]/80 rounded-l-lg">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--tp-text-secondary)]"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          )}
        </>
      )}

      {/* Page Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {TABS_ORDER.map((tab, index) => (
          <div
            key={tab}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              index === currentIndex
                ? "w-4 bg-[var(--tp-blue)]"
                : "bg-[var(--tp-text-muted)]/30"
            )}
          />
        ))}
      </div>
    </div>
  );
});

export default SwipeablePanel;
