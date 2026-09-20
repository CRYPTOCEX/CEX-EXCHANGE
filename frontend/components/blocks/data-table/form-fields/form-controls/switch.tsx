"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SwitchFormControlProps {
  field: any;
  error?: string;
  label: string;
  description?: string;
}

export function SwitchFormControl({
  field,
  error,
  label,
  description,
}: SwitchFormControlProps) {
  const handleChange = (checked: boolean) => {
    field.onChange(checked);
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border p-3 transition-colors",
          error ? "border-destructive" : "border-input",
          "hover:bg-accent/50"
        )}
      >
        <div className="space-y-0.5">
          <Label
            htmlFor={field.name}
            className="text-sm font-medium cursor-pointer"
          >
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Switch
          id={field.name}
          checked={!!field.value}
          onCheckedChange={handleChange}
        />
      </div>
      {error && (
        <p className="text-destructive text-xs mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
}
