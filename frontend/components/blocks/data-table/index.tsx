"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTableStore } from "./store";
import { getSortableFields } from "./utils/sorting";
import { DataTableProps } from "./types/table";

// Import sub-components
import { TableHeader } from "./header";
import { TableToolbar } from "./toolbar";
import { TableContent } from "./content";
import { TablePagination } from "./pagination";
import { NoAccessState } from "./states/no-access-state";
import { Analytics } from "./analytics";
import { CreateView, EditView } from "./views";
import { DestructiveActionDialog } from "./dialogs/destructive-action-dialog";
import { DecisionDialog } from "./dialogs/decision-dialog";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import { useTranslations } from "next-intl";

export default function DataTable({
  model,
  modelConfig,
  apiEndpoint,
  staticRows,
  userAnalytics = false,
  permissions,
  pageSize = 10,
  canCreate = false,
  createDialog,
  createLink,
  canEdit = false,
  editCondition,
  editLink,
  canDelete = false,
  canView = false,
  viewLink,
  isParanoid = true,
  title = "",
  titleAs = "h1",
  itemTitle = "",
  description,
  columns,
  formConfig,
  viewContent,
  viewConfig,
  analytics,
  expandedButtons,
  extraTopButtons,
  extraRowActions,
  bulkActions,
  dialogSize,
  db = "mysql",
  keyspace = null,
  design,
  hero,
  alertContent,
  initialSort,
  initialFilters,
}: DataTableProps) {
  // Move useTranslations to the top level
  const t = useTranslations("common");

  const {
    setModel,
    setModelConfig,
    setApiEndpoint,
    setStaticRows,
    setUserAnalytics,
    reset,
    setPageSize,
    setTableConfig,
    setColumns,
    initializePermissions,
    hasAccessPermission,
    initialized,
    analyticsTab,
    setAnalyticsTab,
    setAnalyticsConfig,
    resetAnalyticsData,
    resetAnalyticsTab,
    setAvailableSortingOptions,
    setDb,
    setKeyspace,
    currentView,
    resetView,
    setDesignConfig,
    applyInitialQueryState,
  } = useTableStore();

  // Get the refresh function from the store.
  const refresh = useTableStore.getState().fetchData;

  // Serialised on purpose. `resetCallback` below wipes the store and refetches,
  // and its deps are compared by REFERENCE — so an inline
  // `initialFilters={{ status: "PENDING" }}` would be a new object on every
  // parent render and reset the table each time. A queue page holds state (a
  // pending bulk decision, a selected agent), so its parent genuinely does
  // re-render. Comparing the VALUES makes the seed inert once applied.
  // (`modelConfig` has the same hazard and gets away with it only because no
  // page that passes one re-renders.)
  const initialQueryKey = JSON.stringify({
    sort: initialSort ?? null,
    filters: initialFilters ?? null,
  });

  // Check if hero design is enabled (support both design and legacy hero)
  const isHero = Boolean(design || hero);
  const designConfig = design || hero;

  const resetCallback = useCallback(() => {
    reset();
    setModel(model);
    setModelConfig(modelConfig);
    // AFTER `setModelConfig`, so a queue's opening filter merges over its model
    // predicate; and BEFORE `initializePermissions` at the end of this callback
    // — that is what issues the first request, so seeding any later would put
    // the un-seeded query on the wire first and flash the wrong rows.
    {
      const seed = JSON.parse(initialQueryKey);
      applyInitialQueryState({
        sorting: seed.sort ?? undefined,
        filters: seed.filters ?? undefined,
      });
    }
    setApiEndpoint(apiEndpoint);
    /* Before `initializePermissions` at the end of this callback, for the same
       reason the query seed is: that call issues the first request, and a
       fixture registered after it would put a real fetch on the wire first. */
    setStaticRows(staticRows ?? null);
    setUserAnalytics(userAnalytics);
    setDb(db);
    setKeyspace(keyspace);
    setPageSize(pageSize, false);
    setColumns(columns);
    setAvailableSortingOptions(getSortableFields(columns, t));
    setTableConfig({
      pageSize,
      title,
      itemTitle,
      description,
      canCreate,
      createLink,
      canEdit,
      editLink,
      canDelete,
      canView,
      viewLink,
      isParanoid,
      expandedButtons,
      extraTopButtons,
      editCondition,
      extraRowActions,
      bulkActions,
    });
    if (analytics) {
      setAnalyticsConfig(analytics);
      resetAnalyticsData();
    }
    // Store design config for views to access
    const normalizedDesignConfig = designConfig
      ? typeof designConfig === "boolean"
        ? {}
        : designConfig
      : null;
    setDesignConfig(normalizedDesignConfig);
    initializePermissions(permissions);
  }, [
    model,
    modelConfig,
    apiEndpoint,
    staticRows,
    userAnalytics,
    db,
    keyspace,
    pageSize,
    columns,
    canCreate,
    canEdit,
    canDelete,
    canView,
    isParanoid,
    analytics,
    permissions,
    title,
    itemTitle,
    description,
    expandedButtons,
    extraTopButtons,
    initialQueryKey,
    applyInitialQueryState,
    reset,
    setModel,
    setApiEndpoint,
    setStaticRows,
    setPageSize,
    setColumns,
    setAvailableSortingOptions,
    setTableConfig,
    setAnalyticsConfig,
    resetAnalyticsData,
    initializePermissions,
  ]);

  useEffect(() => {
    resetAnalyticsTab();
    resetView();
    resetCallback();
  }, [resetCallback, resetAnalyticsTab, resetView]);

  // Separate effect to update only the tableConfig when dynamic props change
  // This prevents full reset/refetch when only UI components change
  useEffect(() => {
    setTableConfig({
      pageSize,
      title,
      itemTitle,
      description,
      canCreate,
      createLink,
      canEdit,
      editLink,
      canDelete,
      canView,
      viewLink,
      isParanoid,
      expandedButtons,
      extraTopButtons,
      editCondition,
      extraRowActions,
      bulkActions,
    });
  }, [extraRowActions, bulkActions, editCondition, expandedButtons, extraTopButtons, setTableConfig, pageSize, title, itemTitle, description, canCreate, createLink, canEdit, editLink, canDelete, canView, viewLink, isParanoid]);

  // Handle analytics tab change
  const handleAnalyticsTabChange = useCallback(
    (tab: "overview" | "analytics") => {
      setAnalyticsTab(tab);
    },
    [setAnalyticsTab]
  );

  // Render the main content area based on current view (overview, analytics, create, edit)
  const renderMainContent = useCallback(() => {
    // Create view - replaces table content area
    if (currentView === "create") {
      return <CreateView columns={columns} title={itemTitle} formConfig={formConfig} />;
    }

    // Edit view - replaces table content area
    if (currentView === "edit") {
      return <EditView columns={columns} title={itemTitle} formConfig={formConfig} />;
    }

    // Analytics view
    if (analytics && analyticsTab === "analytics") {
      return <Analytics />;
    }

    // Default: Overview (table) view
    return (
      <>
        <TableToolbar columns={columns} />
        <TableContent
          viewContent={viewContent}
          viewConfig={viewConfig}
          formConfig={formConfig}
          columns={columns}
        />
        <TablePagination />
      </>
    );
  }, [currentView, analytics, analyticsTab, columns, viewContent, viewConfig, itemTitle, formConfig]);

  // Memoize the main table block
  const tableContent = useMemo(() => {
    // Hero layout - full page with integrated analytics tabs
    // Now also handles create/edit views with animated header transitions
    if (isHero) {
      const isFormView = currentView === "create" || currentView === "edit";

      return (
        <div className="min-h-screen">
          {/* THE PAGE GROUND, and the reason the heading band above it is now
              transparent.

              A hero DataTable IS the page frame — it supplies the container, the
              header clearance and the `<h1>` — so it is also the thing that owes
              the page a background. It used to pay that debt with ten animated
              variants in a per-page pair of hues (see the long note in
              `header/hero.tsx`); it now draws the same `WorkspaceGround` as the
              p2p board, the support console and every other working surface.

              Mounted HERE and not in ~30 route layouts because that is what
              makes it one edit instead of thirty, and it is safe to nest: the
              element is `fixed inset-0 -z-10` and `globals.css` hides any ground
              that already has one above it, so the dozen table pages sitting
              under a layout that draws its own are unaffected.

              NOT in the non-hero branch below. That layout is an embedded table
              (`crm/user/[id]` mounts three with `title=""`), which is a
              component on somebody else's page, not a page. */}
          <WorkspaceGround />
          <TableHeader
            title={title}
            titleAs={titleAs}
            itemTitle={itemTitle}
            description={description}
            createDialog={createDialog}
            dialogSize={
              dialogSize === "xs"
                ? "sm"
                : dialogSize === "full"
                  ? "7xl"
                  : dialogSize
            }
            extraTopButtons={extraTopButtons}
            refresh={refresh}
            design={designConfig}
            formConfig={formConfig}
            /* Passed rather than read from the store, and the difference is
               visible: `setTableConfig` runs in an effect, so on the frame the
               hero first paints the store still holds `canCreate: true` from
               its own defaults — or, since the store is a singleton, whatever
               the PREVIOUS table left there. The heading uses this to decide
               its width, and a width settled from a stale value is a jump. */
            canCreate={canCreate}
            hasAnalytics={Boolean(analytics)}
            analyticsTab={analyticsTab}
            onAnalyticsTabChange={handleAnalyticsTabChange}
            currentView={currentView}
          />
          
          {/* Content area with proper container.

              TWO PADDINGS USED TO STACK HERE. The hero closes with 1.5rem of
              its own bottom padding and this opened with another 2rem, so the
              gap between the page description and the toolbar was 56px — a
              void that only read as deliberate while a rule was drawn across
              it. One number owns that gap now: the hero's. `pt-4` is the small
              remainder that keeps the toolbar off the description.

              The FORM view keeps the full `pt-8`. Its hero is `fixed`, so the
              spacer above is standing in for a header that is not in flow and
              this padding is the only thing between it and the first field. */}
          <div className={isFormView ? "container mx-auto pt-8 pb-8" : "container mx-auto pt-4 pb-8"}>
            <div className="space-y-4">
              {/* Alert content below hero, only in overview mode */}
              {!isFormView && alertContent}
              {isFormView ? (
                currentView === "create" ? (
                  <CreateView columns={columns} title={itemTitle} formConfig={formConfig} hasHero />
                ) : (
                  <EditView columns={columns} title={itemTitle} formConfig={formConfig} hasHero />
                )
              ) : (
                renderMainContent()
              )}
            </div>
          </div>
        </div>
      );
    }

    // Non-premium layout: Create/Edit views render directly
    if (currentView === "create" || currentView === "edit") {
      return currentView === "create" ? (
        <CreateView columns={columns} title={itemTitle} formConfig={formConfig} />
      ) : (
        <EditView columns={columns} title={itemTitle} formConfig={formConfig} />
      );
    }

    // Default layout
    return (
      <div className="space-y-4">
        <TableHeader
          title={title}
          titleAs={titleAs}
          itemTitle={itemTitle}
          description={description}
          createDialog={createDialog}
          dialogSize={
            dialogSize === "xs"
              ? "sm"
              : dialogSize === "full"
                ? "7xl"
                : dialogSize
          }
          extraTopButtons={extraTopButtons}
          refresh={refresh}
          canCreate={canCreate}
          design={designConfig}
          formConfig={formConfig}
        />
        {/* Alert content below header */}
        {alertContent}
        {analytics && (
          <Tabs
            value={analyticsTab}
            onValueChange={(value) =>
              setAnalyticsTab(value as "overview" | "analytics")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {renderMainContent()}
      </div>
    );
  }, [
    title,
    itemTitle,
    description,
    columns,
    formConfig,
    viewContent,
    viewConfig,
    analyticsTab,
    setAnalyticsTab,
    handleAnalyticsTabChange,
    analytics,
    extraTopButtons,
    refresh,
    designConfig,
    isHero,
    t,
    createDialog,
    dialogSize,
    currentView,
    renderMainContent,
    alertContent,
  ]);

  if (!initialized) {
    return null;
  }

  if (!hasAccessPermission) {
    return <NoAccessState title={title}>{tableContent}</NoAccessState>;
  }

  /**
   * The destructive-action confirmation is mounted HERE, once, rather than at
   * the row menu and the selection bar separately. That is what makes it cover
   * every table in the product — core and addon — without a single page opting
   * in. It renders nothing until the store raises a `pendingAction`.
   */
  return (
    <>
      {tableContent}
      <DestructiveActionDialog />
      <DecisionDialog />
    </>
  );
}
