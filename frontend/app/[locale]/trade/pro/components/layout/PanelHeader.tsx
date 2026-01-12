"use client";

import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Maximize2, Minimize2 } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  collapsible?: boolean;
  onCollapse?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  collapseIcon?: ReactNode;
  extra?: ReactNode;
}

export function PanelHeader({
  title,
  collapsible,
  onCollapse,
  onMaximize,
  isMaximized,
  collapseIcon,
  extra,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "tp-panel-header",
        "h-8 min-h-[32px]",
        "px-3",
        "flex items-center justify-between",
        "bg-[var(--tp-bg-tertiary)]",
        "border-b border-[var(--tp-border)]",
        "select-none"
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium text-[var(--tp-text-secondary)] uppercase tracking-wide">
          {title}
        </h3>
        {extra}
      </div>

      <div className="flex items-center gap-1">
        {onMaximize && (
          <button
            onClick={onMaximize}
            className={cn(
              "p-1 rounded",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors"
            )}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}

        {collapsible && onCollapse && (
          <button
            onClick={onCollapse}
            className={cn(
              "p-1 rounded",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors"
            )}
          >
            {collapseIcon}
          </button>
        )}
      </div>
    </div>
  );
}
