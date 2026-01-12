"use client";

import React, { memo, useState, useCallback, useEffect } from "react";
import { cn } from "../../utils/cn";
import { MobileTabBar } from "./MobileTabBar";
import { MobileHeader } from "./MobileHeader";
import type { MarketType } from "../../types/common";

type MobileTab = "chart" | "orderbook" | "trade" | "orders" | "positions";

interface MobileTradingLayoutProps {
  symbol: string;
  marketType: MarketType;
  currentPrice?: number;
  priceChange24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  onSymbolSelect: () => void;
  className?: string;
  pricePrecision?: number;
  children?: {
    chart?: React.ReactNode;
    orderbook?: React.ReactNode;
    trade?: React.ReactNode;
    orders?: React.ReactNode;
    positions?: React.ReactNode;
  };
}

export const MobileTradingLayout = memo(function MobileTradingLayout({
  symbol,
  marketType,
  currentPrice,
  priceChange24h,
  high24h,
  low24h,
  volume24h,
  onSymbolSelect,
  className,
  pricePrecision,
  children,
}: MobileTradingLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("chart");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  return (
    <div
      className={cn(
        "tp-mobile-layout flex flex-col bg-[var(--tp-bg-primary)]",
        "fixed inset-0",
        "safe-area-inset",
        className
      )}
    >
      {/* Header - Fixed height */}
      <div className="shrink-0">
        <MobileHeader
          symbol={symbol}
          currentPrice={currentPrice}
          priceChange24h={priceChange24h}
          high24h={high24h}
          low24h={low24h}
          volume24h={volume24h}
          onSymbolPress={onSymbolSelect}
          pricePrecision={pricePrecision}
        />
      </div>

      {/* Main Content Area - Takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {orientation === "landscape" ? (
          // Landscape: Side-by-side layout
          <div className="flex h-full">
            <div className="flex-1 h-full overflow-hidden">
              {children?.chart}
            </div>
            <div className="w-[300px] h-full border-l border-[var(--tp-border)] overflow-y-auto">
              {activeTab === "orderbook" && children?.orderbook}
              {activeTab === "trade" && children?.trade}
              {activeTab === "orders" && children?.orders}
              {activeTab === "positions" && children?.positions}
              {activeTab === "chart" && children?.orderbook}
            </div>
          </div>
        ) : (
          // Portrait: Single full-height panel per tab
          <div className="h-full w-full overflow-hidden">
            {activeTab === "chart" && (
              <div className="h-full w-full overflow-hidden">
                {children?.chart}
              </div>
            )}
            {activeTab === "orderbook" && (
              <div className="h-full w-full overflow-y-auto">
                {children?.orderbook}
              </div>
            )}
            {activeTab === "trade" && (
              <div className="h-full w-full overflow-y-auto">
                {children?.trade}
              </div>
            )}
            {activeTab === "orders" && (
              <div className="h-full w-full overflow-y-auto">
                {children?.orders}
              </div>
            )}
            {activeTab === "positions" && (
              <div className="h-full w-full overflow-y-auto">
                {children?.positions}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar - Fixed height */}
      <div className="shrink-0">
        <MobileTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          marketType={marketType}
        />
      </div>
    </div>
  );
});

export default MobileTradingLayout;
