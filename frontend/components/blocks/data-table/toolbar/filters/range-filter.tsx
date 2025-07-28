// RangeFilter.tsx
import React from "react";
import { FilterWrapper } from "./filter-wrapper";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Full list for MySQL
const mysqlNumberOperators = [
  { value: "equal", label: "=" },
  { value: "notEqual", label: "≠" },
  { value: "greaterThan", label: ">" },
  { value: "greaterThanOrEqual", label: "≥" },
  { value: "lessThan", label: "<" },
  { value: "lessThanOrEqual", label: "≤" },
  { value: "between", label: "⟷" },
];

// For Scylla, only basic numeric comparisons are supported.
const scyllaNumberOperators = [
  { value: "equal", label: "=" },
  { value: "greaterThan", label: ">" },
  { value: "greaterThanOrEqual", label: "≥" },
  { value: "lessThan", label: "<" },
  { value: "lessThanOrEqual", label: "≤" },
];

interface RangeFilterProps {
  label: string;
  columnKey: string;
  description?: string;
  onChange: (
    key: string,
    value: number | [number, number] | undefined,
    operator: string
  ) => void;
  min: number;
  max: number;
  db?: "mysql" | "scylla";
}

export function RangeFilter({
  label,
  columnKey,
  description,
  onChange,
  min,
  max,
  db = "mysql",
}: RangeFilterProps) {
  const [range, setRange] = React.useState<[number, number]>([min, max]);
  const [operator, setOperator] = React.useState<string>("greaterThanOrEqual");
  const [singleValue, setSingleValue] = React.useState<number>(min);

  // Choose operator list based on db.
  const operators =
    db === "scylla" ? scyllaNumberOperators : mysqlNumberOperators;

  const handleOperatorChange = (newOperator: string) => {
    setOperator(newOperator);
    if (newOperator === "between") {
      onChange(columnKey, range, newOperator);
    } else {
      onChange(columnKey, singleValue, newOperator);
    }
  };

  const handleRangeChange = (newRange: [number, number]) => {
    setRange(newRange);
    onChange(columnKey, newRange, operator);
  };

  const handleSingleValueChange = (newValue: number) => {
    setSingleValue(newValue);
    onChange(columnKey, newValue, operator);
  };

  const reset = () => {
    setRange([min, max]);
    setSingleValue(min);
    setOperator("greaterThanOrEqual");
    onChange(columnKey, undefined, "greaterThanOrEqual");
  };

  const showResetButton =
    (operator === "between" && (range[0] !== min || range[1] !== max)) ||
    (operator !== "between" && singleValue !== min);

  return (
    <FilterWrapper label={label} description={description}>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <div>
          <Select value={operator} onValueChange={handleOperatorChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {operator === "between" ? (
          <>
            <Input
              type="number"
              value={range[0]}
              placeholder="From"
              onChange={(e) =>
                handleRangeChange([Number(e.target.value), range[1]])
              }
              min={min}
              max={max}
              className="flex-1"
            />
            <Input
              type="number"
              value={range[1]}
              placeholder="To"
              onChange={(e) =>
                handleRangeChange([range[0], Number(e.target.value)])
              }
              min={min}
              max={max}
              className="flex-1"
            />
          </>
        ) : (
          <Input
            type="number"
            value={singleValue}
            placeholder="Value"
            onChange={(e) => handleSingleValueChange(Number(e.target.value))}
            min={min}
            max={max}
            className="flex-1"
          />
        )}
        {showResetButton && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset filter"
            className="h-5 w-5 ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FilterWrapper>
  );
}
