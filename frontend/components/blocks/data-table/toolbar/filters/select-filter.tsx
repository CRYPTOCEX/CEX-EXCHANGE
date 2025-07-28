import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterWrapper } from "./filter-wrapper";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SelectFilterProps {
  label: string;
  columnKey: string;
  options: { value: string; label: string }[];
  description?: string;
  onChange: (
    key: string,
    value: { value: string; operator: string } | undefined
  ) => void;
}

export function SelectFilter({
  label,
  columnKey,
  options,
  description,
  onChange,
}: SelectFilterProps) {
  const [value, setValue] = React.useState<string | undefined>(undefined);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    const selectedOption = options.find((option) => option.value === newValue);
    onChange(
      columnKey,
      selectedOption ? { value: newValue, operator: "equal" } : undefined
    );
  };

  const reset = () => {
    setValue(undefined);
    onChange(columnKey, undefined);
  };

  return (
    <FilterWrapper label={label} description={description}>
      <div className="relative w-full md:w-auto">
        {value && (
          <div className="absolute right-8 top-0 h-full flex items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Select value={value || ""} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Filter by ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterWrapper>
  );
}
