import { create } from "zustand";
import { useOfferStore, type OfferingParams } from "./offer-store";

export type SortOption =
  | "newest"
  | "oldest"
  | "raised-high"
  | "raised-low"
  | "target-high"
  | "target-low"
  | "ending-soon";

export type FilterState = {
  search: string;
  sort: SortOption;
  blockchains: string[];
  tokenTypes: string[];
  activeTab: string;
};

type FilterStore = {
  filters: FilterState;
  setSearch: (search: string) => void;
  setSort: (sort: SortOption) => void;
  toggleBlockchain: (blockchain: string) => void;
  toggleTokenType: (tokenType: string) => void;
  setActiveTab: (tab: string) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  getQueryParams: () => OfferingParams;
};

// Assume these defaults are declared in your filter store file
const defaultFilters: FilterState = {
  search: "",
  sort: "newest",
  blockchains: [],
  tokenTypes: [],
  activeTab: "active",
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: { ...defaultFilters },

  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),

  setSort: (sort) => set((state) => ({ filters: { ...state.filters, sort } })),

  toggleBlockchain: (blockchain) =>
    set((state) => {
      const blockchains = state.filters.blockchains.includes(blockchain)
        ? state.filters.blockchains.filter((b) => b !== blockchain)
        : [...state.filters.blockchains, blockchain];
      return { filters: { ...state.filters, blockchains } };
    }),

  toggleTokenType: (tokenType) =>
    set((state) => {
      const tokenTypes = state.filters.tokenTypes.includes(tokenType)
        ? state.filters.tokenTypes.filter((t) => t !== tokenType)
        : [...state.filters.tokenTypes, tokenType];
      return { filters: { ...state.filters, tokenTypes } };
    }),

  setActiveTab: (tab) =>
    set((state) => ({ filters: { ...state.filters, activeTab: tab } })),

  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
    // Optionally trigger a new fetch...
  },

  // Updated getQueryParams function:
  getQueryParams: (): OfferingParams => {
    const { search, sort, blockchains, tokenTypes } = get().filters;
    const query: OfferingParams = {};

    if (search && search !== defaultFilters.search) {
      query.search = search;
    }
    if (sort && sort !== defaultFilters.sort) {
      query.sort = sort;
    }
    // Only add blockchains if they have been changed from the default
    if (
      JSON.stringify(blockchains) !== JSON.stringify(defaultFilters.blockchains)
    ) {
      query.blockchains = blockchains;
    }
    // Only add tokenTypes if they have been changed from the default
    if (
      JSON.stringify(tokenTypes) !== JSON.stringify(defaultFilters.tokenTypes)
    ) {
      query.tokenTypes = tokenTypes;
    }
    return query;
  },

  applyFilters: () => {
    const tokenStore = useOfferStore.getState();
    const { activeTab } = get().filters;
    const params = get().getQueryParams();

    // Reset to page 1 when applying new filters
    params.page = 1;

    if (activeTab === "active") {
      tokenStore.fetchActiveOfferings(params);
    } else if (activeTab === "upcoming") {
      tokenStore.fetchUpcomingOfferings(params);
    } else if (activeTab === "completed") {
      tokenStore.fetchCompletedOfferings(params);
    }
  },
}));
