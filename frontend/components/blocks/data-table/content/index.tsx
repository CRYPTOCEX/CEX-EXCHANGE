import React from "react";
import { useTableStore } from "../store";
import { TableRows } from "./rows";
import { Table, TableBody } from "@/components/ui/table";
import { NoDataState } from "../states/no-data-state";
import { TableHeaderComponent } from "./table-header";
import { DataTableSkeleton } from "./rows/skeleton";
import { CardView } from "./card-view";
import { motion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

// Premium container animation for table entrance
const tableContainerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface TableContentProps {
  viewContent?: (row: any) => React.ReactNode;
  columns: ColumnDefinition[];
}

export function TableContent({ viewContent, columns }: TableContentProps) {
  const tableConfig = useTableStore((state) => state.tableConfig);
  const loading = useTableStore((state) => state.loading);
  const error = useTableStore((state) => state.error);
  const data = useTableStore((state) => state.data);
  const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);
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
  const showActions = hasEditAction || hasDeleteAction || hasViewAction;

  // Check if select column should be shown (only if at least one action is allowed)
  const showSelectColumn =
    tableConfig.canCreate || tableConfig.canEdit || tableConfig.canDelete;

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
    [getVisibleColumns, isDesktop, isTablet]
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
        showActions={showActions}
      />
    );
  }

  // Render Table View (default)
  return (
    <motion.div
      variants={tableContainerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-xl",
        // Glassmorphism base
        "bg-gradient-to-br from-card/95 via-card to-card/90",
        "backdrop-blur-xl",
        // Premium border with subtle gradient effect
        "border border-border/50",
        // Premium shadow
        "shadow-lg shadow-black/5 dark:shadow-black/20"
      )}
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02] pointer-events-none" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

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
                showActions={showActions}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom gradient fade for scrollable content */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/50 to-transparent pointer-events-none opacity-50" />
    </motion.div>
  );
}
