import { StateCreator } from "zustand";
import { TableStore } from "../types/table";

export interface PaginationSlice {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  setPage: (page: number) => void;
  setPageSize: (pageSize: number, shouldFetch?: boolean) => void;
  setTotalItems: (totalItems: number) => void;
  setTotalPages: (totalPages: number) => void;
  gotoPage: (page: number) => void;
}

export const createPaginationSlice: StateCreator<
  TableStore,
  [],
  [],
  PaginationSlice
> = (set, get, store) => ({
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,

  setPage: (page) => {
    set({ page });
    get().fetchData();
  },

  setPageSize: (pageSize, shouldFetch = true) => {
    set({ pageSize, page: 1 });
    if (shouldFetch) {
      get().fetchData();
    }
  },

  setTotalItems: (totalItems) => set({ totalItems }),
  setTotalPages: (totalPages) => set({ totalPages }),

  gotoPage: (page) => {
    const storeState = get();
    const newPage = Math.max(1, Math.min(page, storeState.totalPages));
    set({ page: newPage });
    get().fetchData();
  },
});
