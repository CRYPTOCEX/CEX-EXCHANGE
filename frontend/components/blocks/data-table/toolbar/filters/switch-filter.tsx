"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { FilterWrapper } from "./filter-wrapper";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwitchFilterProps {
  label: string;
  columnKey: string;
  description?: string;
  onChange: (
    key: string,
    value: { value: boolean; operator: string } | undefined
  ) => void;
  value?: boolean;
}

export function SwitchFilter({
  label,
  columnKey,
  description,
  onChange,
  value,
}: SwitchFilterProps) {
  const [isActive, setIsActive] = React.useState(value !== undefined);
  const [switchValue, setSwitchValue] = React.useState(value || false);

  React.useEffect(() => {
    if (value !== undefined) {
      setIsActive(true);
      setSwitchValue(value);
    }
  }, [value]);

  const handleChange = () => {
    const newValue = !switchValue;
    setSwitchValue(newValue);
    setIsActive(true);
    onChange(columnKey, { value: newValue, operator: "equal" });
  };

  const reset = () => {
    setSwitchValue(false);
    setIsActive(false);
    onChange(columnKey, undefined);
  };

  const getStatusText = () => {
    if (!isActive) return "Show all";
    return switchValue
      ? `Show ${label.toLowerCase()} only`
      : `Show not ${label.toLowerCase()} only`;
  };

  return (
    <FilterWrapper label={label} description={description}>
      <div className={cn("flex items-center justify-between pt-2")}>
        <div
          className={cn(
            "flex items-center space-x-2",
            !isActive && "opacity-50"
          )}
        >
          <Switch
            checked={switchValue}
            onCheckedChange={handleChange}
            className={cn(!isActive && "opacity-50")}
          />
          <span className="text-sm text-muted-foreground">
            {getStatusText()}
          </span>
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={reset}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FilterWrapper>
  );
}
