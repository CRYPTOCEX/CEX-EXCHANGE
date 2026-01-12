"use client";

import React, { ReactNode, useRef, useState, useEffect, Children, isValidElement } from "react";
import { cn } from "../../utils/cn";
import { useLayout } from "../../providers/LayoutProvider";
import type { TPLayoutConfig } from "../../types/layout";

interface GridLayoutProps {
  children: ReactNode;
  layout: TPLayoutConfig;
  mode: "pro" | "lite";
  className?: string;
}

// Breakpoints matching CSS media queries
const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  smallDesktop: 1280,
  largeDesktop: 1536,
  ultraWide: 1920,
};

// Get current breakpoint
function getBreakpoint(width: number): "mobile" | "tablet" | "smallDesktop" | "desktop" | "largeDesktop" | "ultraWide" {
  if (width < BREAKPOINTS.mobile) return "mobile";
  if (width < BREAKPOINTS.tablet) return "tablet";
  if (width < BREAKPOINTS.smallDesktop) return "smallDesktop";
  if (width < BREAKPOINTS.largeDesktop) return "desktop";
  if (width < BREAKPOINTS.ultraWide) return "largeDesktop";
  return "ultraWide";
}

export function GridLayout({
  children,
  layout,
  mode,
  className,
}: GridLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [breakpoint, setBreakpoint] = useState<ReturnType<typeof getBreakpoint>>("desktop");
  const { isPanelCollapsed, togglePanelCollapse } = useLayout();
  const hasAutoCollapsedRef = useRef(false);

  // Track window size for responsive behavior
  useEffect(() => {
    const updateBreakpoint = () => {
      const newBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(newBreakpoint);

      // Auto-collapse orders panel on tablet and smaller screens (only once on initial load)
      if (!hasAutoCollapsedRef.current && (newBreakpoint === "tablet" || newBreakpoint === "mobile" || newBreakpoint === "smallDesktop")) {
        const ordersCollapsed = isPanelCollapsed("orders");
        if (!ordersCollapsed) {
          togglePanelCollapse("orders");
        }
        hasAutoCollapsedRef.current = true;
      }
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, [isPanelCollapsed, togglePanelCollapse]);

  // Lite mode has its own layout
  const isLiteMode = mode === "lite";
  const isTablet = breakpoint === "tablet";

  // Check if both orderbook and trading panels are collapsed
  const orderbookCollapsed = isPanelCollapsed("orderbook");
  const tradingCollapsed = isPanelCollapsed("trading");
  const allBottomPanelsCollapsed = orderbookCollapsed && tradingCollapsed;

  // Separate children into categories
  const chartPanel: ReactNode[] = [];
  const sidePanels: ReactNode[] = []; // markets, orderbook, trading
  const ordersRowPanels: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const panelId = child.props?.id;
      if (panelId === "orders" || panelId === "positions") {
        ordersRowPanels.push(child);
      } else if (panelId === "chart") {
        chartPanel.push(child);
      } else {
        sidePanels.push(child);
      }
    }
  });

  // For tablet: separate orderbook and trading from markets
  const orderbookAndTradingPanels: ReactNode[] = [];
  const otherSidePanels: ReactNode[] = []; // markets only

  if (isTablet) {
    sidePanels.forEach((panel) => {
      if (isValidElement(panel)) {
        const panelId = panel.props?.id;
        if (panelId === "orderbook" || panelId === "trading") {
          orderbookAndTradingPanels.push(panel);
        } else {
          otherSidePanels.push(panel);
        }
      }
    });
  }

  // Tablet layout: Chart on top, orderbook+trading side by side below
  if (isTablet) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "tp-grid-layout",
          "flex-1",
          `tp-breakpoint-${breakpoint}`,
          isLiteMode && "tp-layout-lite",
          className
        )}
      >
        {/* Chart section */}
        <div className="tp-chart-section">
          {chartPanel}
        </div>

        {/* Orderbook and Trading side by side */}
        <div className={cn(
          "tp-bottom-panels-row",
          allBottomPanelsCollapsed && "tp-all-collapsed"
        )}>
          {orderbookAndTradingPanels}
        </div>

        {/* Orders row at bottom */}
        {ordersRowPanels.length > 0 && (
          <div className="tp-orders-row">
            {ordersRowPanels}
          </div>
        )}
      </div>
    );
  }

  // Desktop/mobile layout: all main panels in one row
  return (
    <div
      ref={containerRef}
      className={cn(
        "tp-grid-layout",
        "flex-1",
        `tp-breakpoint-${breakpoint}`,
        isLiteMode && "tp-layout-lite",
        className
      )}
    >
      {/* Main row with markets, chart, orderbook, trading */}
      <div className="tp-main-row">
        {sidePanels.filter((p) => isValidElement(p) && p.props?.id === "markets")}
        {chartPanel}
        {sidePanels.filter((p) => isValidElement(p) && p.props?.id !== "markets")}
      </div>

      {/* Orders row at bottom */}
      {ordersRowPanels.length > 0 && (
        <div className="tp-orders-row">
          {ordersRowPanels}
        </div>
      )}
    </div>
  );
}
