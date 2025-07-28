"use client";

import type React from "react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { usePanelGroup } from "./panel-group";
import { LayoutPanelLeft } from "lucide-react";
import { useLayout } from "../layout/layout-context";
import { CollapseButton } from "./collapse-button";
import { CollapsedPanel } from "./collapsed-panel";

interface PanelProps {
  children: React.ReactNode;
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  collapsible?: boolean;
  collapsedSize?: number;
  collapseSide?: "start" | "end" | "top" | "bottom";
  title?: string;
  icon?: React.ReactNode;
  onCollapse?: (collapsed: boolean) => void;
  defaultCollapsed?: boolean;
  panelId?: string;
}

export const Panel = memo(function Panel({
  children,
  defaultSize,
  minSize,
  maxSize,
  className,
  collapsible = true,
  collapsedSize = 2,
  collapseSide = "start",
  title,
  icon,
  onCollapse,
  defaultCollapsed = false,
  panelId,
}: PanelProps) {
  // Create stable ID reference
  const generatedId = useId();
  const idRef = useRef(generatedId);

  // Get context and layout
  const {
    direction,
    panels,
    updatePanelSize,
    updatePanelCollapsed,
    expandSibling,
  } = usePanelGroup();
  const { layoutConfig } = useLayout();

  // Local state
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const prevSizeRef = useRef(defaultSize);
  const hasRegisteredRef = useRef(false);

  // Special handling for specific panels
  const isOrderbook = panelId === "orderbook";
  const isChart = panelId === "chart";
  const isBottomPanel = panelId === "bottom" || panelId === "orders";
  const effectiveCollapseSide = isOrderbook ? "bottom" : collapseSide;
  const effectiveMaxSize = isBottomPanel ? 50 : maxSize;

  // Get data collapse side for proper resizing
  const getDataCollapseSide = useCallback(() => {
    if (isOrderbook) return "bottom";

    if (direction === "horizontal") {
      if (effectiveCollapseSide === "top") return "start";
      if (effectiveCollapseSide === "bottom") return "end";
      return effectiveCollapseSide;
    } else {
      if (effectiveCollapseSide === "start") return "top";
      if (effectiveCollapseSide === "end") return "bottom";
      return effectiveCollapseSide;
    }
  }, [direction, effectiveCollapseSide, isOrderbook]);

  const dataCollapseSide = getDataCollapseSide();

  // 1️⃣ Register ONCE after mount in useLayoutEffect
  useLayoutEffect(() => {
    if (hasRegisteredRef.current) return;

    if (defaultCollapsed && collapsible) {
      updatePanelSize(idRef.current, collapsedSize);
      updatePanelCollapsed(idRef.current, true, dataCollapseSide);
      prevSizeRef.current = defaultSize;
    } else {
      updatePanelSize(idRef.current, defaultSize);
    }

    hasRegisteredRef.current = true;
  }, [
    defaultSize,
    defaultCollapsed,
    collapsible,
    collapsedSize,
    updatePanelSize,
    updatePanelCollapsed,
    dataCollapseSide,
  ]);

  // Get panel size from context
  const panel = panels.find((p) => p.id === idRef.current);
  const size = panel?.size || defaultSize;

  // 2️⃣ Toggle collapse in useCallback
  const toggleCollapse = useCallback(() => {
    setIsTransitioning(true);

    if (isCollapsed) {
      // Expanding
      updatePanelSize(idRef.current, prevSizeRef.current);
      updatePanelCollapsed(idRef.current, false);
      setIsCollapsed(false);
      onCollapse?.(false);

      // Emit custom event for chart resize
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("panel-expanded", { detail: { panelId: panelId } })
        );
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 50);
    } else {
      // Collapsing
      prevSizeRef.current = size;
      updatePanelSize(idRef.current, collapsedSize);
      updatePanelCollapsed(idRef.current, true, dataCollapseSide);
      expandSibling(idRef.current);
      setIsCollapsed(true);
      onCollapse?.(true);

      // Emit custom event for chart resize
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("panel-collapsed", { detail: { panelId: panelId } })
        );
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("chart-resize-requested"));
      }, 50);
    }

    // Reset transition state after animation completes
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [
    isCollapsed,
    size,
    collapsedSize,
    updatePanelSize,
    updatePanelCollapsed,
    expandSibling,
    onCollapse,
    dataCollapseSide,
    panelId,
  ]);

  // Apply size directly to DOM for better performance
  useLayoutEffect(() => {
    if (panelRef.current) {
      panelRef.current.style.width =
        direction === "horizontal" ? `${size}%` : "100%";
      panelRef.current.style.height =
        direction === "vertical" ? `${size}%` : "100%";
    }
  }, [size, direction]);

  // Mouse event handlers
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Check if this panel should show its collapse button
  const shouldShowCollapseButton = useCallback(() => {
    if (isChart || isOrderbook) return true;
    if (!panelId || !collapsible) return false;

    const panelConfig = layoutConfig.panels[panelId];
    if (!panelConfig) return true;

    const container = panelConfig.container || "center";
    let visiblePanelsInContainer = 0;

    Object.values(layoutConfig.panels).forEach((panel) => {
      if (panel.container === container && panel.visible) {
        visiblePanelsInContainer++;
      }
    });

    return visiblePanelsInContainer > 1;
  }, [panelId, collapsible, layoutConfig.panels, isChart, isOrderbook]);

  // Button position and styles
  const getCollapseButtonPosition = useCallback(() => {
    if (effectiveCollapseSide === "start") return "top-0 left-0";
    if (effectiveCollapseSide === "end") return "top-0 right-0";
    if (effectiveCollapseSide === "top")
      return "top-0 left-1/2 -translate-x-1/2";
    return "bottom-0 left-1/2 -translate-x-1/2"; // bottom
  }, [effectiveCollapseSide]);

  const getCollapseButtonBorderStyles = useCallback(() => {
    if (effectiveCollapseSide === "start")
      return "rounded-r-sm border border-l-0";
    if (effectiveCollapseSide === "end")
      return "rounded-l-sm border border-r-0";
    if (effectiveCollapseSide === "top")
      return "rounded-b-sm border border-t-0";
    return "rounded-t-sm border border-b-0"; // bottom
  }, [effectiveCollapseSide]);

  const showCollapseButton =
    (isChart || isOrderbook || shouldShowCollapseButton()) && !isCollapsed;
  const defaultIcon = <LayoutPanelLeft className="h-3 w-3" />;

  return (
    <div
      ref={panelRef}
      className={cn(
        "group overflow-hidden relative transition-all duration-300 ease-in-out",
        isTransitioning && "transition-all duration-300 ease-in-out",
        isCollapsed ? "flex items-center justify-center" : "",
        // move collapsed panel to the start if it's collapsing from the "start" or "top"
        isCollapsed &&
          (dataCollapseSide === "start" || dataCollapseSide === "top") &&
          "order-first",
        // move collapsed panel to the end if it's collapsing from the "end" or "bottom"
        isCollapsed &&
          (dataCollapseSide === "end" || dataCollapseSide === "bottom") &&
          "order-last",
        className,
        "bg-background dark:bg-zinc-950"
      )}
      style={{
        [direction === "horizontal" ? "width" : "height"]: `${size}%`,
        minWidth:
          direction === "horizontal" && minSize && !isCollapsed
            ? `${minSize}%`
            : undefined,
        maxWidth:
          direction === "horizontal" && effectiveMaxSize
            ? `${effectiveMaxSize}%`
            : undefined,
        minHeight:
          direction === "vertical" && minSize && !isCollapsed
            ? `${minSize}%`
            : undefined,
        maxHeight:
          direction === "vertical" && effectiveMaxSize
            ? `${effectiveMaxSize}%`
            : undefined,
        flexShrink: isCollapsed ? 0 : 1,
        flexGrow: isCollapsed ? 0 : 1,
        willChange: isTransitioning ? "width, height" : "auto",
      }}
      data-panel-id={idRef.current}
      data-collapsed={isCollapsed ? "true" : "false"}
      data-collapse-side={dataCollapseSide}
      data-visual-collapse-side={effectiveCollapseSide}
      data-panel-name={panelId}
      data-hovered={isHovered ? "true" : "false"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!isCollapsed && showCollapseButton && (
        <CollapseButton
          panelId={panelId}
          side={effectiveCollapseSide}
          isCollapsed={isCollapsed}
          onToggle={toggleCollapse}
          className={cn(
            "absolute z-20 p-0",
            effectiveCollapseSide === "start" || effectiveCollapseSide === "end"
              ? "h-40px w-12px"
              : "h-12px w-40px",
            "opacity-0 group-data-[hovered=true]:opacity-100 hover:opacity-100",
            getCollapseButtonPosition(),
            getCollapseButtonBorderStyles(),
            "border-border dark:border-zinc-800"
          )}
        />
      )}

      {isCollapsed ? (
        <CollapsedPanel
          title={title}
          icon={icon || defaultIcon}
          side={effectiveCollapseSide}
          isHovered={isHovered}
          onClick={toggleCollapse}
          direction={direction}
        />
      ) : (
        <div className="h-full w-full">{children}</div>
      )}
    </div>
  );
});
