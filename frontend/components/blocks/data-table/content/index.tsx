import React from "react";
import { useTableStore } from "../store";
import { TableRows } from "./rows";
import { Table, TableBody } from "@/components/ui/table";
import { NoDataState } from "../states/no-data-state";
import { TableHeaderComponent } from "./table-header";
import { DataTableSkeleton } from "./rows/skeleton";

interface TableContentProps {
  viewContent?: (row: any) => React.ReactNode;
  columns: ColumnDefinition[];
}

export function TableContent({ viewContent, columns }: TableContentProps) {
  const tableConfig = useTableStore((state) => state.tableConfig);
  const loading = useTableStore((state) => state.loading);
  const error = useTableStore((state) => state.error);
  const data = useTableStore((state) => state.data);
  const visibleColumns = useTableStore((state) => state.visibleColumns);

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

  // Calculate column widths as needed
  const columnWidths = React.useMemo(() => {
    return columns.reduce(
      (acc, column) => {
        acc[column.key] = 150;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [columns]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground overflow-x-auto">
      <div className="p-4 w-full">
        <Table>
          <TableHeaderComponent columns={columns} showActions={showActions} />
          <TableBody>
            {loading ? (
              <DataTableSkeleton
                columns={columns.filter((col) =>
                  visibleColumns.includes(col.key)
                )}
                rows={5}
                columnWidths={columnWidths}
              />
            ) : error ? (
              <NoDataState
                type="error"
                colSpan={columns.length + (showActions ? 2 : 1)}
              />
            ) : !data || data.length === 0 ? (
              <NoDataState
                type="no-results"
                colSpan={columns.length + (showActions ? 2 : 1)}
              />
            ) : !hasViewPermission ? (
              <NoDataState
                type="no-permission"
                colSpan={columns.length + (showActions ? 2 : 1)}
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
    </div>
  );
}
