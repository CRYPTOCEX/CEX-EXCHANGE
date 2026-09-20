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
import { useTranslations } from "next-intl";
// `ApiEndpoint` is an ambient global from `frontend/types/table.d.ts` — not an
// export, so it is referenced without an import.
import { useFetchOptions } from "@/hooks/use-fetch-options";
import { useTableStore } from "../../store";

interface SelectFilterProps {
  label: string;
  columnKey: string;
  options: { value: string | number | boolean; label: string }[];
  /**
   * Where the choices come from when the column does not list them inline.
   *
   * A column whose values are rows in another table — a category, a currency,
   * an author — declares `apiEndpoint` instead of a static `options` array.
   * Form controls have always honoured it; filters never did, so those columns
   * filtered against `options || []` and opened an EMPTY dropdown. The admin
   * blog post list shipped that way: a Category filter with nothing in it,
   * which reads as "there are no categories".
   */
  apiEndpoint?: ApiEndpoint;
  description?: string;
  onChange: (
    key: string,
    value: { value: string; operator: string } | undefined
  ) => void;
}

/**
 * THE FILTER THAT WAS HIDING THE ROWS DID NOT DRAW ITSELF.
 *
 * This control used to hold its selection in `React.useState(undefined)` and
 * never read `filters[columnKey]` back. That is fine while an operator is the
 * only thing that can set it — and wrong the moment anything else can, which is
 * exactly what `initialFilters` does: a table seeded with a default filter
 * opened with rows already excluded, the trigger showing its "Filter by status"
 * placeholder, and no reset affordance, because as far as this component knew
 * nothing was filtered.
 *
 * The admin support queue shipped seeded to `status = PENDING`. Its operators
 * saw the empty state's "There are no items to display at this time" over a
 * table that was in fact holding every ticket they were looking for, with no
 * visible cause and nothing to clear. Reading the store makes the seeded value
 * appear in the trigger and brings its ✕ with it.
 */
export function SelectFilter({
  label,
  columnKey,
  options: staticOptions,
  apiEndpoint,
  description,
  onChange,
}: SelectFilterProps) {
  const t = useTranslations("components_blocks");
  const storeValue = useTableStore((state) => state.filters?.[columnKey]);

  // Unconditional, as hooks must be: with no endpoint the hook never fetches.
  // Same precedence as the form controls — an explicit list wins, so a column
  // can declare both and keep the inline one.
  const { options: fetchedOptions } = useFetchOptions(apiEndpoint);
  const options = staticOptions?.length ? staticOptions : fetchedOptions;

  // The store is the source of truth. A filter arrives either as a bare scalar
  // or wrapped as `{value, operator}` (what this control and `initialFilters`
  // write), and only a value that matches one of the options can be shown —
  // an `in` filter carrying an array belongs to the multi-select control.
  const value = React.useMemo(() => {
    const raw =
      storeValue && typeof storeValue === "object" && "value" in storeValue
        ? (storeValue as any).value
        : storeValue;
    if (raw === undefined || raw === null || Array.isArray(raw)) return "";
    const asString = String(raw);
    return options.some((option) => String(option.value) === asString)
      ? asString
      : "";
  }, [storeValue, options]);

  const handleChange = (newValue: string) => {
    const selectedOption = options.find(
      (option) => String(option.value) === newValue
    );
    onChange(
      columnKey,
      selectedOption ? { value: newValue, operator: "equal" } : undefined
    );
  };

  const reset = () => {
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
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`${t("filter_by")} ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
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
