import React from "react";
import { Badge } from "@/components/ui/badge";
import { CellRendererProps } from "./cell-renderer-props";

interface CustomField {
  name: string;
  title: string;
  type: string;
  required?: boolean;
  options?: string[];
  [key: string]: any;
}

interface CustomFieldsCellProps extends CellRendererProps<CustomField[] | string> {
  maxDisplay?: number;
}

export function CustomFieldsCell({
  value,
  row,
  maxDisplay = 3,
}: CustomFieldsCellProps) {
  // Handle null/undefined
  if (!value) {
    return <span className="text-muted-foreground text-xs">No custom fields</span>;
  }

  // Parse if it's a string
  let fields: CustomField[] = [];
  try {
    if (typeof value === "string") {
      fields = JSON.parse(value);
    } else if (Array.isArray(value)) {
      fields = value;
    } else {
      return <span className="text-muted-foreground text-xs">Invalid format</span>;
    }
  } catch (error) {
    return <span className="text-destructive text-xs">Error parsing fields</span>;
  }

  // Handle empty array
  if (!Array.isArray(fields) || fields.length === 0) {
    return <span className="text-muted-foreground text-xs">No custom fields</span>;
  }

  const displayFields = fields.slice(0, maxDisplay);
  const remainingCount = fields.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayFields.map((field, index) => {
        const label = field.title || field.name || `Field ${index + 1}`;
        const isRequired = field.required;

        return (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs font-normal"
          >
            {label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs font-normal">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
