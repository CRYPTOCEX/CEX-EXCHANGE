"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Fully custom calendar using react-day-picker v9 and Tailwind classes.
 * - No react-day-picker/style.css imported.
 * - Uses shadcn/ui buttonVariants and custom navigation icons.
 * - Dark mode handled by your app’s theme.
 * - All classNames mapped to latest v9 names for full Tailwind control.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // Calendar container
        root: "rdp-root rounded-xl border bg-background p-3 shadow-lg flex flex-col gap-2",
        months: "flex flex-col sm:flex-row gap-8",
        month: "space-y-4",
        // Caption (month/year at the top)
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        // Navigation (chevrons)
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 p-0 bg-transparent opacity-60 hover:opacity-100 transition-opacity"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        // Table/headings
        table: "w-full border-collapse",
        head: "",
        head_row: "flex",
        head_cell: "text-muted-foreground w-9 font-medium text-xs rounded-md",
        // Weeks/days
        row: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md transition aria-selected:opacity-100"
        ),
        // State modifiers
        selected:
          "bg-primary text-primary-foreground hover:bg-primary focus:bg-primary",
        today: "border border-dashed border-primary",
        outside:
          "opacity-50 text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "opacity-40 text-muted-foreground pointer-events-none",
        hidden: "invisible",
        range_start: "rounded-l-md bg-primary text-primary-foreground",
        range_end: "rounded-r-md bg-primary text-primary-foreground",
        range_middle: "bg-accent text-accent-foreground",
        // Merge with additional user classNames
        ...classNames,
      }}
      components={{
        // Custom chevron for navigation
        Chevron: (props) =>
          props.orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
