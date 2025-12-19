import React from "react";
import { cn } from "@/lib/utils";
import { HeaderClient } from "./header.client";
import { HeaderCreateButton } from "./header-create-button";
import { Hero } from "./hero";
import { DesignConfig, DataTableView, FormConfig } from "../types/table";

interface TableHeaderProps {
  title: string;
  itemTitle: string;
  description?: string;
  createDialog?: React.ReactNode;
  dialogSize?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | undefined;
  // extraTopButtons is now a function that receives a refresh callback
  extraTopButtons?: (refresh?: () => void) => React.ReactNode;
  refresh: () => void;
  /** Enable hero design style */
  design?: boolean | DesignConfig;
  /** @deprecated Use design instead */
  hero?: boolean | DesignConfig;
  /** Form configuration for custom create/edit titles and descriptions */
  formConfig?: FormConfig;
  /** Analytics integration for premium header */
  hasAnalytics?: boolean;
  analyticsTab?: "overview" | "analytics";
  onAnalyticsTabChange?: (tab: "overview" | "analytics") => void;
  /** Current view state for animated transitions */
  currentView?: DataTableView;
}

export function TableHeader({
  title,
  itemTitle,
  description,
  createDialog,
  dialogSize,
  extraTopButtons,
  refresh,
  design,
  hero,
  formConfig,
  hasAnalytics,
  analyticsTab,
  onAnalyticsTabChange,
  currentView = "overview",
}: TableHeaderProps) {
  if (!title) return null;

  // Use design prop (or legacy hero)
  const designConfig = design || hero;
  if (designConfig) {
    const config = typeof designConfig === "boolean" ? {} : designConfig;
    return (
      <Hero
        title={title}
        itemTitle={itemTitle}
        description={description}
        createDialog={createDialog}
        dialogSize={dialogSize}
        extraTopButtons={extraTopButtons}
        refresh={refresh}
        config={config}
        formConfig={formConfig}
        hasAnalytics={hasAnalytics}
        analyticsTab={analyticsTab}
        onAnalyticsTabChange={onAnalyticsTabChange}
        currentView={currentView}
      />
    );
  }

  // Default header
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        "sm:ltr:flex-row sm:rtl:flex-row-reverse"
      )}
    >
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "flex items-center gap-2",
            "ltr:flex-row rtl:flex-row-reverse"
          )}
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <HeaderClient />
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          "flex items-center gap-2",
          "ltr:flex-row rtl:flex-row-reverse"
        )}
      >
        {extraTopButtons && (
          <div className="flex items-center gap-2">
            {extraTopButtons(refresh)}
          </div>
        )}
        <HeaderCreateButton
          itemTitle={itemTitle}
          createDialog={createDialog}
          dialogSize={dialogSize}
        />
      </div>
    </div>
  );
}
