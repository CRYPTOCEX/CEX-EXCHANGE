"use client";

import React, { useId } from "react";
import { useTableStore } from "../../store";
import { DataCard } from "./data-card";
import { DataCardSkeleton } from "./skeleton";
import { NoDataState } from "../../states/no-data-state";
import { ExpandedCard } from "./expanded-card";
import { ViewDialogHost } from "../../view-dialog/view-dialog-host";
import type { FormConfig, ViewConfig } from "../../types/table";

interface CardViewProps {
  columns: ColumnDefinition[];
  viewContent?: (row: any) => React.ReactNode;
  viewConfig?: ViewConfig;
  formConfig?: FormConfig;
  showActions: boolean;
}

/* The grid no longer orchestrates a staggered entrance. It is the same grid
   whether the cards inside it are pending or resolved (see the note below), so
   staggering it meant the resolved cards re-entered one by one over a layout
   the skeleton had already drawn. */

export function CardView({
  columns,
  viewContent,
  viewConfig,
  formConfig,
  showActions,
}: CardViewProps) {
  const loading = useTableStore((state) => state.loading);
  const error = useTableStore((state) => state.error);
  const data = useTableStore((state) => state.data);
  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
  const storeColumns = useTableStore((state) => state.columns);
  const visibleColumnKeys = useTableStore((state) => state.visibleColumns);
  const pageSize = useTableStore((state) => state.pageSize);

  // Expandable card state
  const [activeCard, setActiveCard] = React.useState<any | null>(null);
  const id = useId();

  const closeDialog = React.useCallback(() => setActiveCard(null), []);

  // Check if select column should be shown (custom bulk actions also enable selection)
  const showSelectColumn = Boolean(
    tableConfig.canCreate ||
      tableConfig.canEdit ||
      tableConfig.canDelete ||
      tableConfig.bulkActions?.length
  );

  // Get visible columns for cards - ignore priority filtering since cards have their own layout
  // Dependencies include storeColumns and visibleColumnKeys to ensure recalculation when table changes
  const visibleColumnsData = React.useMemo(
    () => getVisibleColumns({ ignorePriority: true }),
    [getVisibleColumns, storeColumns, visibleColumnKeys]
  );

  /*
   * WHY THE THREE BAIL-OUTS BECAME ONE
   * ----------------------------------
   * This function used to open with
   *
   *     if (loading) return <CardViewSkeleton count={pageSize} />;
   *
   * — the whole card grid swapped for a second, separately-written grid. Two
   * grids mean two copies of the layout, and the copy had drifted badly: wrong
   * tile count, tiles 7px short each, an actions button `DataCard` does not
   * render, and a 48px full-width "show more" bar that resolves into a 27px
   * pill or into nothing at all (the pixel accounting is in ./skeleton.tsx).
   * There is now ONE grid, and the cards inside it are pending or resolved.
   *
   * Which meant the three "nothing to show" returns had to stop competing with
   * the loading state. They now resolve to a single value first, computed only
   * once the request has SETTLED — precedence unchanged, since loading was
   * checked before all three before. `loading` is not `empty`, and keeping the
   * distinction in a value rather than in control flow is what lets one layout
   * serve both.
   */
  const settledEmptyState: "error" | "no-results" | "no-permission" | null =
    loading
      ? null
      : error
        ? "error"
        : !data || data.length === 0
          ? "no-results"
          : !hasViewPermission
            ? "no-permission"
            : null;

  if (settledEmptyState) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground p-6">
        <NoDataState type={settledEmptyState} colSpan={1} isCard />
      </div>
    );
  }

  // Cards are always expandable in card view
  const canExpand = true;

  return (
    <>
      <ViewDialogHost activeRow={activeCard} onClose={closeDialog} hostId={id}>
        {(panelRef) => (
          <ExpandedCard
            ref={panelRef}
            row={activeCard}
            columns={columns}
            visibleColumns={visibleColumnsData}
            onClose={closeDialog}
            layoutId={id}
            viewContent={viewContent}
            viewConfig={viewConfig}
            formConfig={formConfig}
            showActions={showActions}
          />
        )}
      </ViewDialogHost>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* A list has no knowable length, so the pending pass renders one card
            per page slot and accepts that the count settles — the container and
            the card SHAPE are what have to be right, and both now are. */}
        {loading
          ? Array.from({ length: pageSize }).map((_, index) => (
              <DataCardSkeleton
                key={`pending-${index}`}
                columns={columns}
                visibleColumns={visibleColumnsData}
                showSelect={showSelectColumn ?? false}
              />
            ))
          : data.map((row) => (
              <DataCard
                key={row.id}
                row={row}
                columns={columns}
                visibleColumns={visibleColumnsData}
                showSelect={showSelectColumn ?? false}
                viewContent={viewContent}
                layoutId={id}
                onExpand={canExpand ? () => setActiveCard(row) : undefined}
                isActiveCard={activeCard?.id === row.id}
              />
            ))}
      </div>
    </>
  );
}
