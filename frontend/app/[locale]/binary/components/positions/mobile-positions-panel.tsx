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
  const t = useTranslations("common");
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Count active positions
  const activePositionsCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  // Theme-based classes
  const bgClass = theme === "dark" ? "bg-zinc-950" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const secondaryTextClass =
    theme === "dark" ? "text-zinc-500" : "text-zinc-600";

  return (
    <div className={`flex flex-col h-full ${bgClass} ${className}`}>
      {/* Header with tabs */}
      <div className={`flex-shrink-0 border-b ${borderClass} ${theme === "dark" ? "bg-zinc-900" : "bg-zinc-100"}`}>
        <div className="flex">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "active"
                ? `${textClass} ${theme === "dark" ? "border-orange-500 bg-zinc-800/50" : "border-orange-500 bg-white"}`
                : `${secondaryTextClass} border-transparent ${theme === "dark" ? "hover:bg-zinc-800/30 hover:text-zinc-300" : "hover:bg-zinc-200 hover:text-zinc-700"}`
            }`}
          >
            <Clock size={16} className="mr-2" />
            {t("active")}
            {activePositionsCount > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  theme === "dark"
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-orange-100 text-orange-600"
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
                ? `${textClass} ${theme === "dark" ? "border-orange-500 bg-zinc-800/50" : "border-orange-500 bg-white"}`
                : `${secondaryTextClass} border-transparent ${theme === "dark" ? "hover:bg-zinc-800/30 hover:text-zinc-300" : "hover:bg-zinc-200 hover:text-zinc-700"}`
            }`}
          >
            <BarChart3 size={16} className="mr-2" />
            {t("history")}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className={`flex-1 overflow-hidden ${theme === "dark" ? "bg-zinc-950" : "bg-white"}`}>
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
