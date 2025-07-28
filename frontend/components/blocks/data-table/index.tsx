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
import { EditCreateDrawer } from "./drawers/edit-create-drawer";
import { NoAccessState } from "./states/no-access-state";
import { Analytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function DataTable({
  model,
  modelConfig,
  apiEndpoint,
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
  itemTitle = "",
  description,
  columns,
  viewContent,
  analytics,
  expandedButtons,
  extraTopButtons,
  extraRowActions,
  dialogSize,
  db = "mysql",
  keyspace = null,
}: DataTableProps) {
  // Move useTranslations to the top level
  const t = useTranslations("components/blocks/data-table/index");

  const {
    setModel,
    setModelConfig,
    setApiEndpoint,
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
  } = useTableStore();

  // Get the refresh function from the store.
  const refresh = useTableStore.getState().fetchData;

  const resetCallback = useCallback(() => {
    reset();
    setModel(model);
    setModelConfig(modelConfig);
    setApiEndpoint(apiEndpoint);
    setUserAnalytics(userAnalytics);
    setDb(db);
    setKeyspace(keyspace);
    setPageSize(pageSize, false);
    setColumns(columns);
    setAvailableSortingOptions(getSortableFields(columns));
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
    });
    if (analytics) {
      setAnalyticsConfig(analytics);
      resetAnalyticsData();
    }
    initializePermissions(permissions);
  }, [
    model,
    modelConfig,
    apiEndpoint,
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
    reset,
    setModel,
    setApiEndpoint,
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
    resetCallback();
  }, [resetCallback, resetAnalyticsTab]);

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
    });
  }, [extraRowActions, editCondition, expandedButtons, extraTopButtons, setTableConfig, pageSize, title, itemTitle, description, canCreate, createLink, canEdit, editLink, canDelete, canView, viewLink, isParanoid]);

  // Memoize the main table block
  const tableContent = useMemo(() => {
    return (
      <div className="space-y-4">
        <TableHeader
          title={title}
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
        />
        {analytics && (
          <Tabs
            value={analyticsTab}
            onValueChange={(value) =>
              setAnalyticsTab(value as "overview" | "analytics")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("Analytics")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {!analytics || analyticsTab === "overview" ? (
          <>
            <TableToolbar columns={columns} />
            <TableContent viewContent={viewContent} columns={columns} />
            <TablePagination />
          </>
        ) : (
          <Analytics />
        )}
        <EditCreateDrawer columns={columns} title={itemTitle} />
      </div>
    );
  }, [
    title,
    itemTitle,
    description,
    columns,
    viewContent,
    analyticsTab,
    setAnalyticsTab,
    analytics,
    extraTopButtons,
    refresh,
    t, // Add t to dependencies
  ]);

  if (!initialized) {
    return null;
  }

  if (!hasAccessPermission) {
    return <NoAccessState title={title}>{tableContent}</NoAccessState>;
  }

  return tableContent;
}
