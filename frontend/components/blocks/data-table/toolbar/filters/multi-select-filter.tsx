import React from "react";
import { FilterWrapper } from "./filter-wrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  label: string;
  columnKey: string;
  options: { value: string; label: string }[];
  description?: string;
  onChange: (key: string, value: any) => void;
}

export function MultiSelectFilter({
  label,
  columnKey,
  options,
  description,
  onChange,
}: MultiSelectFilterProps) {
  const [selectedValues, setSelectedValues] = React.useState<string[]>([]);

  const handleChange = (checked: boolean, value: string) => {
    const newSelectedValues = checked
      ? [...selectedValues, value]
      : selectedValues.filter((v) => v !== value);
    setSelectedValues(newSelectedValues);
    onChange(
      columnKey,
      newSelectedValues.length > 0
        ? { value: newSelectedValues, operator: "in" }
        : undefined
    );
  };

  return (
    <FilterWrapper label={label} description={description}>
      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className={cn("p-4", "ltr:text-left rtl:text-right")}>
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 mb-2"
            >
              <Checkbox
                id={`${columnKey}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) =>
                  handleChange(checked as boolean, option.value)
                }
                className="cursor-pointer"
              />
              <label
                htmlFor={`${columnKey}-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </FilterWrapper>
  );
}
