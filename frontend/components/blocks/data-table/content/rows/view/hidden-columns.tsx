import React from "react";
import { CellRenderer } from "../cells";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

interface HiddenColumnsProps {
  row: any;
  columnDefs: ColumnDefinition[];
  visibleColumns: string[];
}
export function HiddenColumns({
  row,
  columnDefs,
  visibleColumns,
}: HiddenColumnsProps) {
  const hiddenColumns = columnDefs.filter(
    (col) =>
      (!visibleColumns.includes(col.key) || col.expandedOnly) &&
      col.type !== "compound" &&
      col.key !== "select" &&
      col.key !== "actions"
  );
  if (hiddenColumns.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hiddenColumns.map((col) => {
        const value = row[col.key];
        if (col.type === "customFields") {
          return (
            <div key={col.key} className="flex flex-col md:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">
                {col.title}
              </span>
              <RenderCustomFields value={value} />
            </div>
          );
        }
        return (
          <div key={col.key} className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              {col.title}
            </span>
            <span className="text-sm">
              <CellRenderer
                renderType={
                  col.render || {
                    type: col.type,
                  }
                }
                value={value}
                row={row}
                breakText={true}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
function RenderCustomFields({ value }: { value: any }) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/view/hidden-columns"
  );
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return (
        <span className="text-sm text-destructive">{t("invalid_json")}</span>
      );
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-sm">{t("None")}</span>;
  }
  const typeIcons: Record<string, string> = {
    input: "mdi:form-textbox",
    textarea: "mdi:form-textarea",
    file: "mdi:file-document",
    image: "mdi:image",
  };
  return (
    <div className="mt-1 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {value.map((field: any, i: number) => {
        const iconName = typeIcons[field.type] || typeIcons["input"];
        return (
          <div
            key={i}
            className="border border-muted dark:border-muted rounded-md p-3 flex flex-col space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {iconName && (
                  <Icon
                    icon={iconName}
                    className="h-4 w-4 text-muted-foreground"
                  />
                )}
                <span className="font-semibold">
                  {field.title || field.name}
                </span>
              </div>
              {field.required && (
                <span className="text-xs text-green-700 bg-green-50 dark:bg-green-800/30 dark:text-green-400 rounded px-1 py-0.5">
                  {t("Required")}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>{t("name")}</strong> {field.name}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>{t("type")}</strong> {field.type || "input"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
