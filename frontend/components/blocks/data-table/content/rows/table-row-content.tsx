"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTableStore } from "../../store";
import { TableCell } from "@/components/ui/table";
import { RowActions } from "./actions";
import { CellRenderer } from "./cells";
import { Checkbox } from "@/components/ui/checkbox";
import { getCellClasses, getCellContentClasses, getPrimaryColumn } from "../../utils/cell";

interface TableRowContentProps {
  row: any;
  columns: ColumnDefinition[];
  isExpanded: boolean;
  showActions: boolean;
  layoutId?: string;
}

function getNestedValue(obj: any, key: string) {
  return key.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export const TableRowContent = React.memo(
  ({ row, columns, isExpanded, showActions, layoutId }: TableRowContentProps) => {
    const selectedRows = useTableStore((state) => state.selectedRows);
    const toggleRowSelection = useTableStore(
      (state) => state.toggleRowSelection
    );
    const visibleColumns = useTableStore((state) => state.visibleColumns);
    const tableConfig = useTableStore((state) => state.tableConfig);
    const getVisibleColumns = useTableStore((state) => state.getVisibleColumns);

    // Determine if the select column should be displayed.
    const showSelectColumn =
      tableConfig.canCreate || tableConfig.canEdit || tableConfig.canDelete;

    // Get visible columns data to find primary column
    const visibleColumnsData = React.useMemo(
      () => getVisibleColumns({ ignorePriority: true }),
      [getVisibleColumns]
    );

    // Find primary column using shared utility
    const primaryColumn = React.useMemo(
      () => getPrimaryColumn(visibleColumnsData),
      [visibleColumnsData]
    );

    // Get all columns that will appear in expanded view
    const allColumnsForExpanded = React.useMemo(() => {
      return columns.filter(
        (col) => col.key !== "select" && col.key !== "actions"
      );
    }, [columns]);

    return (
      <>
        {showSelectColumn && (
          <TableCell
            className={getCellClasses("select", isExpanded)}
            data-prevent-expand={true}
          >
            <div className={getCellContentClasses(false)}>
              <Checkbox
                checked={selectedRows.includes(row.id)}
                onCheckedChange={() => toggleRowSelection(row.id)}
                aria-label={`Select row ${row.id}`}
              />
            </div>
          </TableCell>
        )}
        {columns
          // Only render columns that are both visible and not flagged as expandedOnly
          .filter(
            (column) =>
              visibleColumns.includes(column.key) && !column.expandedOnly
          )
          .map((column) => {
            const cellValue = getNestedValue(row, column.key);

            return (
              <TableCell
                key={`${row.id}-${column.key}`}
                className={getCellClasses(column.key, isExpanded)}
              >
                {layoutId ? (
                  <motion.div
                    layoutId={`field-value-${column.key}-${row.id}-${layoutId}`}
                    className={getCellContentClasses(column.key === "actions")}
                  >
                    <CellRenderer
                      renderType={column.render || { type: column.type }}
                      value={cellValue}
                      row={row}
                      cropText={true}
                      breakText={column.type === "textarea"}
                    />
                  </motion.div>
                ) : (
                  <div className={getCellContentClasses(column.key === "actions")}>
                    <CellRenderer
                      renderType={column.render || { type: column.type }}
                      value={cellValue}
                      row={row}
                      cropText={true}
                      breakText={column.type === "textarea"}
                    />
                  </div>
                )}
              </TableCell>
            );
          })}
        {showActions && (
          <TableCell
            className={getCellClasses("actions", isExpanded)}
            data-prevent-expand={true}
          >
            <div className={getCellContentClasses(true)}>
              <RowActions row={row} />
            </div>
          </TableCell>
        )}
      </>
    );
  }
);

TableRowContent.displayName = "TableRowContent";
