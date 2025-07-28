"use client";

import React from "react";
import { ImageCell } from "../cells/image"; // Use the enhanced ImageCell with fallback logic
import { cn } from "@/lib/utils";
import { CompoundConfig, BadgeVariant } from "../../../types/table";

interface MetadataItem {
  key: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  type?: "text" | "date" | "select";
  options?: Array<{ value: string; label: string; color?: BadgeVariant }>;
  render?: (value: any) => React.ReactNode;
}

interface CompoundCellProps {
  value: any;
  row: any;
  config: CompoundConfig;
}

// Custom gateway image component for payment gateway logos
const GatewayImage: React.FC<{ 
  src: string; 
  alt: string; 
  fallback?: string;
}> = ({ src, alt, fallback }) => {
  const [imgError, setImgError] = React.useState(false);
  
  if (!src || imgError) {
    return (
      <div className="w-30 h-18 flex items-center justify-center bg-muted rounded border text-xs text-muted-foreground">
        {fallback ? (
          <img 
            src={fallback} 
            alt={alt}
            className="w-full h-full object-contain rounded"
            onError={() => setImgError(true)}
          />
        ) : (
          "No Logo"
        )}
      </div>
    );
  }
  
  return (
    <div className="w-30 h-18 flex items-center justify-center bg-white rounded border">
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

function getNestedValue(obj: any, path: string): any {
  return path
    .split(".")
    .reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

const colorVariants: Record<BadgeVariant, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  destructive: "text-rose-600 dark:text-rose-400",
  danger: "text-rose-600 dark:text-rose-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  primary: "text-primary",
  secondary: "text-secondary",
  muted: "text-muted-foreground",
  default: "text-foreground",
};

export function CompoundCell({ value, row, config }: CompoundCellProps) {
  if (!config) return null;

  const dataToUse = value && typeof value === "object" ? value : row || {};

  const imageKey = config.image?.key;
  const imageValue = imageKey ? dataToUse[imageKey] : null;

  const primaryValue = config.primary
    ? Array.isArray(config.primary.key)
      ? config.primary.key
          .map((k: string) => getNestedValue(dataToUse, k) ?? "")
          .join(" ")
      : (getNestedValue(dataToUse, config.primary.key) ?? "")
    : "";

  const secondaryValue = config.secondary
    ? getNestedValue(dataToUse, config.secondary.key)
    : null;

  const PrimaryIcon = config.primary?.icon;
  const SecondaryIcon = config.secondary?.icon;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {config.image && (
        <div className="shrink-0">
          {config.image.size === "gateway" ? (
            <GatewayImage
              src={String(imageValue || "")}
              alt={primaryValue || "Gateway Logo"}
              fallback={config.image.fallback}
            />
          ) : (
            <div className="min-w-12 min-h-12">
              <ImageCell
                value={String(imageValue || "")}
                row={dataToUse}
                size="sm"
                fallback={config.image.fallback}
                alt={primaryValue || "Logo"}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex-1">
        {primaryValue && (
          <div className="flex items-center gap-1">
            {PrimaryIcon && (
              <PrimaryIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium truncate">{primaryValue}</span>
          </div>
        )}
        {secondaryValue && (
          <div className="flex items-center gap-1">
            {SecondaryIcon && (
              <SecondaryIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground truncate">
              {secondaryValue}
            </span>
          </div>
        )}
        {config.metadata && (
          <div className="flex flex-wrap gap-2 mt-1">
            {config.metadata.map((item: MetadataItem, index: number) => {
              const MetadataIcon = item.icon;
              const val = getNestedValue(dataToUse, item.key);
              let renderedContent: React.ReactNode;
              if (val == null) {
                renderedContent = "N/A";
              } else if (item.render) {
                try {
                  renderedContent = item.render(val);
                } catch (error) {
                  console.error(
                    "Error rendering metadata for key:",
                    item.key,
                    error
                  );
                  renderedContent = "N/A";
                }
              } else {
                renderedContent = val;
              }

              if (item.options) {
                const roleId = val?.id?.toString() || val;
                const option = item.options.find((opt) => opt.value === roleId);
                const colorClass = option?.color
                  ? colorVariants[option.color]
                  : "text-muted-foreground";

                return (
                  <div
                    key={`${item.key}-${index}`}
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      index > 0 && "border-l pl-2"
                    )}
                  >
                    {MetadataIcon && (
                      <MetadataIcon className={cn("h-3 w-3", colorClass)} />
                    )}
                    <span className={colorClass}>
                      {val?.name || option?.label || renderedContent}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`${item.key}-${index}`}
                  className={cn(
                    "flex items-center gap-1 text-xs text-muted-foreground",
                    index > 0 && "border-l pl-2"
                  )}
                >
                  {MetadataIcon && <MetadataIcon className="h-3 w-3" />}
                  <span>{renderedContent}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
