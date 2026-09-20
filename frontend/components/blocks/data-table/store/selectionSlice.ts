import { StateCreator } from "zustand";
import { TableStore } from "../types/table";

export interface SelectionSlice {
  selectedRows: string[];
  setSelectedRows: (selectedRows: string[]) => void;
  toggleRowSelection: (rowId: string) => void;
  selectAllRows: () => void;
  deselectAllRows: () => void;
  isAllSelected: () => boolean;
}

export const createSelectionSlice: StateCreator<
  TableStore,
  [],
  [],
  SelectionSlice
> = (set, get, store) => ({
  selectedRows: [],

  setSelectedRows: (selectedRows) => set({ selectedRows }),

  toggleRowSelection: (rowId) => {
    set((state) => {
      const isSelected = state.selectedRows.includes(rowId);
      let newSelected;
      if (isSelected) {
        newSelected = state.selectedRows.filter((id) => id !== rowId);
      } else {
        newSelected = [...state.selectedRows, rowId];
      }
      return { selectedRows: newSelected };
    });
  },

  selectAllRows: () => {
    const storeState = get();
    // if storeState.data has an 'id'
    set({ selectedRows: storeState.data?.map((row) => row.id) ?? [] });
  },

  deselectAllRows: () => set({ selectedRows: [] }),

  isAllSelected: () => {
    const storeState = get();
    return (
      storeState.data?.length > 0 &&
      storeState.selectedRows.length === storeState.data.length
    );
  },
});
