import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
// Remove references to row-skeleton if not needed, or fix that import
// import { RowSkeleton } from "./row";
import { getCellClasses, getCellContentClasses } from "../../../utils/cell";
import { CellSkeleton } from "./cell";

interface DataTableSkeletonProps {
  columns: ColumnDefinition[];
  rows: number;
  noBorder?: boolean;
  columnWidths: Record<string, number>;
}

export function DataTableSkeleton({
  columns,
  rows,
  noBorder = false,
  columnWidths,
}: DataTableSkeletonProps) {
  return Array.from({ length: rows }).map((_, rowIndex: number) => (
    <React.Fragment key={rowIndex}>
      {/* The spacer row */}
      <TableRow className="h-2 border-none" />

      {/* The skeleton row */}
      <TableRow
        className={cn("hover:bg-muted/50 relative border-none rounded-lg")}
      >
        {/* The "select" cell. Provide a title so ColumnDefinition won't complain */}
        <TableCell className={getCellClasses("select", false, true)}>
          <div className={getCellContentClasses(false)}>
            <CellSkeleton
              column={{ key: "select", type: "select", title: "Select" }}
              width={16}
            />
          </div>
        </TableCell>

        {/* The data columns */}
        {columns.map((column: ColumnDefinition) => (
          <TableCell
            key={column.key}
            className={getCellClasses(column.key, false, true)}
            style={{ width: columnWidths[column.key] }}
          >
            <div className={getCellContentClasses(column.key === "actions")}>
              <CellSkeleton
                column={column}
                width={
                  columnWidths[column.key] ||
                  (column.key === "status"
                    ? 100
                    : column.key === "emailVerified"
                      ? 80
                      : column.key === "actions"
                        ? 40
                        : 150)
                }
              />
            </div>
          </TableCell>
        ))}

        {/* The actions cell, again with a required title */}
        <TableCell className={getCellClasses("actions", false, true)}>
          <div className={getCellContentClasses(true)}>
            <CellSkeleton
              column={{ key: "actions", type: "actions", title: "Actions" }}
              width={40}
            />
          </div>
        </TableCell>
      </TableRow>
    </React.Fragment>
  ));
}
