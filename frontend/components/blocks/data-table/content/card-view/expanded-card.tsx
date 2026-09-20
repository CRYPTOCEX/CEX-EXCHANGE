"use client";

import React, { forwardRef } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Sparkles,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTableStore } from "../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../utils/permissions";
import { CellRenderer } from "../rows/cells";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  processEndpointLink,
  getPrimaryColumn,
  getPrimaryDisplayValue,
} from "../../utils/cell";
import { DetailSection } from "../../view-dialog/detail-section";
import { DetailStats } from "../../view-dialog/detail-stats";
import {
  autoViewDialogSize,
  getNestedValue,
  resolveColumn,
  resolveDynamic,
  resolveViewSections,
  viewDialogSizeClass,
} from "../../view-dialog/utils";
import type {
  FormConfig,
  ViewConfig,
  ViewRenderContext,
  ViewTabConfig,
} from "../../types/table";

interface ExpandedCardProps {
  row: any;
  columns: ColumnDefinition[];
  visibleColumns: ColumnDefinition[];
  onClose: () => void;
  layoutId: string;
  viewContent?: (row: any) => React.ReactNode;
  /** Declarative/custom configuration for this dialog. */
  viewConfig?: ViewConfig;
  /** Reused to derive sections when `viewConfig.sections` is absent. */
  formConfig?: FormConfig;
  showActions: boolean;
  sourceType?: "card" | "row"; // Whether this is from card view or table view
}

export const CloseIcon = () => {
  return (
    <m.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-foreground"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </m.svg>
  );
};

export const ExpandedCard = forwardRef<HTMLDivElement, ExpandedCardProps>(
  (
    {
      row: initialRow,
      columns,
      visibleColumns,
      onClose,
      layoutId,
      viewContent,
      viewConfig,
      formConfig,
      showActions,
      sourceType = "card",
    },
    ref
  ) => {
    const t = useTranslations("common");
    const tBlocks = useTranslations("components_blocks");
    const tableConfig = useTableStore((state) => state.tableConfig);
    const selectedRows = useTableStore((state) => state.selectedRows);
    const hasViewPermission = useTableStore((state) => state.hasViewPermission);
    const permissions = useTableStore((state) => state.permissions);
    const handleDelete = useTableStore((state) => state.handleDelete);
    const handleRestore = useTableStore((state) => state.handleRestore);
    const handlePermanentDelete = useTableStore((state) => state.handlePermanentDelete);
    const goToEdit = useTableStore((state) => state.goToEdit);
    const setSelectedRow = useTableStore((state) => state.setSelectedRow);
    const handleView = useTableStore((state) => state.handleView);
    const fetchData = useTableStore((state) => state.fetchData);
    const user = useUserStore((state) => state.user);
    const router = useRouter();

    // Subscribe to store data to get live updates (e.g., when toggle changes)
    const storeData = useTableStore((state) => state.data);

    // Get the current row from store data, falling back to initial row if not found
    const row = React.useMemo(() => {
      const updatedRow = storeData.find((r) => r.id === initialRow.id);
      return updatedRow || initialRow;
    }, [storeData, initialRow]);

    const isSelected = selectedRows.includes(row.id);
    const isDeleted = Boolean(row.deletedAt);

    // Find primary column using shared utility
    const primaryColumn = React.useMemo(
      () => getPrimaryColumn(visibleColumns),
      [visibleColumns]
    );

    // Get primary display value with fallback to ID if value is empty
    const primaryDisplay = React.useMemo(
      () => getPrimaryDisplayValue(row, primaryColumn, getNestedValue),
      [row, primaryColumn]
    );

    /* ------------------------------------------------------------------ *
     * Body resolution
     * ------------------------------------------------------------------ */

    const resolved = React.useMemo(
      () =>
        resolveViewSections({
          viewConfig,
          formConfig,
          columns,
          row,
          primaryKey: primaryColumn?.key,
          otherTitle: tBlocks("other_details"),
          timestampsTitle: tBlocks("timestamps"),
        }),
      [viewConfig, formConfig, columns, row, primaryColumn?.key, tBlocks]
    );

    const size =
      viewConfig?.size ??
      autoViewDialogSize(
        resolved.fieldCount,
        resolved.hasCustomSection || Boolean(viewConfig?.render) || Boolean(viewContent)
      );

    /* Shared-element morphing is only sound when the source and target boxes
       are roughly the same shape. A card is a ~300x220 div morphing to a
       ~600x700 panel — comparable aspect, so it reads cleanly. A table row is
       ~1900x60; morphing that into the panel needs scale(0.63, 6.3) at the
       midpoint, which smears every glyph in the row. Row source therefore gets
       an ordinary modal transition and no layout projection at all.

       The same limit now applies to WIDTH. A card is ~300px; morphing it into
       a 4xl (56rem) or wider panel is a 3x horizontal scale, and the header,
       scroll region and footer are all `layout={false}` so none of them get
       scale-corrected on the way. Past `3xl` the panel therefore fades in like
       the row path instead of morphing.

       A configured dialog also opts OUT of the per-field morph: the card's
       tiles emit `field-value-*` layoutIds that only pair with the flat default
       grid. Once sections regroup or replace those tiles the ids either pair
       across unrelated boxes or dangle. */
    const usesCustomBody =
      Boolean(viewConfig?.render) ||
      resolved.sections.some((s) => Boolean(s.render)) ||
      Boolean(viewConfig?.sections?.length) ||
      resolved.sections.length > 1;
    const morphableWidth = !["4xl", "5xl", "6xl", "7xl", "full"].includes(size);
    const morphFromSource = sourceType === "card" && morphableWidth;
    const morphFields = morphFromSource && !usesCustomBody;
    const expandedLayoutId = `card-${row.id}-${layoutId}`;

    // Action permissions
    const hasViewAction =
      !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;

    const meetsEditCondition =
      typeof tableConfig.editCondition === "function"
        ? tableConfig.editCondition(row)
        : true;

    const userHasEditPermission = checkPermission(user, permissions?.edit);
    const canEditAction =
      tableConfig.canEdit &&
      userHasEditPermission &&
      meetsEditCondition &&
      !isDeleted;

    const hasEditAction =
      tableConfig.canEdit && permissions?.edit && meetsEditCondition;

    const userHasDeletePermission = checkPermission(user, permissions?.delete);
    const hasDeleteAction = tableConfig.canDelete && userHasDeletePermission;

    const hasAnyAction = hasViewAction || hasEditAction || hasDeleteAction;

    // View link
    const viewLinkHref = tableConfig.viewLink
      ? processEndpointLink(tableConfig.viewLink, row)
      : undefined;

    // Edit link
    const editLinkHref = tableConfig.editLink
      ? processEndpointLink(tableConfig.editLink, row)
      : undefined;

    const handleViewClick = () => {
      // Close modal first to release scroll lock before navigation
      onClose();
      if (tableConfig.viewLink) {
        router.push(viewLinkHref!);
      } else if (tableConfig.onViewClick) {
        handleView(row);
      }
    };

    const handleEditClick = React.useCallback(() => {
      // Close modal first to release scroll lock before navigation
      onClose();
      if (tableConfig.editLink) {
        router.push(editLinkHref!);
      } else if (tableConfig.onEditClick) {
        // Small delay to ensure modal unmounts and releases scroll lock
        const editClick = tableConfig.onEditClick;
        setTimeout(() => {
          editClick(row);
        }, 50);
      } else {
        // Use view-based edit - delay to ensure modal unmounts first
        setTimeout(() => {
          setSelectedRow(row);
          goToEdit(row.id);
        }, 50);
      }
    }, [onClose, tableConfig, editLinkHref, row, router, setSelectedRow, goToEdit]);

    const handleDeleteClick = async () => {
      await handleDelete(row);
      onClose();
    };

    const handleRestoreClick = async () => {
      await handleRestore(row);
      onClose();
    };

    const handlePermanentDeleteClick = async () => {
      await handlePermanentDelete(row);
      onClose();
    };

    /* The context handed to every custom renderer, so a page never has to reach
       into the table store to close the dialog or refresh after a mutation. */
    const ctx: ViewRenderContext = React.useMemo(
      () => ({
        row,
        close: onClose,
        refresh: fetchData,
        edit: handleEditClick,
        columns,
        getValue: (path: string) => getNestedValue(row, path),
        renderCell: (columnKey: string) => {
          const column = resolveColumn(columns, columnKey);
          return (
            <CellRenderer
              renderType={(column?.render as any) || ({ type: column?.type } as any)}
              value={getNestedValue(row, columnKey)}
              row={row}
              cropText={false}
              breakText
            />
          );
        },
      }),
      [row, onClose, fetchData, handleEditClick, columns]
    );

    /* ------------------------------------------------------------------ *
     * Tabs
     * ------------------------------------------------------------------ */

    const tabs = React.useMemo<ViewTabConfig[]>(() => {
      const configured = viewConfig?.tabs ?? [];
      return configured.filter((tab) =>
        tab.condition === undefined
          ? true
          : typeof tab.condition === "function"
            ? tab.condition(row)
            : tab.condition
      );
    }, [viewConfig?.tabs, row]);

    const [activeTab, setActiveTab] = React.useState<string | undefined>(
      tabs[0]?.id
    );

    React.useEffect(() => {
      // A tab can disappear when its condition flips on a live row update; the
      // body would then render nothing at all until the dialog is reopened.
      if (tabs.length && !tabs.some((tab) => tab.id === activeTab)) {
        setActiveTab(tabs[0].id);
      }
    }, [tabs, activeTab]);

    const visibleSections = React.useMemo(() => {
      if (!tabs.length) return resolved.sections;
      return resolved.sections.filter(
        (section) => !section.tab || section.tab === activeTab
      );
    }, [resolved.sections, tabs, activeTab]);

    /* ------------------------------------------------------------------ *
     * Header pieces
     * ------------------------------------------------------------------ */

    const customTitle = resolveDynamic(viewConfig?.title, row);
    const customSubtitle = resolveDynamic(viewConfig?.subtitle, row);
    const badges = viewConfig?.badges?.(row);

    const statsNode = React.useMemo(() => {
      if (!viewConfig?.stats) return null;
      if (typeof viewConfig.stats === "function") return viewConfig.stats(row);
      return <DetailStats stats={viewConfig.stats} row={row} />;
    }, [viewConfig, row]);

    const panelClassName = cn(
      "w-full max-h-[90vh] flex flex-col overflow-hidden",
      /* Explicit `relative`. The top accent bar below is `absolute inset-x-0`
         and previously stayed inside the panel only because `backdrop-blur-xl`
         happens to establish a containing block — remove or change that filter
         while restyling and the bar spans the whole viewport instead. */
      "relative",
      viewDialogSizeClass(size),
      // R3: elevation is the surface ramp, not a same-token gradient wash.
      "bg-card",
      "backdrop-blur-xl",
      // Full-strength edge: this sits over a dimmed backdrop and needs to
      // read as a discrete panel, not fade into it.
      "border border-border",
      // Premium shadow
      "shadow-2xl shadow-shadow/20 dark:shadow-shadow/40",
      // Rounded
      "rounded-2xl",
      // Selected state
      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      // Deleted state
      isDeleted && "opacity-70",
      viewConfig?.className
    );

    /* A `renderDialog` caller owns the whole panel: chrome, header, footer. The
       wrapper still supplies the size, the ref (outside-click close) and the
       modal transition, so such a dialog behaves like every other one. */
    if (viewConfig?.renderDialog) {
      return (
        <m.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={panelClassName}
          role="dialog"
          aria-modal="true"
          aria-label={
            typeof customTitle === "string" ? customTitle : tBlocks("record_details")
          }
        >
          {viewConfig.renderDialog(row, ctx)}
        </m.div>
      );
    }

    return (
      <m.div
        layoutId={morphFromSource ? expandedLayoutId : undefined}
        initial={morphFromSource ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
        animate={morphFromSource ? undefined : { opacity: 1, scale: 1, y: 0 }}
        exit={morphFromSource ? undefined : { opacity: 0, scale: 0.98, y: 4 }}
        transition={
          morphFromSource ? undefined : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
        ref={ref}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-label={
          typeof customTitle === "string" ? customTitle : tBlocks("record_details")
        }
      >
        {/* Top accent line */}
        <m.div
          layout={false}
          className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/30 via-primary to-primary/30 rounded-t-2xl"
        />

        {/* Header */}
        <m.div
          layout={false}
          className="relative p-6 pb-4 border-b border-border"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* An avatar/logo belongs beside the title, not in a key/value
                  tile captioned "AVATAR / No Image". */}
              {resolved.mediaColumn && customTitle === undefined && (
                <div className="shrink-0">
                  <CellRenderer
                    renderType={{ type: "image", size: "lg" } as any}
                    value={getNestedValue(row, resolved.mediaColumn.key)}
                    row={row}
                    cropText={false}
                  />
                </div>
              )}
              {/* Primary content */}
              <div className="flex-1 min-w-0">
                {customTitle !== undefined ? (
                  <div className="text-lg font-semibold text-foreground break-words">
                    {customTitle}
                  </div>
                ) : primaryDisplay.useIdFallback ? (
                  <span className="text-lg font-semibold text-foreground break-all">
                    #{row.id}
                  </span>
                ) : (
                  <CellRenderer
                    renderType={
                      primaryDisplay.column?.render || {
                        type: primaryDisplay.column?.type,
                      }
                    }
                    value={primaryDisplay.value}
                    row={row}
                    cropText={false}
                  />
                )}
                {customSubtitle !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {customSubtitle}
                  </p>
                )}
              </div>
              {badges && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {badges}
                </div>
              )}
            </div>

            <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </m.div>
          </div>

          {/* Selected badge */}
          {isSelected && (
            <m.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-4 left-4 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/30"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">
                {t("selected")}
              </span>
            </m.div>
          )}
        </m.div>

        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="shrink-0 flex items-center gap-1 px-6 pt-3 border-b border-border overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap",
                    "border-b-2 -mb-px transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {TabIcon && <TabIcon className="h-4 w-4" />}
                  {tab.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        {/* `@container`: section grids below key off THIS box, not the window,
            so the column count follows the dialog's configured width. */}
        <m.div
          layout={false}
          className="@container flex-1 overflow-y-auto p-6 space-y-6"
        >
          {statsNode}

          {viewConfig?.header?.(row, ctx)}

          {/* `render` replaces the field body but keeps the panel's header,
              stats and action bar — the common case for a bespoke layout. */}
          {viewConfig?.render
            ? viewConfig.render(row, ctx)
            : visibleSections.map((section) =>
                morphFields && section.id === "default" ? (
                  <MorphingDefaultSection
                    key={section.id}
                    section={section}
                    row={row}
                    layoutId={layoutId}
                  />
                ) : (
                  <DetailSection
                    key={section.id}
                    section={section}
                    row={row}
                    ctx={ctx}
                  />
                )
              )}

          {viewConfig?.footer?.(row, ctx)}

          {/* Legacy custom view content, appended below the fields. */}
          {viewContent && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {(visibleSections.length > 0 || statsNode) && (
                <div className="h-px bg-linear-to-r from-transparent via-border to-transparent mb-4" />
              )}
              {viewContent(row)}
            </m.div>
          )}
        </m.div>

        {/* Footer with action buttons */}
        {!viewConfig?.hideActions && (
          <m.div layout={false} className="relative p-4 border-t border-border">
            <div className="flex items-center justify-between gap-2">
              {/* Action buttons on the left */}
              <div className="flex items-center gap-2 flex-wrap">
                {showActions && hasAnyAction && (
                  <>
                    {/* View Action */}
                    {hasViewAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleViewClick}
                      >
                        <Eye className="h-4 w-4" />
                        {t("view")}
                      </Button>
                    )}

                    {/* Edit Action */}
                    {hasEditAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!canEditAction}
                        onClick={handleEditClick}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("edit")}
                      </Button>
                    )}

                    {/* Delete / Restore Actions */}
                    {hasDeleteAction &&
                      (isDeleted ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleRestoreClick}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t("restore")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={handlePermanentDeleteClick}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("permanent_delete")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={handleDeleteClick}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("delete")}
                        </Button>
                      ))}
                  </>
                )}

                {/* Custom row actions.
                  These are DropdownMenuItems, and the table view reaches them
                  through the row's "…" menu. Card view is what MOBILE always
                  renders, so without this the whole custom-action set — the
                  only actions some tables have — was unreachable on a phone. */}
                {tableConfig.extraRowActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <MoreHorizontal className="h-4 w-4" />
                        {t("actions")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {tableConfig.extraRowActions(row, {
                        canEdit: userHasEditPermission,
                        canDelete: userHasDeletePermission,
                        canCreate: checkPermission(user, permissions?.create),
                        permissions,
                        refresh: () =>
                          void useTableStore.getState().fetchData(),
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Custom expanded buttons */}
                {tableConfig.expandedButtons && tableConfig.expandedButtons(row)}
              </div>

              {/* Close button on the right */}
              <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="px-6"
                >
                  {t("close")}
                </Button>
              </m.div>
            </div>
          </m.div>
        )}
      </m.div>
    );
  }
);

ExpandedCard.displayName = "ExpandedCard";

/**
 * The flat every-column grid, with the per-tile layoutIds that pair with the
 * collapsed card's tiles. Kept as its own component so the shared-element morph
 * survives for the zero-config case while structured dialogs skip it entirely.
 */
function MorphingDefaultSection({
  section,
  row,
  layoutId,
}: {
  section: { fields: any[] };
  row: any;
  layoutId: string;
}) {
  return (
    <div className="grid gap-3 grid-cols-1 @md:grid-cols-2">
      {section.fields.map((field: any) => {
        const column = field.column;
        const isFullWidth =
          column?.fullWidth ||
          ["textarea", "editor", "compound"].includes(column?.type || "");
        return (
          <div
            key={field.key}
            className={cn(
              "relative p-3 rounded-lg min-w-0",
              "bg-card border border-border",
              "transition-colors duration-200 hover:border-border-strong",
              isFullWidth && "@md:col-span-2"
            )}
          >
            <m.p
              layoutId={`field-label-${field.key}-${row.id}-${layoutId}`}
              className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              {field.title}
            </m.p>
            <m.div
              layoutId={`field-value-${field.key}-${row.id}-${layoutId}`}
              className="text-sm font-medium break-words"
            >
              <CellRenderer
                renderType={column?.render || { type: column?.type }}
                value={getNestedValue(row, field.key)}
                row={row}
                cropText={false}
                breakText
              />
            </m.div>
          </div>
        );
      })}
    </div>
  );
}
