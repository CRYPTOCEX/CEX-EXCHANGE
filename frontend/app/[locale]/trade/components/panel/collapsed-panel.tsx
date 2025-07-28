"use client";

import type React from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutPanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface CollapsedPanelProps {
  title?: string;
  icon?: React.ReactNode;
  side: "start" | "end" | "top" | "bottom";
  isHovered: boolean;
  onClick: () => void;
  direction: "horizontal" | "vertical";
}

export function CollapsedPanel({
  title,
  icon,
  side,
  isHovered,
  onClick,
  direction,
}: CollapsedPanelProps) {
  const defaultIcon = <LayoutPanelLeft className="h-3 w-3" />;

  // Get the appropriate collapse icon based on the side
  const getCollapseIcon = useCallback(() => {
    if (side === "start") {
      return <ChevronRight className="h-3 w-3" />;
    } else if (side === "end") {
      return <ChevronLeft className="h-3 w-3" />;
    } else if (side === "top") {
      return <ChevronDown className="h-3 w-3" />;
    } else {
      // bottom
      return <ChevronUp className="h-3 w-3" />;
    }
  }, [side]);

  // Determine if this is a vertical or horizontal collapsed panel
  const isVertical = side === "start" || side === "end";

  return (
    <div
      className={cn(
        "flex items-center justify-center h-full w-full transition-all duration-300 cursor-pointer select-none",
        "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400",
        "border-zinc-200 dark:border-zinc-800",
        isHovered &&
          "hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300",
        isVertical ? "flex-col" : "flex-row",
        direction === "horizontal"
          ? isVertical
            ? "w-[30px]"
            : ""
          : isVertical
            ? ""
            : "h-[30px]",
        title === "Orders" && "border-t border-zinc-200 dark:border-zinc-800"
      )}
      onClick={onClick}
      aria-label={`Expand ${title || ""} panel`}
      data-collapsed-side={side}
    >
      {isVertical ? (
        // Vertical layout (left/right sides)
        <div className="flex flex-col items-center justify-between h-full py-4">
          <div className="flex-shrink-0">{icon || defaultIcon}</div>
          {title && (
            <div className="vertical-text tracking-wider font-medium text-[10px] my-3">
              {title}
            </div>
          )}
          <div className="flex-shrink-0 mt-auto">{getCollapseIcon()}</div>
        </div>
      ) : (
        // Horizontal layout (top/bottom sides)
        <div className="flex items-center justify-between w-full h-full px-4">
          <div className="flex-shrink-0">{icon || defaultIcon}</div>
          {title && (
            <span className="text-xs font-medium flex-grow text-center">
              {title}
            </span>
          )}
          <div className="flex-shrink-0">{getCollapseIcon()}</div>
        </div>
      )}
    </div>
  );
}
