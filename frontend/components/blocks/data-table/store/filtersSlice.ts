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
  /**
   * Seeds the query a table OPENS on, without fetching.
   *
   * Every other setter here fires `fetchData()`, which is right for an operator
   * turning a knob and wrong during mount: `resetCallback` in `index.tsx` ends
   * with `initializePermissions`, and THAT is what issues the first request. A
   * seeder that fetched would put two requests on the wire, the first of them
   * against the un-seeded query — so the queue would flash the wrong rows.
   *
   * Filters merge (a queue's `initialFilters` sits over its `modelConfig`);
   * sorting replaces, because a partial sort is not a thing.
   */
  applyInitialQueryState: (initial: {
    sorting?: { id: string; desc: boolean }[];
    filters?: Record<string, any>;
  }) => void;
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

  applyInitialQueryState: ({ sorting, filters }) => {
    set((state) => ({
      ...(sorting && sorting.length > 0 ? { sorting } : {}),
      ...(filters && Object.keys(filters).length > 0
        ? { filters: { ...state.filters, ...filters } }
        : {}),
    }));
  },
});
