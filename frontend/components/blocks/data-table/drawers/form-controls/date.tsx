"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { Calendar, DateRange } from "@/components/ui/calendar-custom";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DateFormControlProps {
  /** React Hook Form or other field object containing .value and .onChange */
  field: any;
  error?: string;
  placeholder: string;
  /** If true, show hour/minute/AM-PM pickers */
  dateTime?: boolean;
}

export function DateFormControl({
  field,
  error,
  placeholder,
  dateTime = true,
}: DateFormControlProps) {
  const t = useTranslations(
    "components/blocks/data-table/drawers/form-controls/date"
  );
  // Initialize local state from field.value (ISO string)
  const initialDate = field.value ? new Date(field.value) : null;
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    initialDate
  );

  // Store hours in 24-hour format
  const [hours, setHoursState] = React.useState<number>(
    initialDate ? initialDate.getHours() : 0
  );
  const [minutes, setMinutesState] = React.useState<number>(
    initialDate ? initialDate.getMinutes() : 0
  );
  const [ampm, setAmpm] = React.useState<"AM" | "PM">(
    initialDate && initialDate.getHours() >= 12 ? "PM" : "AM"
  );

  // Sync local state whenever field.value changes
  React.useEffect(() => {
    if (field.value) {
      const d = new Date(field.value);
      setSelectedDate(d);
      setHoursState(d.getHours());
      setMinutesState(d.getMinutes());
      setAmpm(d.getHours() >= 12 ? "PM" : "AM");
    } else {
      setSelectedDate(null);
    }
  }, [field.value]);

  // 12-hour display hour (1..12)
  const displayHour = React.useMemo(() => {
    const h = hours % 12;
    return h === 0 ? 12 : h;
  }, [hours]);

  // Range for single-date selection in the Calendar
  const selectedRange: DateRange = { from: selectedDate, to: selectedDate };

  // Called when user picks a date from the Calendar
  const handleRangeChange = (range: DateRange) => {
    if (range.from) {
      const finalHour =
        ampm === "AM"
          ? displayHour === 12
            ? 0
            : displayHour
          : displayHour === 12
            ? 12
            : displayHour + 12;
      const updated = setHours(setMinutes(range.from, minutes), finalHour);
      setSelectedDate(updated);
      field.onChange(updated.toISOString());
    } else {
      setSelectedDate(null);
      field.onChange("");
    }
  };

  // Hours array in ascending order (1..12)
  const hoursArray = Array.from({ length: 12 }, (_, i) => i + 1);
  // Minutes array (0..59)
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);

  // Update the hour
  const handleHourSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDisplayHour = parseInt(e.target.value, 10);
    const finalHour =
      ampm === "AM"
        ? newDisplayHour === 12
          ? 0
          : newDisplayHour
        : newDisplayHour === 12
          ? 12
          : newDisplayHour + 12;
    setHoursState(finalHour);
    if (selectedDate) {
      const updated = setHours(selectedDate, finalHour);
      setSelectedDate(updated);
      field.onChange(updated.toISOString());
    }
  };

  // Update the minutes
  const handleMinuteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinutes = parseInt(e.target.value, 10);
    setMinutesState(newMinutes);
    if (selectedDate) {
      const updated = setMinutes(selectedDate, newMinutes);
      setSelectedDate(updated);
      field.onChange(updated.toISOString());
    }
  };

  // Update AM/PM
  const handleAmpmSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAmpm = e.target.value as "AM" | "PM";
    setAmpm(newAmpm);
    const finalHour =
      newAmpm === "AM"
        ? displayHour === 12
          ? 0
          : displayHour
        : displayHour === 12
          ? 12
          : displayHour + 12;
    setHoursState(finalHour);
    if (selectedDate) {
      const updated = setHours(selectedDate, finalHour);
      setSelectedDate(updated);
      field.onChange(updated.toISOString());
    }
  };

  // Clear the selection
  const resetDate = () => {
    setSelectedDate(null);
    field.onChange("");
  };

  // For display in the button
  const formattedDate = selectedDate
    ? dateTime
      ? format(selectedDate, "LLL dd, yyyy hh:mm a")
      : format(selectedDate, "LLL dd, yyyy")
    : placeholder;

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formattedDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-4 border bg-popover text-popover-foreground rounded-md z-[75]"
        >
          {/* 1) Single-date selection calendar */}
          <Calendar
            selectedRange={selectedRange}
            onRangeChange={handleRangeChange}
            numberOfMonths={1}
          />

          {/* 2) Hour/Minute/AM-PM pickers (plain HTML selects) */}
          {dateTime && selectedDate && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {/* Hour Select */}
              <select
                className="h-8 px-2 rounded bg-input"
                value={displayHour}
                onChange={handleHourSelect}
              >
                {hoursArray.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>

              <span className="font-semibold">:</span>

              {/* Minute Select */}
              <select
                className="h-8 px-2 rounded bg-input"
                value={minutes}
                onChange={handleMinuteSelect}
              >
                {minutesArray.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>

              {/* AM/PM Select */}
              <select
                className="h-8 px-2 rounded bg-input"
                value={ampm}
                onChange={handleAmpmSelect}
              >
                <option value="AM">{t("AM")}</option>
                <option value="PM">{t("PM")}</option>
              </select>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedDate && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={resetDate}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
