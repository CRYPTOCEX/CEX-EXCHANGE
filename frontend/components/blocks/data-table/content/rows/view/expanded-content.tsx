"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { HiddenColumns } from "./hidden-columns";
import { CompoundColumn } from "./compound-column";
import { useTableStore } from "../../../store";

interface ExpandedContentProps {
  row: any;
  columnDefs: ColumnDefinition[];
  visibleColumns: string[];
  viewContent?: (row: any) => React.ReactNode;
}

export function ExpandedContent({
  row,
  columnDefs,
  visibleColumns,
  viewContent,
}: ExpandedContentProps) {
  const compoundColumns = columnDefs.filter((col) => col.type === "compound");
  const tableConfig = useTableStore((state) => state.tableConfig);

  return (
    <div className="bg-background dark:border shadow-lg rounded-lg m-3">
      <div className="p-5">
        {compoundColumns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {compoundColumns.map((column) => (
              <CompoundColumn key={column.key} column={column} row={row} />
            ))}
          </div>
        )}
        <HiddenColumns
          row={row}
          columnDefs={columnDefs}
          visibleColumns={visibleColumns}
        />
        {viewContent && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">{viewContent(row)}</div>
          </>
        )}
      </div>
      {tableConfig.expandedButtons &&
        tableConfig.expandedButtons(row) !== null && (
          <div className="px-[1px]">
            <Separator className="mt-4" />
            <div className="flex flex-wrap gap-2 p-4">
              {tableConfig.expandedButtons(
                row,
                useTableStore.getState().fetchData
              )}
            </div>
          </div>
        )}
    </div>
  );
}
