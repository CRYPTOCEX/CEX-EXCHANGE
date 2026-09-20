"use client";

import React, { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
  // `common.expand` / `common.restore` / `common.collapse` are the labels used
  // here because all three ship in every one of the 90 catalogues. `maximize`
  // does not exist in any of them, and a missing key renders the raw key rather
  // than falling back to English.
  const t = useTranslations("common");

  return (
    <div
      className={cn(
        "tp-panel-header",
        "h-8 min-h-[32px]",
        // Right padding matches the buttons' ~5px vertical inset so the last
        // control sits as close to the border as it does to the top edge.
        "pl-3 pr-1.5",
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
            type="button"
            onClick={onMaximize}
            title={isMaximized ? t("restore") : t("expand")}
            aria-label={isMaximized ? t("restore") : t("expand")}
            aria-pressed={!!isMaximized}
            className={cn(
              "p-1 rounded",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors",
              isMaximized &&
                "text-[var(--tp-text-primary)] bg-[var(--tp-bg-elevated)]"
            )}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}

        {collapsible && onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title={t("collapse")}
            aria-label={t("collapse")}
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
