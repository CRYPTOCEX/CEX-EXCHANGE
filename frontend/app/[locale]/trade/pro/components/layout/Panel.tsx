"use client";

import React, { ReactNode, useState, useCallback, memo } from "react";
import { cn } from "../../utils/cn";
import { PanelHeader } from "./PanelHeader";
import { useLayout } from "../../providers/LayoutProvider";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PanelProps {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  hideHeader?: boolean;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  position?: "left" | "center" | "right" | "bottom";
  className?: string;
  headerExtra?: ReactNode;
  "data-tutorial"?: string;
}

export const Panel = memo(function Panel({
  id,
  title,
  children,
  collapsible = true,
  hideHeader = false,
  defaultSize,
  minSize = 150,
  maxSize,
  position = "center",
  className,
  headerExtra,
  "data-tutorial": dataTutorial,
}: PanelProps) {
  const { togglePanelCollapse, isPanelCollapsed } = useLayout();
  const isCollapsed = isPanelCollapsed(id);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleCollapse = useCallback(() => {
    const willBeCollapsed = !isCollapsed;
    togglePanelCollapse(id);
    // Dispatch event for other components to react to layout changes
    const eventName = willBeCollapsed ? "panel-collapsed" : "panel-expanded";
    window.dispatchEvent(new CustomEvent(eventName, { detail: { panelId: id } }));
    // Also trigger resize after a short delay to allow layout to update
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new CustomEvent("chart-resize-requested"));
    }, 50);
  }, [togglePanelCollapse, id, isCollapsed]);

  const handleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  // Determine collapse direction based on position and panel ID
  // Both Order Book and Trade are on the RIGHT side of the chart, so:
  // - When EXPANDED: icon points RIGHT (toward where they will collapse to - the right edge)
  // - When COLLAPSED: icon points LEFT (toward where they will expand to - back into view)
  const getCollapseIcon = () => {
    if (isCollapsed) {
      // When collapsed, icon points toward where panel will expand (LEFT - back into the layout)
      if (id === "orderbook" || id === "trading") {
        return <ChevronLeft size={14} />;
      }
      // Default behavior based on position
      switch (position) {
        case "left":
          return <ChevronRight size={14} />;
        case "right":
          return <ChevronLeft size={14} />;
        case "bottom":
          return <ChevronUp size={14} />;
        default:
          return <ChevronDown size={14} />;
      }
    } else {
      // When expanded, icon points toward where panel will collapse (RIGHT - to the edge)
      if (id === "orderbook" || id === "trading") {
        return <ChevronRight size={14} />;
      }
      switch (position) {
        case "left":
          return <ChevronLeft size={14} />;
        case "right":
          return <ChevronRight size={14} />;
        case "bottom":
          return <ChevronDown size={14} />;
        default:
          return <ChevronUp size={14} />;
      }
    }
  };

  if (isCollapsed) {
    // Bottom position panels are always horizontal
    // Other panels are vertical by default (CSS may override for tablet both-collapsed state)
    const isBottomPanel = position === "bottom";

    return (
      <div
        className={cn(
          "tp-panel-collapsed",
          "bg-[var(--tp-bg-secondary)]",
          "flex items-center justify-center",
          "cursor-pointer",
          "hover:bg-[var(--tp-bg-tertiary)]",
          "transition-colors",
          !isBottomPanel && "border-r border-[var(--tp-border)]"
        )}
        data-panel-id={id}
        data-panel-position={position}
        data-tutorial={dataTutorial}
        onClick={handleCollapse}
      >
        <div className={cn(
          "tp-collapsed-content",
          "flex items-center gap-1.5",
          // Bottom panels: horizontal layout
          // Side panels: vertical layout (CSS .tp-all-collapsed overrides for tablet)
          !isBottomPanel && "flex-col"
        )}>
          {getCollapseIcon()}
          <span
            className={cn(
              "tp-collapsed-title",
              "text-[var(--tp-text-secondary)] text-xs font-medium",
              // Bottom panels: horizontal text
              // Side panels: vertical text (CSS .tp-all-collapsed overrides for tablet)
              !isBottomPanel && "writing-mode-vertical"
            )}
          >
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "tp-panel",
        "flex flex-col",
        "bg-[var(--tp-bg-secondary)]",
        "overflow-hidden",
        "min-h-0", // Allow flex children to shrink properly
        isMaximized && "tp-panel-maximized fixed inset-0 z-50",
        className
      )}
      style={{ gridArea: isMaximized ? undefined : id }}
      data-panel-id={id}
      data-panel-position={position}
      data-tutorial={dataTutorial}
    >
      {!hideHeader && (
        <PanelHeader
          title={title}
          collapsible={collapsible}
          onCollapse={handleCollapse}
          onMaximize={handleMaximize}
          isMaximized={isMaximized}
          collapseIcon={getCollapseIcon()}
          extra={headerExtra}
        />
      )}

      <div className="tp-panel-content flex-1 overflow-hidden min-h-0">{children}</div>
    </div>
  );
});
