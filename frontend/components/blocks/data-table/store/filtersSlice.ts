// actions/filtersSlice.ts
import { StateCreator } from "zustand";
import { TableStore } from "../types/table";
import { debounce } from "@/utils/debounce";
import { updateFilters } from "../utils/filters";

export interface FiltersSlice {
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  updateFilter: (key: string, value: any) => void;
  updateFilterImmediate: (key: string, value: any) => void;
  clearFilters: () => void;
}

export const createFiltersSlice: StateCreator<
  TableStore,
  [],
  [],
  FiltersSlice
> = (set, get) => ({
  filters: {},

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().fetchData();
  },

  updateFilter: debounce((key: string, value: any) => {
    set((state) => ({ filters: updateFilters(state.filters, key, value) }));
    get().fetchData();
  }, 300),

  updateFilterImmediate: (key: string, value: any) => {
    set((state) => ({ filters: updateFilters(state.filters, key, value) }));
    get().fetchData();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchData();
  },
});
