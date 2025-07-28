import { StateCreator } from "zustand";
import { TableStore } from "../types/table";

export interface ColumnVisibilitySlice {
  visibleColumns: string[];

  setVisibleColumns: (columns: string[]) => void;
  toggleColumnVisibility: (columnKey: string) => void;
  getVisibleColumns: () => ColumnDefinition[];
  getHiddenColumns: () => string[];
}

export const createColumnVisibilitySlice: StateCreator<
  TableStore,
  [],
  [],
  ColumnVisibilitySlice
> = (set, get) => {
  // Helper functions for screen detection
  const isDesktop = () =>
    typeof window !== "undefined" && window.innerWidth >= 1024;
  const isTablet = () =>
    typeof window !== "undefined" && window.innerWidth >= 768;

  // Helper to filter columns based on visibility, expandedOnly flag, and priority rules
  const filterVisibleColumns = (
    columns: ColumnDefinition[],
    visibleKeys: string[]
  ): ColumnDefinition[] => {
    // 1) Exclude columns flagged as expandedOnly and include only those in the visible list.
    let filtered = columns.filter(
      (col) => !col.expandedOnly && visibleKeys.includes(col.key)
    );

    // 2) For non-desktop screens, filter based on column priority.
    if (!isDesktop()) {
      filtered = filtered.filter((col) => {
        const priority = col.priority ?? 5;
        return isTablet() ? priority <= 3 : priority <= 2;
      });
    }

    return filtered;
  };

  return {
    visibleColumns: [],

    setVisibleColumns: (columns: string[]) => {
      set({ visibleColumns: columns });
    },

    toggleColumnVisibility: (columnKey: string) =>
      set((state) => ({
        visibleColumns: state.visibleColumns.includes(columnKey)
          ? state.visibleColumns.filter((k) => k !== columnKey)
          : [...state.visibleColumns, columnKey],
      })),

    getVisibleColumns: () => {
      const { columns, visibleColumns } = get();
      return filterVisibleColumns(columns, visibleColumns);
    },

    getHiddenColumns: () => {
      const storeState = get();
      const visibleCols = storeState.getVisibleColumns(); // ColumnDefinition[]
      return storeState.columns
        .filter((col: ColumnDefinition) => {
          // A column is "hidden" if:
          // 1) It's not in the filtered visible columns, and
          // 2) It's not a special column like "select" or "actions".
          const isVisible = visibleCols.some(
            (vCol: ColumnDefinition) => vCol.key === col.key
          );
          return !isVisible && !["select", "actions"].includes(col.key);
        })
        .map((col: ColumnDefinition) => col.key);
    },
  };
};
