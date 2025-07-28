"use client";

import { useState } from "react";
import { BarChart3, Clock } from "lucide-react";
import ActivePositions from "./active-positions";
import CompletedPositions from "./completed-positions";
import type { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

interface MobilePositionsPanelProps {
  orders: Order[];
  currentPrice: number;
  onPositionsChange?: (positions: any[]) => void;
  className?: string;
  theme?: "dark" | "light";
}

export default function MobilePositionsPanel({
  orders,
  currentPrice,
  onPositionsChange,
  className = "",
  theme = "dark",
}: MobilePositionsPanelProps) {
  const t = useTranslations(
    "binary/components/positions/mobile-positions-panel"
  );
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Count active positions
  const activePositionsCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  // Theme-based classes
  const bgClass = theme === "dark" ? "bg-[#131722]" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const secondaryTextClass =
    theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const tabBgClass = theme === "dark" ? "bg-zinc-900" : "bg-zinc-100";
  const activeTabBgClass = theme === "dark" ? "bg-zinc-800" : "bg-zinc-200";
  const hoverTextClass =
    theme === "dark" ? "hover:text-white" : "hover:text-zinc-900";

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className}`}>
      {/* Header with tabs */}
      <div className={`flex-shrink-0 border-b ${borderClass} ${tabBgClass}`}>
        <div className="flex">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "active"
                ? `${activeTabBgClass} ${textClass} ${theme === "dark" ? "border-zinc-500" : "border-zinc-400"}`
                : `${secondaryTextClass} ${hoverTextClass} border-transparent hover:${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100/50"}`
            }`}
          >
            <Clock size={16} className="mr-2" />
            {t("Active")}
            {activePositionsCount > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  theme === "dark"
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-300 text-zinc-700"
                }`}
              >
                {activePositionsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "completed"
                ? `${activeTabBgClass} ${textClass} ${theme === "dark" ? "border-zinc-500" : "border-zinc-400"}`
                : `${secondaryTextClass} ${hoverTextClass} border-transparent hover:${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100/50"}`
            }`}
          >
            <BarChart3 size={16} className="mr-2" />
            {t("History")}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "active" ? (
          <ActivePositions
            orders={orders}
            currentPrice={currentPrice}
            onPositionsChange={onPositionsChange}
            isMobile={true}
            theme={theme}
            className="h-full"
          />
        ) : (
          <CompletedPositions
            theme={theme}
            className="h-full"
            isMobile={true}
          />
        )}
      </div>
    </div>
  );
}
