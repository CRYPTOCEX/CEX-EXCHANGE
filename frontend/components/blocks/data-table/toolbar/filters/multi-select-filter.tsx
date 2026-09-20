import React from "react";
import { FilterWrapper } from "./filter-wrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../../store";
import { useFetchOptions } from "@/hooks/use-fetch-options";
import { useTranslations } from "next-intl";

interface MultiSelectFilterProps {
  label: string;
  columnKey: string;
  options: { value: string | number | boolean; label: string }[];
  /** Remote choices when the column lists none inline — see `select-filter.tsx`. */
  apiEndpoint?: ApiEndpoint;
  description?: string;
  onChange: (key: string, value: any) => void;
}

/**
 * Reads its selection from the store for the same reason the single select now
 * does: a filter seeded by `initialFilters` has to be visible, or an empty
 * table has no explanation. The `operator: "in"` this emits was also dead until
 * `in` was added to the backend's operator map — see backend/src/utils/query.ts.
 */
export function MultiSelectFilter({
  label,
  columnKey,
  options: staticOptions,
  apiEndpoint,
  description,
  onChange,
}: MultiSelectFilterProps) {
  const t = useTranslations("common");
  const storeValue = useTableStore((state) => state.filters?.[columnKey]);

  const { options: fetchedOptions } = useFetchOptions(apiEndpoint);
  const options = staticOptions?.length ? staticOptions : fetchedOptions;

  const selectedValues = React.useMemo<string[]>(() => {
    const raw =
      storeValue && typeof storeValue === "object" && "value" in storeValue
        ? (storeValue as any).value
        : storeValue;
    if (raw === undefined || raw === null || raw === "") return [];
    return (Array.isArray(raw) ? raw : [raw]).map(String);
  }, [storeValue]);

  const emit = (values: string[]) =>
    onChange(
      columnKey,
      values.length > 0 ? { value: values, operator: "in" } : undefined
    );

  const handleChange = (checked: boolean, value: string | number | boolean) => {
    const strValue = String(value);
    emit(
      checked
        ? [...selectedValues, strValue]
        : selectedValues.filter((v) => v !== strValue)
    );
  };

  return (
    <FilterWrapper label={label} description={description}>
      <div className="relative w-full">
        {selectedValues.length > 0 && (
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs text-muted-foreground">
              {selectedValues.length} {t("selected")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => emit([])}
            >
              <X className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
              {t("clear")}
            </Button>
          </div>
        )}
        <ScrollArea className="h-[200px] w-full rounded-md border">
          <div className={cn("p-4", "ltr:text-left rtl:text-right")}>
            {options.map((option) => (
              <div
                key={String(option.value)}
                className="flex items-center space-x-2 mb-2"
              >
                <Checkbox
                  id={`${columnKey}-${String(option.value)}`}
                  checked={selectedValues.includes(String(option.value))}
                  onCheckedChange={(checked) =>
                    handleChange(checked as boolean, option.value)
                  }
                  className="cursor-pointer"
                />
                <label
                  htmlFor={`${columnKey}-${String(option.value)}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </FilterWrapper>
  );
}
