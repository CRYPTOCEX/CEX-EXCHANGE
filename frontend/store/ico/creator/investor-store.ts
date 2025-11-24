import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type Investor = {
  userId: string;
  offeringId: string;
  totalCost: number;
  totalTokens: number;
  lastTransactionDate: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  offering: {
    name: string;
    symbol: string;
    icon?: string;
  };
};

export type ChartPoint = {
  date: string;
  amount: number;
};

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

interface InvestorsStoreState {
  investors: Investor[];
  isLoadingInvestors: boolean;
  investorsError: string | null;
  investorsPagination: PaginationMeta;
  investorsSortOptions: SortOptions;
  investorsSearchQuery: string;
  // Cache last fetch parameters
  lastInvestorsFetchParams?: {
    page: number;
    limit: number;
    sortField: string;
    sortDirection: "asc" | "desc";
    searchQuery: string;
  };
  fetchInvestors: (
    page?: number,
    limit?: number,
    sortField?: string,
    sortDirection?: "asc" | "desc",
    searchQuery?: string
  ) => Promise<void>;
  setInvestorsSortOptions: (field: string, direction: "asc" | "desc") => void;
  setInvestorsSearchQuery: (query: string) => void;
}

const defaultPaginationMeta: PaginationMeta = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
};

const defaultSortOptions: SortOptions = {
  field: "lastTransactionDate",
  direction: "desc",
};

export const useInvestorsStore = create<InvestorsStoreState>((set, get) => ({
  investors: [],
  isLoadingInvestors: false,
  investorsError: null,
  investorsPagination: { ...defaultPaginationMeta },
  investorsSortOptions: { ...defaultSortOptions },
  investorsSearchQuery: "",
  lastInvestorsFetchParams: undefined,

  setInvestorsSortOptions: (field, direction) => {
    set({ investorsSortOptions: { field, direction } });
    const { investorsPagination, investorsSearchQuery } = get();
    get().fetchInvestors(
      1,
      investorsPagination.itemsPerPage,
      field,
      direction,
      investorsSearchQuery
    );
  },

  setInvestorsSearchQuery: (query) => {
    set({ investorsSearchQuery: query });
    const { investorsPagination, investorsSortOptions } = get();
    get().fetchInvestors(
      1,
      investorsPagination.itemsPerPage,
      investorsSortOptions.field,
      investorsSortOptions.direction,
      query
    );
  },

  fetchInvestors: async (
    page = 1,
    limit = 10,
    sortField = "lastTransactionDate",
    sortDirection: "asc" | "desc" = "desc",
    searchQuery = ""
  ) => {
    const lastParams = get().lastInvestorsFetchParams;
    // Only refetch if parameters have changed.
    if (
      lastParams &&
      lastParams.page === page &&
      lastParams.limit === limit &&
      lastParams.sortField === sortField &&
      lastParams.sortDirection === sortDirection &&
      lastParams.searchQuery === searchQuery
    ) {
      return;
    }
    try {
      set({ isLoadingInvestors: true, investorsError: null });
      const { data, error } = await $fetch({
        url: "/api/ico/creator/investor",
        params: {
          page,
          limit,
          sortField,
          sortDirection,
          search: searchQuery,
        },
        silent: true,
      });
      if (error) throw new Error(error);
      set({
        investors: data.items || [],
        investorsPagination: data.pagination || {
          ...defaultPaginationMeta,
          currentPage: page,
          itemsPerPage: limit,
        },
        isLoadingInvestors: false,
        lastInvestorsFetchParams: {
          page,
          limit,
          sortField,
          sortDirection,
          searchQuery,
        },
      });
    } catch (error) {
      set({
        isLoadingInvestors: false,
        investorsError:
          error instanceof Error ? error.message : "Failed to fetch investors",
      });
    }
  },
}));
