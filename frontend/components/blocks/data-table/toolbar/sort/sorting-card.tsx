"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { useTableStore } from "../../store";
import { SortingField } from "./sorting-field";
import { SortingDirection } from "./sorting-direction";
import { SortingStatus } from "./sorting-status";

export function SortingCard() {
  const sorting = useTableStore((state) => state.sorting);
  const availableSortingOptions = useTableStore(
    (state) => state.availableSortingOptions
  );
  const updateSorting = useTableStore((state) => state.updateSorting);

  // Local UI state
  const [selectedField, setSelectedField] = React.useState<string>("");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");

  // Keep local state in sync with the global store
  React.useEffect(() => {
    if (!sorting.length) {
      setSelectedField("");
      setDirection("asc");
      return;
    }
    // If we have multiple items, join them with commas
    const compositeKey = sorting.map((s) => s.id).join(",");
    setSelectedField(compositeKey);

    // For direction, we can just use the first item
    setDirection(sorting[0].desc ? "desc" : "asc");
  }, [sorting]);

  const handleFieldChange = React.useCallback(
    (value: string) => {
      setSelectedField(value);
      if (value) {
        updateSorting(value, direction);
      } else {
        // if user clears the field, reset sorting
        updateSorting("", "asc");
      }
    },
    [direction, updateSorting]
  );

  const handleDirectionChange = React.useCallback(
    (newDirection: "asc" | "desc") => {
      setDirection(newDirection);
      if (selectedField) {
        updateSorting(selectedField, newDirection);
      }
    },
    [selectedField, updateSorting]
  );

  const handleClearSort = React.useCallback(() => {
    setSelectedField("");
    setDirection("asc");
    updateSorting("", "asc");
  }, [updateSorting]);

  return (
    <div className="p-4">
      <div className="space-y-5">
        <SortingField
          selectedField={selectedField}
          sortableFields={availableSortingOptions}
          onFieldChange={handleFieldChange}
        />

        {selectedField && (
          <>
            <SortingDirection
              direction={direction}
              onDirectionChange={handleDirectionChange}
            />

            <Separator />

            <SortingStatus
              selectedField={selectedField}
              direction={direction}
              sortableFields={availableSortingOptions}
              onClear={handleClearSort}
            />
          </>
        )}
      </div>
    </div>
  );
}
