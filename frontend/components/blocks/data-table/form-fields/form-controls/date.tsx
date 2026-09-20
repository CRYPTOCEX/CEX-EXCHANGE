"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  title?: string;
  description?: string;
}

export function DateFormControl({
  field,
  error,
  placeholder,
  dateTime = true,
  title,
  description,
}: DateFormControlProps) {
  const t = useTranslations("common");
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
  const handleHourSelect = (value: string) => {
    const newDisplayHour = parseInt(value, 10);
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
  const handleMinuteSelect = (value: string) => {
    const newMinutes = parseInt(value, 10);
    setMinutesState(newMinutes);
    if (selectedDate) {
      const updated = setMinutes(selectedDate, newMinutes);
      setSelectedDate(updated);
      field.onChange(updated.toISOString());
    }
  };

  // Update AM/PM
  const handleAmpmSelect = (value: string) => {
    const newAmpm = value as "AM" | "PM";
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
    <div className="flex flex-col w-full">
      {title && (
        <label className="mb-1 text-sm font-medium">{title}</label>
      )}
      <div className="relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left h-9",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formattedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto p-4 border bg-popover text-popover-foreground rounded-md z-[var(--z-popover-elevated)]"
          >
            {/* 1) Single-date selection calendar */}
            <Calendar
              selectedRange={selectedRange}
              onRangeChange={handleRangeChange}
              numberOfMonths={1}
            />

            {/* 2) Hour/Minute/AM-PM pickers.
                These sit inside a PopoverContent that raises itself to z-[var(--z-popover-elevated)],
                so each dropdown has to clear that too — SelectContent's own
                z-50 would put the list BEHIND the popover it opened from.
                Radix values are strings, hence the String()/parseInt pairs. */}
            {dateTime && selectedDate && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {/* Hour Select */}
                <Select
                  value={String(displayHour)}
                  onValueChange={handleHourSelect}
                >
                  <SelectTrigger className="h-8 px-2 rounded bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[var(--z-select-elevated)]">
                    {hoursArray.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="font-semibold">:</span>

                {/* Minute Select */}
                <Select
                  value={String(minutes)}
                  onValueChange={handleMinuteSelect}
                >
                  <SelectTrigger className="h-8 px-2 rounded bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[var(--z-select-elevated)]">
                    {minutesArray.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* AM/PM Select */}
                <Select value={ampm} onValueChange={handleAmpmSelect}>
                  <SelectTrigger className="h-8 px-2 rounded bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[var(--z-select-elevated)]">
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={resetDate}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}

      {error && (
        <p className="text-destructive text-xs mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
