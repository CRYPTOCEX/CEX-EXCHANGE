import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { CellRendererProps } from "./cell-renderer-props";

interface DateCellProps extends CellRendererProps<string | number | Date> {
  formatString?: string;
  fullDate?: boolean; // when true, show detailed tooltip format
}

export function DateCell({
  value,
  row,
  formatString = "PPP",
  fullDate = true,
}: DateCellProps) {
  let date: Date | null = null;

  if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  }

  if (!date || isNaN(date.getTime())) {
    return <span></span>;
  }

  // Determine tooltip format based on the fullDate flag
  const tooltipFormat = fullDate ? "PPP p" : formatString;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
        </TooltipTrigger>
        <TooltipContent>{format(date, tooltipFormat)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
