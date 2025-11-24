"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

type Size = "sm" | "md" | "lg";

interface StableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: Size;
}

// Utility to get size classes
const sizeClassMap: Record<Size, string> = {
  sm: "h-8 text-sm",
  md: "h-10 text-base",
  lg: "h-12 text-lg",
};

// This component prevents re-renders that might cause infinite loops
export const StableSelect = React.memo(
  ({
    value,
    onValueChange,
    options,
    placeholder,
    className,
    disabled,
    size = "md",
  }: StableSelectProps) => {
    // Use a stable callback to prevent infinite loops
    const handleValueChange = React.useCallback(
      (newValue: string) => {
        if (newValue !== value) {
          onValueChange(newValue);
        }
      },
      [onValueChange, value]
    );

    const triggerClass = [className, sizeClassMap[size]]
      .filter(Boolean)
      .join(" ");

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className={triggerClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon ? (
                <div className="flex items-center">
                  {option.icon}
                  <span className="ml-2">{option.label}</span>
                </div>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

StableSelect.displayName = "StableSelect";
