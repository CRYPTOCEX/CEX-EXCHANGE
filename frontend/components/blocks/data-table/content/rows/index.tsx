"use client";

import React, { useId } from "react";
import { useTableStore } from "../../store";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TableRowContent } from "./table-row-content";
import { ExpandedCard } from "../card-view/expanded-card";
import { ViewDialogHost } from "../../view-dialog/view-dialog-host";
import type { FormConfig, ViewConfig } from "../../types/table";

interface TableRowsProps {
  columns: ColumnDefinition[];
  viewContent?: (row: any) => React.ReactNode;
  viewConfig?: ViewConfig;
  formConfig?: FormConfig;
  showActions: boolean;
}

/* A row is a PLAIN `<tr>`. It used to be a `motion.tr` mounting at `y: 8` with
   a `delay: i * 0.04` stagger, which is where the "everything slides up" on
   page load came from: the skeleton rows this list replaces are plain `<tr>`s
   drawn at the resting position, so the swap redrew each row 8px low and eased
   it back — the tenth row a full 0.4s after the first. The `exit` half of those
   variants was dead anyway; `TableBody` is not inside an `AnimatePresence`, so
   nothing ever ran it. Row hover/selection are CSS transitions on the class
   list and are untouched. */

export function TableRows({
  columns,
  viewContent,
  viewConfig,
  formConfig,
  showActions,
}: TableRowsProps) {
  const data = useTableStore((state) => state.data);
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
  const storeColumns = useTableStore((state) => state.columns);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const canView = tableConfig.canView;

  // Modal expansion state (Aceternity style)
  const [activeRow, setActiveRow] = React.useState<any | null>(null);
  const id = useId();

  const closeDialog = React.useCallback(() => setActiveRow(null), []);

  // Get visible columns data for expanded card
  // Dependencies include storeColumns and visibleColumns to ensure recalculation when table changes
  const visibleColumnsData = React.useMemo(
    () => getVisibleColumns({ ignorePriority: true }),
    [getVisibleColumns, storeColumns, visibleColumns]
  );

  // Calculate if expansion would show any content
  const hasExpandableContent = React.useMemo(() => {
    // Check for hidden columns (columns not currently visible or expandedOnly)
    const hiddenColumns = columns.filter(
      (col) =>
        (!visibleColumns.includes(col.key) || col.expandedOnly) &&
        col.type !== "compound" &&
        col.key !== "select" &&
        col.key !== "actions"
    );

    // Check for compound columns
    const compoundColumns = columns.filter((col) => col.type === "compound");

    // Count visible columns (excluding select and actions)
    const visibleDataColumnCount = visibleColumns.filter(
      (key) => key !== "select" && key !== "actions"
    ).length;

    // Has content if there are hidden columns, compound columns, a configured
    // view dialog, viewContent, expanded buttons, or more than 5 visible columns
    return (
      hiddenColumns.length > 0 ||
      compoundColumns.length > 0 ||
      Boolean(viewContent) ||
      Boolean(viewConfig) ||
      Boolean(tableConfig.expandedButtons) ||
      visibleDataColumnCount > 5
    );
  }, [columns, visibleColumns, viewContent, viewConfig, tableConfig.expandedButtons]);

  // Count visible columns (excluding select and actions) for expansion check
  const visibleDataColumnCount2 = React.useMemo(() => {
    return visibleColumns.filter(
      (key) => key !== "select" && key !== "actions"
    ).length;
  }, [visibleColumns]);

  // Allow expansion if:
  // 1. canView is true AND there's content to show
  // 2. If there are more than 5 columns, allow expansion even with viewLink (to prevent horizontal overflow)
  // 3. A `viewConfig` is an explicit statement that this table HAS a details
  //    dialog worth opening, so it outranks the "there's a detail page already"
  //    suppression — otherwise a configured dialog would be unreachable.
  const canExpand = canView && hasExpandableContent && (
    Boolean(viewConfig) ||
    visibleDataColumnCount2 > 5 ||
    !(tableConfig.viewLink || tableConfig.onViewClick)
  );

  const selectedRows = useTableStore((state) => state.selectedRows);

  return (
    <>
      <ViewDialogHost activeRow={activeRow} onClose={closeDialog} hostId={id}>
        {(panelRef) => (
          <ExpandedCard
            ref={panelRef}
            row={activeRow}
            columns={columns}
            visibleColumns={visibleColumnsData}
            onClose={closeDialog}
            layoutId={id}
            viewContent={viewContent}
            viewConfig={viewConfig}
            formConfig={formConfig}
            showActions={showActions}
            sourceType="row"
          />
        )}
      </ViewDialogHost>

      {/* Table rows */}
      {data.map((row, rowIndex) => {
        const isSelected = selectedRows.includes(row.id);
        const isDeleted = Boolean(row.deletedAt);
        const isActiveRow = activeRow?.id === row.id;

        return (
          <React.Fragment key={row.id}>
            <TableRow className="h-2 border-0" />
            {/* No `layoutId` here. It used to pair with the expanded dialog so
                the row morphed into the panel, but a row is ~1900x60 and the
                panel ~600x700 — a 32:1 box becoming a 0.86:1 one. Framer gets
                there with scale(0.63, 6.3) mid-flight, which is why the closing
                row rendered as tall, narrow, smeared text. The dialog is a
                modal now: it scales and fades in place, and the row simply
                stays put behind the backdrop. */}
            <tr
              /**
               * Parity comes from the DATA index, not from `:nth-child`.
               *
               * Every row is preceded by an `h-2` spacer `<tr>`, so in the DOM
               * the data rows are all even and a CSS `:nth-child(odd)` stripe
               * would paint the spacers instead of the rows — a zebra of blank
               * 8px bands. Counting here is the only place the real sequence is
               * known.
               */
              data-dt-row={rowIndex % 2 === 1 ? "odd" : "even"}
              className={cn(
                "group relative border-0 transition-all duration-300",
                /* Hover, striping and the row separator are in the
                   `[data-dt-frame]` block in globals.css. `hover:bg-primary/5`
                   used to be here and had to go: a utility outranks the
                   components layer, so leaving it would have pinned the hover
                   wash and made the strength control dead. */
                // Cursor and interaction - only pointer if expandable
                canExpand ? "cursor-pointer" : "cursor-default",
                // Always rounded in modal-style expansion
                "rounded-xl",
                // Selected state with premium highlight
                isSelected && "bg-primary/10",
                // Deleted state
                isDeleted && "opacity-50 grayscale",
                // Disable pointer events when active to prevent clicks
                isActiveRow && "pointer-events-none"
              )}
              onClick={(e) => {
                if (!canExpand) return;
                const target = e.target as HTMLElement;
                const isCheckboxOrAction =
                  target.closest("[data-prevent-expand]") ||
                  target.closest('[role="checkbox"]') ||
                  target.closest('[role="menuitem"]') ||
                  target.closest("button");
                if (!isCheckboxOrAction) {
                  setActiveRow(row);
                }
              }}
            >
              <TableRowContent
                row={row}
                columns={columns}
                isExpanded={false}
                showActions={showActions}
              />
            </tr>
          </React.Fragment>
        );
      })}
    </>
  );
}
