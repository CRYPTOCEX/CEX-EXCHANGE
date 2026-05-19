"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import {
  LineChart,
  BookOpen,
  ArrowLeftRight,
  ClipboardList
} from "lucide-react";

export type MobileTab = "chart" | "orderbook" | "trade" | "orders";

interface MobileNavigationProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  openOrdersCount?: number;
}

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  { id: "chart", label: "Chart", icon: <LineChart size={20} /> },
  { id: "orderbook", label: "Book", icon: <BookOpen size={20} /> },
  { id: "trade", label: "Trade", icon: <ArrowLeftRight size={20} /> },
  { id: "orders", label: "Orders", icon: <ClipboardList size={20} /> },
];

export const MobileNavigation = memo(function MobileNavigation({
  activeTab,
  onTabChange,
  openOrdersCount = 0,
}: MobileNavigationProps) {
  return (
    <nav className="tp-mobile-nav flex items-center justify-around h-14 bg-[var(--tp-bg-secondary)] border-t border-[var(--tp-border)] shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 h-full",
            "transition-colors relative",
            activeTab === tab.id
              ? "text-[var(--tp-blue)]"
              : "text-[var(--tp-text-muted)] active:text-[var(--tp-text-secondary)]"
          )}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>

          {/* Badge for orders count */}
          {tab.id === "orders" && openOrdersCount > 0 && (
            <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-[var(--tp-red)] text-white rounded-full">
              {openOrdersCount > 99 ? "99+" : openOrdersCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
});
