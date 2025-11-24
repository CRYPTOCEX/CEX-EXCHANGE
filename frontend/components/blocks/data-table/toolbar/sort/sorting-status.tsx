import React from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SortingStatusProps {
  selectedField: string;
  direction: "asc" | "desc";
  sortableFields: { id: string; label: string }[];
  onClear: () => void;
}

export function SortingStatus({
  selectedField,
  direction,
  sortableFields,
  onClear,
}: SortingStatusProps) {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/sort/sorting-status"
  );
  if (!selectedField) return null;

  const currentField = sortableFields.find((f) => f.id === selectedField);
  const label = currentField?.label || selectedField;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
          {t("current_sort")}
        </span>
        <span className="font-medium flex items-center gap-1 truncate">
          <span className="truncate">{label}</span>
          {direction === "asc" ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 px-2 text-muted-foreground hover:text-foreground dark:hover:bg-default-100",
          "flex items-center gap-1 shrink-0"
        )}
        onClick={onClear}
      >
        <X className="h-3 w-3" />
        {t("Clear")}
      </Button>
    </div>
  );
}
