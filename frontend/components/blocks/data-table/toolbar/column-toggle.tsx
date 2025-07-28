import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

export function ColumnToggle() {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/column-toggle"
  );
  const canView = useTableStore((state) => state.tableConfig.canView);
  const visibleColumns = useTableStore((state) => state.visibleColumns);
  const toggleColumnVisibility = useTableStore(
    (state) => state.toggleColumnVisibility
  );
  const columns = useTableStore((state) => state.columns);

  if (!columns || columns.length === 0 || !canView) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
          {t("Columns")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[200px]", "ltr:text-left rtl:text-right")}
      >
        <DropdownMenuLabel>{t("toggle_columns")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns
          // Hide expandedOnly columns from toggle
          .filter(
            (column) =>
              column.key !== "select" &&
              column.key !== "actions" &&
              !column.expandedOnly
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              className="capitalize cursor-pointer"
              checked={visibleColumns.includes(column.key)}
              onCheckedChange={() => toggleColumnVisibility(column.key)}
            >
              {column.title}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
