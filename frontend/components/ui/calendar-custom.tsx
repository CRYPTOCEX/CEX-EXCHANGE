"use client";

import React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Represents a date range with optional "from" and "to" */
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/** Possible "views": either day grids or a year grid */
type ViewMode = "days" | "years";

interface CalendarProps {
  /** The current selected range (from/to). */
  selectedRange?: DateRange;
  /** Callback when the user changes the range. */
  onRangeChange?: (range: DateRange) => void;
  /** Number of months to display side by side (day view). Default 2. */
  numberOfMonths?: number;
  /** Initial month to show in day view. Defaults to today's month. */
  initialMonth?: Date;
  /** Additional className for the outer container. */
  className?: string;
}

/**
 * A from-scratch date-range calendar with:
 * - Day view (with multiple months side by side)
 * - Year view (12-year grid) for quick navigation
 * - Range selection logic (start->end)
 * - Dark mode styling
 */
export function Calendar({
  selectedRange,
  onRangeChange,
  numberOfMonths = 2,
  initialMonth,
  className,
}: CalendarProps) {
  // Current "view" mode: either "days" or "years"
  const [viewMode, setViewMode] = React.useState<ViewMode>("days");

  // The month displayed in the first (left) calendar (day view)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    initialMonth || new Date()
  );

  // We track a base year for the "year view" (e.g., 2025 => shows 2024-2035, etc.)
  const [yearViewBase, setYearViewBase] = React.useState<number>(
    (initialMonth || new Date()).getFullYear()
  );

  // Local copy of selected range if not controlled
  const [internalRange, setInternalRange] = React.useState<DateRange>({
    from: selectedRange?.from || null,
    to: selectedRange?.to || null,
  });

  // Sync if the parent changes selectedRange externally
  React.useEffect(() => {
    if (selectedRange) {
      setInternalRange({ from: selectedRange.from, to: selectedRange.to });
    }
  }, [selectedRange]);

  // --- Switch between "days" and "years" ---
  const toggleYearView = () => {
    if (viewMode === "days") {
      // Switch to year view, set base to the currentMonth's year
      setViewMode("years");
      setYearViewBase(currentMonth.getFullYear());
    } else {
      // Switch back to day view
      setViewMode("days");
    }
  };

  // --- Month Navigation (day view) ---
  // Moves forward/back by `numberOfMonths`
  const handlePrevDayView = () => {
    setCurrentMonth((prev) => addMonths(prev, -numberOfMonths));
  };
  const handleNextDayView = () => {
    setCurrentMonth((prev) => addMonths(prev, numberOfMonths));
  };

  // --- Year Navigation (year view) ---
  // Moves the base year grid by 12-year increments
  const handlePrevYearView = () => {
    setYearViewBase((y) => y - 12);
  };
  const handleNextYearView = () => {
    setYearViewBase((y) => y + 12);
  };

  // --- Day Click: Range Selection Logic ---
  const handleDayClick = (day: Date) => {
    const { from, to } = internalRange;

    // If no "from" date yet, set from = day
    if (!from) {
      const newRange = { from: day, to: null };
      setInternalRange(newRange);
      onRangeChange?.(newRange);
      return;
    }

    // If we already have a full range, reset to new range starting at the clicked day
    if (from && to) {
      const newRange = { from: day, to: null };
      setInternalRange(newRange);
      onRangeChange?.(newRange);
      return;
    }

    // If from is set but no to:
    // If clicked day < from, swap them
    if (isBefore(day, from)) {
      const newRange = { from: day, to: from };
      setInternalRange(newRange);
      onRangeChange?.(newRange);
      return;
    }

    // Otherwise, set to = day
    const newRange = { from, to: day };
    setInternalRange(newRange);
    onRangeChange?.(newRange);
  };

  // --- Year Click: Jump to that year (day view) ---
  const handleYearClick = (year: number) => {
    // Keep the same month/day if possible, but set year
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setCurrentMonth(newDate);

    // Return to day view
    setViewMode("days");
  };

  // Generate array of months to display (day view)
  const monthsToDisplay = React.useMemo(() => {
    const months = [];
    for (let i = 0; i < numberOfMonths; i++) {
      months.push(addMonths(currentMonth, i));
    }
    return months;
  }, [currentMonth, numberOfMonths]);

  // Helper: get 12-year range around yearViewBase
  const getYearRange = (baseYear: number) => {
    // E.g. if baseYear=2025 => decadeStart=2025-(2025%12)=2025-9=2016 => 2016..2027
    // But let's do a simpler approach: chunk of 12 years
    const chunkStart = baseYear - (baseYear % 12);
    const chunkEnd = chunkStart + 11;
    return { chunkStart, chunkEnd };
  };

  // ------------------ RENDERING ------------------

  // Renders the top label + nav buttons
  // In "days" mode => show "February 2025"
  // In "years" mode => show "2024 - 2035" or similar
  const renderHeader = () => {
    if (viewMode === "days") {
      const label = format(currentMonth, "MMMM yyyy");
      return (
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handlePrevDayView}
            className={cn(
              "p-2 rounded transition-colors outline-hidden focus:outline-hidden",
              "bg-blue-500 text-white hover:bg-blue-600",
              "dark:bg-blue-600 dark:hover:bg-blue-700"
            )}
            type="button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {/* Clicking the label toggles year view */}
          <button
            onClick={toggleYearView}
            className="text-sm font-semibold px-4 py-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-700"
          >
            {label}
          </button>
          <button
            onClick={handleNextDayView}
            className={cn(
              "p-2 rounded transition-colors outline-hidden focus:outline-hidden",
              "bg-blue-500 text-white hover:bg-blue-600",
              "dark:bg-blue-600 dark:hover:bg-blue-700"
            )}
            type="button"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      );
    } else {
      // "years" mode
      const { chunkStart, chunkEnd } = getYearRange(yearViewBase);
      const label = `${chunkStart} - ${chunkEnd}`;
      return (
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handlePrevYearView}
            className={cn(
              "p-2 rounded transition-colors outline-hidden focus:outline-hidden",
              "bg-blue-500 text-white hover:bg-blue-600",
              "dark:bg-blue-600 dark:hover:bg-blue-700"
            )}
            type="button"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold px-4 py-1">{label}</div>
          <button
            onClick={handleNextYearView}
            className={cn(
              "p-2 rounded transition-colors outline-hidden focus:outline-hidden",
              "bg-blue-500 text-white hover:bg-blue-600",
              "dark:bg-blue-600 dark:hover:bg-blue-700"
            )}
            type="button"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      );
    }
  };

  // Render the "day view" months
  const renderDayView = () => {
    return (
      <div
        className={cn(
          "grid gap-4",
          numberOfMonths > 1 ? `grid-cols-${numberOfMonths}` : "grid-cols-1"
        )}
      >
        {monthsToDisplay.map((monthDate) => renderMonth(monthDate))}
      </div>
    );
  };

  // Render a single month's grid
  const renderMonth = (baseDate: Date) => {
    const start = startOfWeek(startOfMonth(baseDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(baseDate), { weekStartsOn: 0 });
    const daysArray = eachDayOfInterval({ start, end });
    const monthLabel = format(baseDate, "MMMM yyyy");

    return (
      <div
        key={monthLabel}
        className={cn(
          "flex flex-col items-center rounded-lg p-3",
          "bg-gray-50 dark:bg-neutral-800"
        )}
        style={{ minWidth: "220px" }}
      >
        {/* We already show a big label in the header, so an optional sub-label here is hidden. */}
        {/* If you want a smaller label, you could do: 
            <div className="text-xs mb-2">{monthLabel}</div> 
        */}

        {/* Day-of-week header row */}
        <div className="grid grid-cols-7 gap-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dow) => (
            <div
              key={dow}
              className="text-center text-xs font-medium py-1 text-gray-500 dark:text-gray-400"
            >
              {dow}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 mt-1">
          {daysArray.map((day) => {
            const inMonth = format(day, "MM") === format(baseDate, "MM");
            const isSel = isSelectedDay(day, internalRange);
            const isStart = isStartDay(day, internalRange);
            const isEnd = isEndDay(day, internalRange);
            const isInRange = isDayInRange(day, internalRange);
            const today = isToday(day);

            const baseClasses = cn(
              "flex items-center justify-center w-9 h-9 rounded cursor-pointer text-sm select-none",
              "hover:bg-gray-100 dark:hover:bg-neutral-700",
              !inMonth && "opacity-40 cursor-not-allowed"
            );

            // Range styling
            const rangeClasses = (() => {
              if (isStart && isEnd) {
                // single-day range
                return "bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700";
              } else if (isStart) {
                return "rounded-l-full bg-blue-500 text-white hover:bg-blue-600";
              } else if (isEnd) {
                return "rounded-r-full bg-blue-500 text-white hover:bg-blue-600";
              } else if (isInRange) {
                return "bg-blue-100 text-blue-900 dark:bg-blue-800 dark:text-blue-100";
              } else if (isSel) {
                return "bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700";
              }
              return "";
            })();

            const todayClass = today
              ? "border border-blue-500 dark:border-blue-600 font-semibold"
              : "";

            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                onClick={() => inMonth && handleDayClick(day)}
                className={cn(baseClasses, rangeClasses, todayClass)}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render the "year view": 12 years in a 4x3 grid
  const renderYearView = () => {
    const { chunkStart, chunkEnd } = getYearRange(yearViewBase);
    const years: number[] = [];
    for (let y = chunkStart; y <= chunkEnd; y++) {
      years.push(y);
    }

    return (
      <div className="grid grid-cols-4 gap-2">
        {years.map((year) => {
          const isCurrentYear = year === currentMonth.getFullYear();
          return (
            <div
              key={year}
              onClick={() => handleYearClick(year)}
              className={cn(
                "flex items-center justify-center cursor-pointer text-sm rounded p-2",
                "hover:bg-gray-100 dark:hover:bg-neutral-700",
                isCurrentYear &&
                  "bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700"
              )}
            >
              {year}
            </div>
          );
        })}
      </div>
    );
  };

  // ------------------------------------

  return (
    <div
      className={cn(
        "w-full max-w-full",
        "bg-white dark:bg-neutral-900 dark:text-slate-100",
        className
      )}
      style={{ width: numberOfMonths > 1 ? "auto" : "300px" }}
    >
      {/* Header row (label + nav) */}
      {renderHeader()}

      {viewMode === "days" ? renderDayView() : renderYearView()}
    </div>
  );
}

// ---------- Helpers for Range Selection ----------

function isSelectedDay(day: Date, range: DateRange) {
  if (!range.from) return false;
  if (isSameDay(day, range.from)) return true;
  if (range.to && isSameDay(day, range.to)) return true;
  return false;
}

function isStartDay(day: Date, range: DateRange) {
  if (!range.from || !range.to) return false;
  return isSameDay(day, range.from);
}

function isEndDay(day: Date, range: DateRange) {
  if (!range.from || !range.to) return false;
  return isSameDay(day, range.to);
}

function isDayInRange(day: Date, range: DateRange) {
  if (!range.from || !range.to) return false;
  return isAfter(day, range.from) && isBefore(day, range.to);
}
