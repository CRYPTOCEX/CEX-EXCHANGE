import React from "react";
import { Label } from "@/components/ui/label";

interface FilterWrapperProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function FilterWrapper({
  label,
  description,
  children,
}: FilterWrapperProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
