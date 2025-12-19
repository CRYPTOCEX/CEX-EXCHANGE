"use client";

import React, { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useTableStore } from "../../store";
import { TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TableRowContent } from "./table-row-content";
import { ExpandedCard, CloseIcon } from "../card-view/expanded-card";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface TableRowsProps {
  columns: ColumnDefinition[];
  viewContent?: (row: any) => React.ReactNode;
  showActions: boolean;
}

// Premium row animation variants with staggered entrance
const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function TableRows({
  columns,
  viewContent,
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
  const expandedRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close expanded row
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRow(null);
      }
    }

    if (activeRow) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeRow]);

  // Close when clicking outside
  useOutsideClick(expandedRef, () => setActiveRow(null));

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

    // Has content if there are hidden columns, compound columns, viewContent, expanded buttons, or more than 5 visible columns
    return (
      hiddenColumns.length > 0 ||
      compoundColumns.length > 0 ||
      Boolean(viewContent) ||
      Boolean(tableConfig.expandedButtons) ||
      visibleDataColumnCount > 5
    );
  }, [columns, visibleColumns, viewContent, tableConfig.expandedButtons]);

  // Count visible columns (excluding select and actions) for expansion check
  const visibleDataColumnCount2 = React.useMemo(() => {
    return visibleColumns.filter(
      (key) => key !== "select" && key !== "actions"
    ).length;
  }, [visibleColumns]);

  // Allow expansion if:
  // 1. canView is true AND there's content to show
  // 2. If there are more than 5 columns, allow expansion even with viewLink (to prevent horizontal overflow)
  const canExpand = canView && hasExpandableContent && (
    visibleDataColumnCount2 > 5 || !(tableConfig.viewLink || tableConfig.onViewClick)
  );

  const selectedRows = useTableStore((state) => state.selectedRows);

  // Modal content to be portaled outside table structure
  const modalContent = (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {activeRow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm h-full w-full z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Expanded row modal */}
      <AnimatePresence>
        {activeRow && (
          <div className="fixed inset-0 grid place-items-center z-[110] p-4">
            <motion.button
              key={`close-button-${activeRow.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 lg:hidden items-center justify-center bg-card rounded-full h-8 w-8 z-[120] shadow-lg border border-border"
              onClick={() => setActiveRow(null)}
            >
              <CloseIcon />
            </motion.button>
            <ExpandedCard
              ref={expandedRef}
              row={activeRow}
              columns={columns}
              visibleColumns={visibleColumnsData}
              onClose={() => setActiveRow(null)}
              layoutId={id}
              viewContent={viewContent}
              showActions={showActions}
              sourceType="row"
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Portal modal outside table structure to avoid hydration errors */}
      {typeof document !== "undefined" && createPortal(modalContent, document.body)}

      {/* Table rows */}
      {data.map((row, index) => {
        const isSelected = selectedRows.includes(row.id);
        const isDeleted = Boolean(row.deletedAt);
        const isActiveRow = activeRow?.id === row.id;

        return (
          <React.Fragment key={row.id}>
            <TableRow className="h-2 border-0" />
            <motion.tr
              layoutId={`row-${row.id}-${id}`}
              custom={index}
              variants={rowVariants}
              initial="hidden"
              animate={isActiveRow ? { opacity: 0 } : "visible"}
              exit="exit"
              className={cn(
                "group relative border-0 transition-all duration-300",
                // Premium row styling with subtle hover highlight
                "hover:bg-primary/5",
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
                layoutId={id}
              />
            </motion.tr>
          </React.Fragment>
        );
      })}
    </>
  );
}
