// sorting-slice.ts

import { StateCreator } from "zustand";
import { TableStore, Sorting } from "../types/table";
import { resolveColumnSortKey } from "../utils/sorting";

export interface SortingSlice {
  sorting: Sorting[];
  availableSortingOptions: { id: string; label: string }[];
  setSorting: (sorting: Sorting[]) => void;
  setAvailableSortingOptions: (
    options: { id: string; label: string }[]
  ) => void;
  updateSorting: (field: string, direction: "asc" | "desc") => void;
  getCurrentSortLabel: () => string | null;
  handleSort: (column: ColumnDefinition) => void;
  getSortKeyForColumn: (column: ColumnDefinition) => string;
}

export const createSortingSlice: StateCreator<
  TableStore,
  [],
  [],
  SortingSlice
> = (set, get) => {
  // Helper to update sorting state and trigger a data fetch.
  const applySorting = (newSorting: Sorting[]) => {
    set({ sorting: newSorting });
    get().fetchData();
  };

  // Helper to parse comma-separated sort keys.
  const parseSortKeys = (field: string): string[] =>
    field.split(",").map((k) => k.trim());

  // Helper to build a composite key string from a sorting array.
  const getCompositeSortingKey = (sortingArr: Sorting[]): string =>
    sortingArr.map((s) => s.id).join(",");

  return {
    sorting: [],
    availableSortingOptions: [],

    setSorting: (sorting) => applySorting(sorting),

    setAvailableSortingOptions: (options) =>
      set({ availableSortingOptions: options }),

    updateSorting: (field, direction) => {
      if (!field) {
        applySorting([]);
        return;
      }
      const keys = parseSortKeys(field);
      const newSorting = keys.map((key) => ({
        id: key,
        desc: direction === "desc",
      }));
      applySorting(newSorting);
    },

    getCurrentSortLabel: () => {
      const { sorting, availableSortingOptions } = get();
      if (!sorting.length) return null;

      const compositeKey = getCompositeSortingKey(sorting);
      const foundComposite = availableSortingOptions.find(
        (o) => o.id === compositeKey
      );
      if (foundComposite) {
        return foundComposite.label;
      }

      if (sorting.length === 1) {
        const singleId = sorting[0].id;
        const foundSingle = availableSortingOptions.find(
          (o) => o.id === singleId
        );
        return foundSingle ? foundSingle.label : singleId;
      }

      return compositeKey;
    },

    handleSort: (column) => {
      if (!column.sortable) return;
      const sortKeyStr = get().getSortKeyForColumn(column);
      const keys = parseSortKeys(sortKeyStr);
      const currentSorting = get().sorting;
      const currentSortingKeyStr = getCompositeSortingKey(currentSorting);

      const newSorting =
        currentSortingKeyStr === sortKeyStr
          ? keys.map((key) => ({ id: key, desc: !currentSorting[0].desc }))
          : keys.map((key) => ({ id: key, desc: false }));

      applySorting(newSorting);
    },

    getSortKeyForColumn: (column) => resolveColumnSortKey(column),
  };
};
