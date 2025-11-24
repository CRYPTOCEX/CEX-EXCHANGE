"use client";

import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type React from "react";
import type { ChangeEvent } from "react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inputClass = "w-full h-7 text-xs";

interface LabeledInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  tooltip?: string;
  icon?: ReactNode;
  type?: string; // Added this property
}

export const LabeledInput = ({
  id,
  label,
  value,
  onChange,
  placeholder = "",
  className = "",
  tooltip = "",
  icon = null,
  type = "text", // Added default value
}: LabeledInputProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground cursor-help">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div className="flex">
      {icon && (
        <div className="flex items-center justify-center bg-muted px-2 rounded-l-md border border-r-0 border-input">
          {icon}
        </div>
      )}
      <Input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(inputClass, icon ? "rounded-l-none" : "", className)}
        type={type} // Pass the type to the Input component
      />
    </div>
  </div>
);

interface LabeledSelectProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  triggerClassName?: string;
  tooltip?: string;
}

export const LabeledSelect = ({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  triggerClassName = "h-7 text-xs",
  tooltip = "",
}: LabeledSelectProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground cursor-help">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface SliderWithInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
  tooltip?: string;
}

export const SliderWithInput = ({
  value,
  onChange,
  min: minProp,
  max: maxProp,
  step = 1,
  unit = "px",
  label,
  tooltip,
}: SliderWithInputProps) => {
  const min = minProp ?? 0;
  const max = maxProp ?? 100;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{label}</Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-muted-foreground cursor-help">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(values) => {
            if (typeof onChange === "function") {
              onChange(values[0]);
            }
          }}
          className="flex-1"
        />
        <div className="flex items-center w-20">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              if (typeof onChange === "function") {
                onChange(Number(e.target.value));
              }
            }}
            className="h-7 w-12 text-xs"
          />
          <span className="text-xs text-muted-foreground ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};

// First, let's make sure all existing components are properly exported

// Now, let's add the LabeledSlider component
interface LabeledSliderProps {
  id?: string;
  label: string;
  value: number;
  onChange?: (value: number) => void;
  onValueChange?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  tooltip?: string;
  unit?: string; // Add the unit property
}

// Also update the LabeledSlider function to use the unit property
export function LabeledSlider({
  id,
  label,
  value,
  onChange,
  onValueChange,
  min,
  max,
  step = 1,
  tooltip,
  unit, // Add the unit parameter
}: LabeledSliderProps) {
  // Handle the callback - use onChange if provided, otherwise use onValueChange
  const handleValueChange = (newValue: number) => {
    if (typeof onChange === "function") {
      onChange(newValue);
    } else if (typeof onValueChange === "function") {
      onValueChange(newValue);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-muted-foreground cursor-help">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(values) => handleValueChange(values[0])}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8 text-right">
          {value}
          {unit ? unit : ""}
        </span>
      </div>
    </div>
  );
}

interface LabeledSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  tooltip?: string;
}

export function LabeledSwitch({
  id,
  label,
  checked,
  onCheckedChange,
  tooltip,
}: LabeledSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground cursor-help">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface LabeledTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  tooltip?: string;
}

export const LabeledTextarea = ({
  id,
  label,
  value,
  onChange,
  placeholder = "",
  className = "",
  rows = 3,
  tooltip = "",
}: LabeledTextareaProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground cursor-help">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <Textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(inputClass, className)}
      rows={rows}
    />
  </div>
);
