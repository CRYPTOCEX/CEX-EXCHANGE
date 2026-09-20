import React from "react";
import { CellRendererProps } from "./cell-renderer-props";
import { cn } from "@/lib/utils";

interface TextCellProps extends CellRendererProps<string> {
  breakText?: boolean;
  /** If true, text will be truncated to 150 characters with an ellipsis. */
  cropText?: boolean;
}

export function TextCell({ value, breakText, cropText }: TextCellProps) {
  let displayValue = value;

  if (cropText && displayValue.length > 100) {
    displayValue = displayValue.slice(0, 100) + "...";
  }

  return (
    <span
      className={cn("truncate", {
        "whitespace-pre-wrap break-words": breakText,
      })}
    >
      {displayValue}
    </span>
  );
}
