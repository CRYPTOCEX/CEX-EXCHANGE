"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar, DateRange } from "@/components/ui/calendar-custom";
import { FilterWrapper } from "./filter-wrapper";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  label: string;
  columnKey: string;
  description?: string;
  onChange: (
    key: string,
    value: { value: { from: string; to: string }; operator: string } | undefined
  ) => void;
}

export function DateFilter({
  label,
  columnKey,
  description,
  onChange,
}: DateFilterProps) {
  const [range, setRange] = React.useState<DateRange>({
    from: null,
    to: null,
  });

  // Called whenever the user picks or resets a range in the Calendar
  const handleRangeChange = (newRange: DateRange) => {
    setRange(newRange);
    if (newRange.from && newRange.to) {
      onChange(columnKey, {
        value: {
          from: newRange.from.toISOString(),
          to: newRange.to.toISOString(),
        },
        operator: "between",
      });
    }
  };

  // Reset
  const reset = () => {
    setRange({ from: null, to: null });
    onChange(columnKey, undefined);
  };

  // Label text
  const renderButtonLabel = () => {
    const { from, to } = range;
    if (!from) return "Pick a date range";
    if (from && !to) return format(from, "LLL dd, yyyy");
    if (from && to) {
      return `${format(from, "LLL dd, yyyy")} - ${format(to, "LLL dd, yyyy")}`;
    }
    return "Pick a date range";
  };

  return (
    <FilterWrapper label={label} description={description}>
      <div className="relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !range.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {renderButtonLabel()}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className={cn(
              "w-auto p-0 border bg-white dark:bg-neutral-900",
              "border-gray-200 dark:border-neutral-700"
            )}
          >
            <Calendar
              selectedRange={range}
              onRangeChange={handleRangeChange}
              numberOfMonths={2} // or 1, 3, etc.
            />
          </PopoverContent>
        </Popover>

        {/* Reset button if any date is selected */}
        {(range.from || range.to) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={reset}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FilterWrapper>
  );
}
