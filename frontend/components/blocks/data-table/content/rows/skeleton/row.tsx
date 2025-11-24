import React from "react";
import { TableCell } from "@/components/ui/table";
import { CellSkeleton } from "./cell";
import { getCellClasses, getCellContentClasses } from "../../../utils/cell";

interface RowSkeletonProps {
  columns: ColumnDefinition[];
  columnWidths: Record<string, number>;
  noBorder?: boolean;
}

export function RowSkeleton({
  columns,
  columnWidths,
  noBorder,
}: RowSkeletonProps) {
  return (
    <>
      {/* "select" cell with required title */}
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

      {/* The actions cell */}
      <TableCell className={getCellClasses("actions", false, true)}>
        <div className={getCellContentClasses(true)}>
          <CellSkeleton
            column={{ key: "actions", type: "actions", title: "Actions" }}
            width={40}
          />
        </div>
      </TableCell>
    </>
  );
}
