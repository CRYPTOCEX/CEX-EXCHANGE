import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterWrapper } from "./filter-wrapper";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Full list of operators (MySQL version)
const mysqlOperators = [
  { value: "equal", label: "Equals" },
  { value: "notEqual", label: "Not Equal" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "substring", label: "Contains" },
  { value: "regexp", label: "Matches Regex" },
];

// For Scylla, unsupported operators on non-string columns are removed.
// In our case, if db is "scylla", we remove "notEqual", "endsWith", "substring", "regexp".
export interface TextFilterProps {
  label: string;
  columnKey: string;
  icon?: React.ElementType;
  description?: string;
  onChange: (key: string, value: any, operator: string) => void;
  columnFilters: { id: string; value: any }[];
  db?: "mysql" | "scylla";
}

export function TextFilter({
  label,
  columnKey,
  icon: Icon,
  description,
  onChange,
  columnFilters,
  db = "mysql",
}: TextFilterProps) {
  // Choose operator list based on db.
  const operators =
    db === "scylla"
      ? mysqlOperators.filter(
          (op) =>
            !["notEqual", "endsWith", "substring", "regexp"].includes(op.value)
        )
      : mysqlOperators;

  const existingFilter = columnFilters.find((f) => f.id === columnKey);
  const [value, setValue] = React.useState<string>(
    typeof existingFilter?.value === "object" && existingFilter?.value !== null
      ? String(existingFilter.value.value)
      : String(existingFilter?.value || "")
  );
  const [operator, setOperator] = React.useState<string>(
    typeof existingFilter?.value === "object" && existingFilter?.value !== null
      ? existingFilter.value.operator || "startsWith"
      : "startsWith"
  );

  const handleChange = (newValue: string, newOperator: string) => {
    setValue(newValue);
    setOperator(newOperator);
    onChange(columnKey, newValue || undefined, newOperator || "startsWith");
  };

  const reset = () => {
    setValue("");
    setOperator("startsWith");
    onChange(columnKey, undefined, "startsWith");
  };

  return (
    <FilterWrapper label={label} description={description}>
      <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
        <div className="w-full md:w-auto shrink-0">
          <Select
            value={operator}
            onValueChange={(newOp) => handleChange(value, newOp)}
          >
            <SelectTrigger className="w-full md:w-auto">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem
                  key={op.value}
                  value={op.value}
                  className="cursor-pointer"
                >
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full md:w-auto flex-1">
          {Icon && (
            <Icon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            id={columnKey}
            placeholder={`Filter by ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => handleChange(e.target.value, operator)}
            className={cn(Icon ? "pl-8" : "", "w-full")}
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-5 w-5"
              onClick={reset}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </FilterWrapper>
  );
}
