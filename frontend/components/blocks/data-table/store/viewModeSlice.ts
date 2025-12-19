import { StateCreator } from "zustand";
import { TableStore } from "../types/table";

export type ViewMode = "table" | "card";

// Page size options for each view mode
const TABLE_PAGE_SIZES = [12, 24, 48, 96];
const CARD_PAGE_SIZES = [12, 24, 48, 96];

export interface ViewModeSlice {
  viewMode: ViewMode;
  autoSwitchViewMode: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setAutoSwitchViewMode: (enabled: boolean) => void;
  getPageSizeOptions: () => number[];
}

export const createViewModeSlice: StateCreator<
  TableStore,
  [],
  [],
  ViewModeSlice
> = (set, get) => ({
  viewMode: "table",
  autoSwitchViewMode: true, // Auto-switch to card on mobile by default

  setViewMode: (mode: ViewMode) => {
    const currentMode = get().viewMode;
    if (currentMode === mode) return;

    set({ viewMode: mode });

    // Adjust page size when switching view modes
    const currentPageSize = get().pageSize;
    const targetPageSizes = mode === "card" ? CARD_PAGE_SIZES : TABLE_PAGE_SIZES;

    // If current page size is not valid for the new view mode, switch to closest valid option
    if (!targetPageSizes.includes(currentPageSize)) {
      // Find the closest page size in the new mode
      const closestPageSize = targetPageSizes.reduce((prev, curr) =>
        Math.abs(curr - currentPageSize) < Math.abs(prev - currentPageSize)
          ? curr
          : prev
      );
      get().setPageSize(closestPageSize, true);
    }
  },

  toggleViewMode: () => {
    const currentMode = get().viewMode;
    get().setViewMode(currentMode === "table" ? "card" : "table");
  },

  setAutoSwitchViewMode: (enabled: boolean) => {
    set({ autoSwitchViewMode: enabled });
  },

  getPageSizeOptions: () => {
    const viewMode = get().viewMode;
    return viewMode === "card" ? CARD_PAGE_SIZES : TABLE_PAGE_SIZES;
  },
});
