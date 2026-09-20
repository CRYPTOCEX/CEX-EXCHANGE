"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock } from "lucide-react";
import ActivePositions from "./active-positions";
// History renders the live trades table. The drawer this panel originally used
// (completed-positions.tsx) was superseded by the analytics surface and removed;
// RecentTradesTable is the maintained component behind the analytics dashboard.
import { RecentTradesTable } from "../analytics/recent-trades-table";
import { useBinaryStore, type Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import { CountBadge, IndicatorTab } from "../binary-ui";

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

  const { fetchCompletedOrders, completedOrders, tradingMode } = useBinaryStore();

  // Same demo/real split the analytics dashboard applies, so history never mixes modes.
  const filteredCompletedOrders = useMemo(
    () => completedOrders.filter((order) => order.isDemo === (tradingMode === "demo")),
    [completedOrders, tradingMode]
  );

  // Fetch lazily: only when the user actually opens History.
  useEffect(() => {
    if (activeTab === "completed") {
      void fetchCompletedOrders();
    }
  }, [activeTab, tradingMode, fetchCompletedOrders]);

  // Count active positions
  const activePositionsCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header with tabs - flat design matching desktop */}
      <div className="shrink-0 border-b border-border">
        <div className="flex h-10">
          <IndicatorTab
            active={activeTab === "active"}
            onClick={() => setActiveTab("active")}
            className="gap-2 text-sm font-medium"
          >
            <Clock size={14} />
            <span>{t("active")}</span>
            <CountBadge count={activePositionsCount} className="rounded-none" />
          </IndicatorTab>
          <IndicatorTab
            active={activeTab === "completed"}
            onClick={() => setActiveTab("completed")}
            className="gap-2 text-sm font-medium"
          >
            <BarChart3 size={14} />
            <span>{t("history")}</span>
          </IndicatorTab>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden bg-background">
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
          <div className="h-full overflow-y-auto">
            <RecentTradesTable trades={filteredCompletedOrders} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
