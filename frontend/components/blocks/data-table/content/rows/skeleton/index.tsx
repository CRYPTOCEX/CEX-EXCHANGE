import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCellClasses, getCellContentClasses } from "../../../utils/cell";
import { CellSkeleton } from "./cell";

interface DataTableSkeletonProps {
  columns: ColumnDefinition[];
  rows: number;
  noBorder?: boolean;
  columnWidths: Record<string, number>;
  showSelect?: boolean;
  showActions?: boolean;
}

export function DataTableSkeleton({
  columns,
  rows,
  noBorder = false,
  columnWidths,
  showSelect = false,
  showActions = false,
}: DataTableSkeletonProps) {
  // columns prop is already pre-filtered by getVisibleColumns() in TableContent
  // which excludes expandedOnly columns, so use columns directly
  const visibleColumns = columns;

  return Array.from({ length: rows }).map((_, rowIndex: number) => (
    <React.Fragment key={rowIndex}>
      {/* The spacer row - use TableRow to match actual rows exactly */}
      <TableRow className="h-2 border-0" />

      {/* The skeleton row - matches actual row styling (no background) */}
      <tr
        className={cn(
          "group relative border-0",
          // Match actual row styling
          "rounded-xl"
        )}
      >
        {/* The "select" cell - only show if showSelect is true */}
        {showSelect && (
          <TableCell className={cn(getCellClasses("select", false), "rounded-l-xl")}>
            <div className={getCellContentClasses(false)}>
              <CellSkeleton
                column={{ key: "select", type: "select", title: "Select" }}
                width={16}
              />
            </div>
          </TableCell>
        )}

        {/* The data columns - only visible and non-expandedOnly columns */}
        {visibleColumns.map((column: ColumnDefinition, colIndex: number) => (
          <TableCell
            key={column.key}
            className={cn(
              getCellClasses(column.key, false),
              // Round first column if no select column
              !showSelect && colIndex === 0 && "rounded-l-xl",
              // Round last column if no actions column
              !showActions && colIndex === visibleColumns.length - 1 && "rounded-r-xl"
            )}
          >
            <div className={getCellContentClasses(column.key === "actions")}>
              <CellSkeleton
                column={column}
                width={columnWidths[column.key] || 150}
              />
            </div>
          </TableCell>
        ))}

        {/* The actions cell - only show if showActions is true */}
        {showActions && (
          <TableCell className={cn(getCellClasses("actions", false), "rounded-r-xl")}>
            <div className={getCellContentClasses(true)}>
              <CellSkeleton
                column={{ key: "actions", type: "actions", title: "Actions" }}
                width={40}
              />
            </div>
          </TableCell>
        )}
      </tr>
    </React.Fragment>
  ));
}
