"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

export type MarketTab = "favorites" | "spot" | "futures" | "eco" | "new";

interface MarketTabsProps {
  activeTab: MarketTab;
  onChange: (tab: MarketTab) => void;
  favoritesCount?: number;
}

const tabs: { id: MarketTab; label: string; icon?: React.ReactNode }[] = [
  {
    id: "favorites",
    label: "Favorites",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  { id: "spot", label: "Spot" },
  { id: "futures", label: "Futures" },
  { id: "eco", label: "Eco" },
  { id: "new", label: "New" },
];

export const MarketTabs = memo(function MarketTabs({
  activeTab,
  onChange,
  favoritesCount = 0,
}: MarketTabsProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--tp-border)] overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5",
            "px-3 py-1.5",
            "text-xs font-medium",
            "rounded",
            "whitespace-nowrap",
            "transition-colors",
            activeTab === tab.id
              ? "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]"
              : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] hover:bg-[var(--tp-bg-tertiary)]"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.id === "favorites" && favoritesCount > 0 && (
            <span className="px-1 py-0.5 text-[10px] bg-[var(--tp-yellow)]/20 text-[var(--tp-yellow)] rounded">
              {favoritesCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

export default MarketTabs;
