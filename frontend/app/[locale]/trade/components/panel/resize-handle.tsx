"use client";

import { memo, useId } from "react";
import type React from "react";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { usePanelGroup } from "./panel-group";
import { useLayout } from "../layout/layout-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ResizeHandleProps {
  className?: string;
  defaultSizes?: [number, number];
  id?: string;
  panelType?:
    | "leftCenter"
    | "centerRight"
    | "chartData"
    | "tradingOrders"
    | "dataSplit"
    | "mainBottom";
}

export const ResizeHandle = memo(function ResizeHandle({
  className,
  defaultSizes,
  id: providedId,
  panelType,
}: ResizeHandleProps) {
  const t = useTranslations("trade/components/panel/resize-handle");
  const generatedId = useId();
  const id = providedId || generatedId;
  const { direction, startResize, resizing, resetPanelSizes } = usePanelGroup();
  const { layoutConfig } = useLayout();
  const handleRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [adjacentPanelIds, setAdjacentPanelIds] = useState<{
    id1: string | null;
    id2: string | null;
  }>({
    id1: null,
    id2: null,
  });
  const [shouldRender, setShouldRender] = useState(true);

  // Find adjacent panel IDs on mount and when DOM changes
  useEffect(() => {
    const findAdjacentPanels = () => {
      const handleElem = handleRef.current;
      if (!handleElem) return;

      const prevPanel = handleElem.previousElementSibling;
      const nextPanel = handleElem.nextElementSibling;
      if (!prevPanel || !nextPanel) {
        setShouldRender(false);
        return;
      }

      const id1 = prevPanel.getAttribute("data-panel-id");
      const id2 = nextPanel.getAttribute("data-panel-id");

      // Check if either adjacent panel is collapsed
      const isPanel1Collapsed =
        prevPanel.getAttribute("data-collapsed") === "true";
      const isPanel2Collapsed =
        nextPanel.getAttribute("data-collapsed") === "true";

      // Don't render if either panel is collapsed
      const shouldShow = !isPanel1Collapsed && !isPanel2Collapsed;
      setShouldRender(shouldShow);

      setAdjacentPanelIds({
        id1: id1,
        id2: id2,
      });
    };

    findAdjacentPanels();

    // Use a MutationObserver to detect DOM changes
    const observer = new MutationObserver(findAdjacentPanels);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-collapsed"],
    });

    return () => observer.disconnect();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const handleElem = handleRef.current;
      if (!handleElem) return;

      // Find adjacent panel IDs
      const prevPanel = handleElem.previousElementSibling;
      const nextPanel = handleElem.nextElementSibling;
      if (!prevPanel || !nextPanel) return;

      const id1 = prevPanel.getAttribute("data-panel-id");
      const id2 = nextPanel.getAttribute("data-panel-id");
      if (!id1 || !id2) return;

      const position = direction === "horizontal" ? e.clientX : e.clientY;

      startResize(id1, id2, position);
    },
    [direction, startResize]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const handleElem = handleRef.current;
      if (!handleElem || !e.touches[0]) return;

      // Find adjacent panel IDs
      const prevPanel = handleElem.previousElementSibling;
      const nextPanel = handleElem.nextElementSibling;
      if (!prevPanel || !nextPanel) return;

      const id1 = prevPanel.getAttribute("data-panel-id");
      const id2 = nextPanel.getAttribute("data-panel-id");
      if (!id1 || !id2) return;

      const touch = e.touches[0];
      const position =
        direction === "horizontal" ? touch.clientX : touch.clientY;

      startResize(id1, id2, position);
    },
    [direction, startResize]
  );

  // Handle double click to reset panel sizes
  const handleDoubleClick = useCallback(() => {
    if (!defaultSizes) {
      console.warn("No default sizes provided for resize handle");
      return;
    }

    // Get default sizes from layout config based on panel type
    let sizes: [number, number] = defaultSizes;
    if (panelType) {
      switch (panelType) {
        case "leftCenter": {
          sizes = [layoutConfig.leftPanel, layoutConfig.centerPanel];
          break;
        }
        case "centerRight": {
          sizes = [layoutConfig.centerPanel, layoutConfig.rightPanel];
          break;
        }
        case "chartData": {
          sizes = [layoutConfig.chartPanel, layoutConfig.dataPanel];
          break;
        }
        case "tradingOrders": {
          const tradingConfig = layoutConfig.panels.trading;
          const ordersConfig = layoutConfig.panels.orders;
          sizes = [tradingConfig?.size || 70, ordersConfig?.size || 30];
          break;
        }
      }
    }

    // Get the panels adjacent to this resize handle
    const resizeHandleElement = handleRef.current;
    if (!resizeHandleElement) return;

    const prevPanel = resizeHandleElement.previousElementSibling as HTMLElement;
    const nextPanel = resizeHandleElement.nextElementSibling as HTMLElement;
    if (!prevPanel || !nextPanel) return;

    const id1 = prevPanel.getAttribute("data-panel-id");
    const id2 = nextPanel.getAttribute("data-panel-id");
    if (!id1 || !id2) return;

    // Reset to default sizes
    resetPanelSizes(id1, id2, sizes[0], sizes[1]);
  }, [defaultSizes, layoutConfig, panelType, resetPanelSizes]);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Watch for resize completion and dispatch resize event
  const prevResizingRef = useRef(resizing);
  useEffect(() => {
    // When resizing changes from true to false, the resize operation has completed
    if (prevResizingRef.current === true && resizing === false) {
      // Force both standard resize and chart-specific resize events
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 50);
    }
    prevResizingRef.current = resizing;
  }, [resizing]);

  // Add dynamic side handling based on direction and panel positions
  const dynamicClassName = useMemo(() => {
    if (!handleRef.current) return "";

    const prevPanel = handleRef.current.previousElementSibling as HTMLElement;
    const nextPanel = handleRef.current.nextElementSibling as HTMLElement;

    // No dynamic classes needed if we don't have both panels
    if (!prevPanel || !nextPanel) return "";

    // Get the visual collapse sides for better positioning
    const prevPanelCollapseSide = prevPanel.getAttribute(
      "data-visual-collapse-side"
    );
    const nextPanelCollapseSide = nextPanel.getAttribute(
      "data-visual-collapse-side"
    );

    // Return appropriate classes based on adjacent panel positions
    return cn();
    // Add any specific classes based on adjacent panel positions
  }, []);

  // Don't render at all if shouldRender is false
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={handleRef}
      id={id}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative z-10 shrink-0 transition-all duration-200 group",
        direction === "horizontal"
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize",
        resizing
          ? "bg-primary/80 dark:bg-blue-500/80 opacity-100 scale-y-[1.5]"
          : "bg-zinc-300/60 dark:bg-zinc-700/80 hover:bg-primary/50 dark:hover:bg-blue-500/50 opacity-70 hover:opacity-100",
        className,
        dynamicClassName
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        willChange: resizing ? "transform, opacity" : "auto",
      }}
      data-resize-handle-id={id}
      data-adjacent-panels={`${adjacentPanelIds.id1},${adjacentPanelIds.id2}`}
      aria-hidden="false"
    >
      {/* Resize handle dots */}
      <div
        className={cn(
          "absolute flex",
          direction === "horizontal"
            ? "flex-col h-8 w-1 items-center justify-center gap-1 top-1/2 -translate-y-1/2"
            : "flex-row h-1 w-8 items-center justify-center gap-1 left-1/2 -translate-x-1/2",
          resizing && "animate-pulse"
        )}
      >
        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/70 dark:bg-zinc-400" />
        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/70 dark:bg-zinc-400" />
        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/70 dark:bg-zinc-400" />
      </div>

      {/* Tooltip for double-click hint */}
      {showTooltip && (
        <div
          className="absolute z-50 bg-popover dark:bg-zinc-800 text-popover-foreground dark:text-zinc-200 text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none animate-in fade-in duration-200"
          style={{
            [direction === "horizontal" ? "left" : "top"]: "100%",
            [direction === "horizontal" ? "top" : "left"]: "50%",
            transform:
              direction === "horizontal"
                ? "translateY(-50%)"
                : "translateX(-50%)",
            marginLeft: direction === "horizontal" ? "8px" : "0",
            marginTop: direction === "horizontal" ? "0" : "8px",
          }}
        >
          {t("double-click_to_reset")}
        </div>
      )}
    </div>
  );
});
