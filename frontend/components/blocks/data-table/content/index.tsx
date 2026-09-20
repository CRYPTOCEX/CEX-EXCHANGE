import React from "react";
import { useTableStore } from "../store";
import { TableRows } from "./rows";
import { Table, TableBody } from "@/components/ui/table";
import { NoDataState } from "../states/no-data-state";
import { TableHeaderComponent } from "./table-header";
import { DataTableSkeleton } from "./rows/skeleton";
import { CardView } from "./card-view";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { FormConfig, ViewConfig } from "../types/table";

/* NO ENTRANCE ANIMATION HERE — and the same rule holds for the toolbar, the
   rows, the cards and the pagination. This shell used to mount at `y: 8` and
   ease to `y: 0`; the skeleton it replaces has no transform, so every page load
   painted the table in its final place and then slid the real content up into
   the same place a beat later. Offsetting a container that is ALREADY where it
   belongs buys nothing and reads as a layout shift, so the mount state is now
   the resting state. Hover, tap, view-switch and expand animations are
   unaffected — those are responses to an action, not decoration on arrival. */

interface TableContentProps {
  viewContent?: (row: any) => React.ReactNode;
  /** Configuration for the expanded row/card view dialog. */
  viewConfig?: ViewConfig;
  /** Reused to derive view-dialog sections when `viewConfig.sections` is absent. */
  formConfig?: FormConfig;
  columns: ColumnDefinition[];
}

export function TableContent({
  viewContent,
  viewConfig,
  formConfig,
  columns,
}: TableContentProps) {
  const tableConfig = useTableStore((state) => state.tableConfig);
  const loading = useTableStore((state) => state.loading);
  const error = useTableStore((state) => state.error);
  const data = useTableStore((state) => state.data);
  const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
  const storeColumns = useTableStore((state) => state.columns);
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const viewMode = useTableStore((state) => state.viewMode);
  const pageSize = useTableStore((state) => state.pageSize);

  const hasEditPermission = useTableStore((state) => state.hasEditPermission);
  const hasEditAction = tableConfig.canEdit && hasEditPermission;

  const hasDeletePermission = useTableStore(
    (state) => state.hasDeletePermission
  );
  const hasDeleteAction = tableConfig.canDelete && hasDeletePermission;

  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const hasViewAction =
    !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;
  // `extraRowActions` counts as an action. Without it, a table whose only
  // operations are custom ones (disable a key, flatten a bot) rendered no
  // actions COLUMN at all, so the menu holding them had nowhere to appear —
  // the row-level guard in ./rows/actions is not enough on its own.
  const showActions =
    hasEditAction ||
    hasDeleteAction ||
    hasViewAction ||
    Boolean(tableConfig.extraRowActions);

  // Check if select column should be shown (only if at least one action is allowed;
  // custom bulk actions also enable selection)
  const showSelectColumn = Boolean(
    tableConfig.canCreate ||
      tableConfig.canEdit ||
      tableConfig.canDelete ||
      tableConfig.bulkActions?.length
  );

  // Track screen size changes to re-calculate visible columns based on priority
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px)");
  const isMobile = !isTablet;

  // On mobile, always force card view (regardless of stored preference)
  // On tablet/desktop, use the stored viewMode preference
  const effectiveViewMode = isMobile ? "card" : viewMode;

  // Get visible columns (respects expandedOnly, priority, and user visibility settings)
  // Re-calculates when screen size changes (isDesktop/isTablet)
  const visibleColumnsData = React.useMemo(
    () => getVisibleColumns(),
    [getVisibleColumns, storeColumns, visibleColumns, isDesktop, isTablet]
  );

  // Calculate column widths as needed
  const columnWidths = React.useMemo(() => {
    return visibleColumnsData.reduce(
      (acc, column) => {
        acc[column.key] = 150;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [visibleColumnsData]);

  // Render Card View
  if (effectiveViewMode === "card") {
    return (
      <CardView
        columns={columns}
        viewContent={viewContent}
        viewConfig={viewConfig}
        formConfig={formConfig}
        showActions={showActions}
      />
    );
  }

  // Render Table View (default)
  return (
    <div
      /* The single hook every table token hangs off. One attribute on the
         frame, and globals.css reaches the header, the cells and the rows by
         descent — rather than five components each having to remember to
         carry a marker, which is the version of this that rots. Card view
         returns above this point, so the selectors cannot leak into it. */
      data-dt-frame=""
      className={cn(
        "relative overflow-hidden rounded-[calc(var(--radius-xl)*var(--table-radius-scale))]",
        // R3: elevation is the surface ramp, not a same-token gradient wash.
        "bg-card",
        "backdrop-blur-xl",
        // Premium border with subtle gradient effect
        "border border-border/50",
        // Premium shadow
        "shadow-lg shadow-shadow/5 dark:shadow-shadow/20"
      )}
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/[0.02] via-transparent to-secondary/[0.02] pointer-events-none" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-primary/20 to-transparent" />

      {/* Table content with padding */}
      <div className="relative p-2 sm:p-4 w-full overflow-x-auto">
        <Table>
          <TableHeaderComponent columns={columns} showActions={showActions} />
          <TableBody>
            {loading ? (
              <DataTableSkeleton
                columns={visibleColumnsData}
                rows={pageSize}
                columnWidths={columnWidths}
                showSelect={showSelectColumn}
                showActions={showActions}
              />
            ) : error ? (
              <NoDataState
                type="error"
                colSpan={visibleColumnsData.length + (showSelectColumn ? 1 : 0) + (showActions ? 1 : 0)}
              />
            ) : !data || data.length === 0 ? (
              <NoDataState
                type="no-results"
                colSpan={visibleColumnsData.length + (showSelectColumn ? 1 : 0) + (showActions ? 1 : 0)}
              />
            ) : !hasViewPermission ? (
              <NoDataState
                type="no-permission"
                colSpan={visibleColumnsData.length + (showSelectColumn ? 1 : 0) + (showActions ? 1 : 0)}
              />
            ) : (
              <TableRows
                columns={columns}
                viewContent={viewContent}
                viewConfig={viewConfig}
                formConfig={formConfig}
                showActions={showActions}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom gradient fade for scrollable content */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-card/50 to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
