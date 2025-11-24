import React from "react";
import { MetadataItem } from "./metadata-item";
import { CompoundConfig } from "../../../types/table";
import { ImageCell } from "../cells/image";

interface MetadataConfigItem {
  key: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  options?: Array<{ value: string; label: string; color?: string }>;
  render?: (value: any, row: any) => React.ReactNode;
  title: string;
  type?: "text" | "date" | "select";
}

interface CompoundColumnProps {
  column: ColumnDefinition;
  row: Record<string, any>;
}

export function CompoundColumn({ column, row }: CompoundColumnProps) {
  if (!column.render || column.render.type !== "compound") return null;
  const config = column.render.config as CompoundConfig;
  if (!config) return null;
  const compoundValue = row[column.key];
  const dataToUse =
    compoundValue && typeof compoundValue === "object" ? compoundValue : row;
  const imageKey = config.image?.key;
  const imageValue = imageKey ? dataToUse[imageKey] : null;
  let primaryValue = "";
  if (config.primary) {
    if (Array.isArray(config.primary.key)) {
      primaryValue = config.primary.key
        .map((k) => dataToUse[k] ?? "")
        .join(" ");
    } else {
      primaryValue = dataToUse[config.primary.key] ?? "";
    }
  }
  const titleText = column.expandedTitle
    ? column.expandedTitle(row)
    : column.title;
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        {titleText}
      </h3>
      <div className="flex flex-col md:flex-row gap-4 items-start w-full">
        {config.image && (
          <ImageCell
            value={String(imageValue || "")}
            row={dataToUse}
            size="lg"
            fallback={config.image.fallback}
          />
        )}
        <div className="flex-1 space-y-2 text-left">
          {config.primary && (
            <div className="text-xl font-semibold text-foreground">
              {primaryValue}
            </div>
          )}
          {config.secondary && (
            <div className="text-muted-foreground">
              {dataToUse[config.secondary.key] || ""}
            </div>
          )}
          {config.metadata && Array.isArray(config.metadata) && (
            <div className="flex flex-wrap gap-2">
              {config.metadata.map(
                (item: MetadataConfigItem, index: number) => (
                  <MetadataItem
                    key={index}
                    item={item}
                    value={dataToUse[item.key]}
                    row={row}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
