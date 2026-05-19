"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../utils/cn";
import type { MarketType } from "../../types/common";

type MobileTab = "chart" | "orderbook" | "trade" | "orders" | "positions";

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  marketType?: MarketType;
  className?: string;
}

const ALL_TABS: { id: MobileTab; label: string; icon: React.ReactNode; futuresOnly?: boolean }[] = [
  {
    id: "chart",
    label: "Chart",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-4 4" />
      </svg>
    ),
  },
  {
    id: "orderbook",
    label: "Orderbook",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 12h18" />
        <path d="M12 3v18" />
      </svg>
    ),
  },
  {
    id: "trade",
    label: "Trade",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    id: "positions",
    label: "Positions",
    futuresOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

export const MobileTabBar = memo(function MobileTabBar({
  activeTab,
  onTabChange,
  marketType = "spot",
  className,
}: MobileTabBarProps) {
  // Filter tabs based on market type
  const tabs = useMemo(() => {
    return ALL_TABS.filter(tab => {
      // Show positions only for futures
      if (tab.futuresOnly && marketType !== "futures") {
        return false;
      }
      return true;
    });
  }, [marketType]);

  return (
    <nav
      className={cn(
        "flex items-center justify-around",
        "px-2 py-1",
        "bg-[var(--tp-bg-secondary)]",
        "border-t border-[var(--tp-border)]",
        "safe-area-inset-bottom",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-0.5",
              "py-2 px-3",
              "rounded-lg",
              "transition-colors",
              isActive
                ? "text-[var(--tp-blue)]"
                : "text-[var(--tp-text-muted)]"
            )}
          >
            <span
              className={cn(
                "transition-transform",
                isActive && "scale-110"
              )}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

export default MobileTabBar;
