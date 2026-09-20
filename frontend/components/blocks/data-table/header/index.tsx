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
  /** Only whether the create slot will draw; the button reads its own permission. */
  canCreate?: boolean;
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
  /** Heading level for `title`. See `DataTableProps.titleAs`. */
  titleAs?: "h1" | "h2";
}

export function TableHeader({
  title,
  itemTitle,
  description,
  createDialog,
  dialogSize,
  extraTopButtons,
  refresh,
  canCreate,
  design,
  hero,
  formConfig,
  hasAnalytics,
  analyticsTab,
  onAnalyticsTabChange,
  currentView = "overview",
  titleAs = "h1",
}: TableHeaderProps) {
  if (!title) return null;

  /* The element the title is drawn as. `h1` unless the host page already owns
     one — see `DataTableProps.titleAs`. Both branches below use it, so a hero
     table and a plain one answer the prop the same way. */
  const Title = titleAs;

  // Use design prop (or legacy hero)
  const designConfig = design || hero;
  if (designConfig) {
    const config = typeof designConfig === "boolean" ? {} : designConfig;
    return (
      <Hero
        title={title}
        titleAs={titleAs}
        itemTitle={itemTitle}
        description={description}
        createDialog={createDialog}
        dialogSize={dialogSize}
        extraTopButtons={extraTopButtons}
        refresh={refresh}
        canCreate={canCreate}
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
          {/* `<h1>`, not `<h2>`. This IS the page title — the same string the
              hero variant renders as an `<h1>` — so a table page's heading level
              used to depend on whether its author happened to pass a `design`
              prop. That left the admin shipping some tables whose title was an
              h2 with no h1 above it at all, which is both an a11y defect and the
              reason R1's "exactly one h1 per page" could not be checked.
              Same classes as `PageHeader`, so the two are interchangeable.

              RENDERED ONLY WHEN THERE IS A TITLE. A table EMBEDDED in a record
              page is not the page — `crm/user/[id]` mounts three of them with
              `title=""`, which unconditionally emitted three empty headings.
              Absent title, absent heading; the host page owns the `<h1>`.

              THE LEVEL IS A PROP, and it defaults to `h1`. A page whose only
              heading is this one keeps it; the handful that draw their own
              `PageHeader` above the table pass `titleAs="h2"` and stop
              announcing their title twice. Same classes either way, so the
              type scale does not move. */}
          {title ? (
            <Title className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </Title>
          ) : null}
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
          canCreate={canCreate}
          createDialog={createDialog}
          dialogSize={dialogSize}
        />
      </div>
    </div>
  );
}
