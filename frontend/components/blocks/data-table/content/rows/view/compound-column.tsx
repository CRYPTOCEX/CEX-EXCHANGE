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

// Helper function to get nested values using dot notation
function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  return path
    .split(".")
    .reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

// Helper function to strip column key prefix from a path
function stripPrefix(path: string, prefix: string): string {
  if (path.startsWith(prefix + ".")) {
    return path.substring(prefix.length + 1);
  }
  return path;
}

export function CompoundColumn({ column, row }: CompoundColumnProps) {
  if (!column.render || column.render.type !== "compound") return null;
  const config = column.render.config as CompoundConfig;
  if (!config) return null;
  const compoundValue = row[column.key];
  const isUsingCompoundValue = compoundValue && typeof compoundValue === "object";
  const dataToUse = isUsingCompoundValue ? compoundValue : row;

  // Helper to get the correct key - strip prefix if we're using the compound value
  const getKey = (key: string) => isUsingCompoundValue ? stripPrefix(key, column.key) : key;

  const imageKey = config.image?.key;
  const imageValue = imageKey ? getNestedValue(dataToUse, getKey(imageKey)) : null;

  let primaryValue = "";
  if (config.primary) {
    if (Array.isArray(config.primary.key)) {
      primaryValue = config.primary.key
        .map((k) => getNestedValue(dataToUse, getKey(k)) ?? "")
        .filter(Boolean)
        .join(" ");
    } else {
      primaryValue = getNestedValue(dataToUse, getKey(config.primary.key)) ?? "";
    }
  }

  const secondaryValue = config.secondary
    ? getNestedValue(dataToUse, getKey(config.secondary.key))
    : null;

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
              {secondaryValue || ""}
            </div>
          )}
          {config.metadata && Array.isArray(config.metadata) && (
            <div className="flex flex-wrap gap-2">
              {config.metadata.map(
                (item: MetadataConfigItem, index: number) => (
                  <MetadataItem
                    key={index}
                    item={item}
                    value={getNestedValue(dataToUse, getKey(item.key))}
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
