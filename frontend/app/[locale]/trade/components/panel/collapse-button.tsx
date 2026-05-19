"use client";

import type React from "react";
import { useLayout } from "../layout/layout-context";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanelGroup } from "./panel-group";

interface CollapseButtonProps {
  groupId?: string; // For panel groups
  panelId?: string; // For individual panels
  side?: "start" | "end" | "top" | "bottom";
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function CollapseButton({
  groupId,
  panelId,
  side = "end",
  isCollapsed,
  onToggle,
  className,
}: CollapseButtonProps) {
  const {
    getPanelGroupConfig,
    togglePanelGroupCollapse,
    isPanelGroupCollapsed,
    layoutConfig,
    getPanelConfig,
  } = useLayout();

  // Try to get panel group context if available
  let panelGroupContext;
  try {
    panelGroupContext = usePanelGroup();
  } catch (e) {
    panelGroupContext = undefined;
  }

  // Determine if we're handling a panel group or individual panel
  const isPanelGroup = !!groupId;

  // For panel groups
  const groupConfig = groupId ? getPanelGroupConfig(groupId) : undefined;
  const groupCollapsed = groupId ? isPanelGroupCollapsed(groupId) : false;

  // For individual panels
  const panelConfig = panelId ? getPanelConfig(panelId) : undefined;

  // Use provided collapse state or determine from context
  const collapsed =
    isCollapsed !== undefined
      ? isCollapsed
      : isPanelGroup
        ? groupCollapsed
        : false;

  // If it's a panel group, check if it should be visible
  if (isPanelGroup) {
    // Don't render the button if the panel group is not visible or not collapsible
    if (!groupConfig?.collapsible || !groupConfig?.visible) return null;

    // Check if the panel group has any visible panels
    const hasVisiblePanels = Object.entries(layoutConfig.panels).some(
      ([_, panelConfig]) =>
        panelConfig.container === groupId && panelConfig.visible
    );

    // For top and bottom groups that don't have dedicated containers
    const hasContent =
      groupId === "top"
        ? layoutConfig.topPanel > 0
        : groupId === "bottom"
          ? layoutConfig.bottomPanel > 0
          : groupId === "left"
            ? layoutConfig.leftPanel > 0
            : groupId === "right"
              ? layoutConfig.rightPanel > 0
              : hasVisiblePanels;

    // Don't render the button if there are no visible panels in this group
    if (!hasContent && !collapsed) return null;
  }

  // Handle the click event
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling

    if (onToggle) {
      onToggle();
    } else if (groupId) {
      togglePanelGroupCollapse(groupId);
    }

    // Force a resize event to update layout and emit custom events
    setTimeout(() => {
      if (groupId) {
        const isCollapsed = isPanelGroupCollapsed(groupId);
        window.dispatchEvent(
          new CustomEvent(
            isCollapsed ? "panel-group-collapsed" : "panel-group-expanded",
            {
              detail: { groupId: groupId },
            }
          )
        );
      }
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new CustomEvent("chart-resize-requested"));
    }, 50);
  };

  // Determine the effective side for the button
  const effectiveSide =
    side ||
    (isPanelGroup
      ? groupId === "left"
        ? "start"
        : groupId === "right"
          ? "end"
          : groupId === "top"
            ? "top"
            : "bottom"
      : "end");

  // Determine button classes based on group/panel and side
  let buttonClasses = "collapse-button ";
  let icon;

  // Get the appropriate icon based on side and collapsed state
  switch (effectiveSide) {
    case "start":
      buttonClasses += "collapse-button-left";
      icon = collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />;
      break;
    case "end":
      buttonClasses += "collapse-button-right";
      icon = collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />;
      break;
    case "top":
      buttonClasses += "collapse-button-top";
      icon = collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
      break;
    case "bottom":
      buttonClasses += "collapse-button-bottom";
      icon = collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
      break;
  }

  // Add unique identifier for this specific button
  const buttonId = isPanelGroup ? `group-${groupId}` : `panel-${panelId}`;

  return (
    <div
      className={cn(
        buttonClasses,
        "flex items-center justify-center bg-muted/80 dark:bg-zinc-800/80 hover:bg-muted/90 dark:hover:bg-zinc-700/90 transition-colors",
        isPanelGroup
          ? `panel-group-collapse-button group-${groupId}`
          : `panel-collapse-button panel-${panelId}`,
        className
      )}
      onClick={handleClick}
      data-panel-button-id={panelId || groupId}
      data-button-id={buttonId}
      data-side={effectiveSide}
    >
      {icon}
    </div>
  );
}
