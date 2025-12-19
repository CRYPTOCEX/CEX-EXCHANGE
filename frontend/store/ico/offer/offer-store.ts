"use client";
import { create } from "zustand";
import { $fetch } from "@/lib/api";

export type OfferingParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  blockchains?: string[];
  tokenTypes?: string[];
  investmentRanges?: string[];
};

type offering = icoTokenOfferingAttributes & {
  phases: icoTokenOfferingPhaseAttributes[];
  tokenDetail: icoTokenDetailAttributes | null;
  teamMembers: icoTeamMemberAttributes[];
  roadmapItems: icoRoadmapItemAttributes[];
  // Optionally include computed properties
  currentPhase?: icoTokenOfferingPhaseAttributes | null;
  nextPhase?: icoTokenOfferingPhaseAttributes | null;
  currentRaised?: number;
};

// Helper function to parse tokenDetail fields if needed
function parseTokenDetail(offering: offering): offering {
  if (offering.tokenDetail) {
    // Parse useOfFunds if it's a JSON string
    if (typeof offering.tokenDetail.useOfFunds === "string") {
      try {
        offering.tokenDetail.useOfFunds = JSON.parse(
          offering.tokenDetail.useOfFunds
        );
      } catch (err) {
        console.error("Failed to parse useOfFunds:", err);
        offering.tokenDetail.useOfFunds = [];
      }
    }
    // Parse links if it's a JSON string and convert array to a record
    if (typeof offering.tokenDetail.links === "string") {
      try {
        const linksArray = JSON.parse(offering.tokenDetail.links);
        const linksRecord = Array.isArray(linksArray)
          ? linksArray.reduce(
              (
                acc: Record<string, string>,
                cur: { label: string; url: string }
              ) => {
                if (cur.label && cur.url) {
                  acc[cur.label] = cur.url;
                }
                return acc;
              },
              {}
            )
          : {};
        offering.tokenDetail.links = linksRecord;
      } catch (err) {
        console.error("Failed to parse links:", err);
        offering.tokenDetail.links = {};
      }
    }
  }
  return offering;
}

interface OfferStoreState {
  activeOfferings: offering[];
  upcomingOfferings: offering[];
  completedOfferings: offering[];

  // Pagination states
  activePagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    total: number;
  };
  upcomingPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    total: number;
  };
  completedPagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    total: number;
  };

  // Loading states
  isLoadingActive: boolean;
  activeOfferingsFetched: boolean;
  isLoadingUpcoming: boolean;
  upcomingOfferingsFetched: boolean;
  isLoadingCompleted: boolean;
  completedOfferingsFetched: boolean;

  offering: offering | null;
  isLoading: boolean;
  error: string | null;

  // Fetch initial counts for all statuses
  fetchOfferingCounts: () => Promise<void>;

  // Fetch a single offering by ID.
  fetchOffering: (id: string) => Promise<void>;
  // Reset the store state.
  reset: () => void;

  // Fetch actions
  fetchActiveOfferings: (params?: OfferingParams) => Promise<void>;
  fetchUpcomingOfferings: (params?: OfferingParams) => Promise<void>;
  fetchCompletedOfferings: (params?: OfferingParams) => Promise<void>;

  // Pagination actions
  setActivePage: (page: number) => void;
  setUpcomingPage: (page: number) => void;
  setCompletedPage: (page: number) => void;
}

const DEFAULT_LIMIT = 10;

export const useOfferStore = create<OfferStoreState>((set, get) => ({
  activeOfferings: [],
  upcomingOfferings: [],
  completedOfferings: [],

  // Default pagination
  activePagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    total: 0,
  },
  upcomingPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    total: 0,
  },
  completedPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    total: 0,
  },

  // Loading states
  isLoadingActive: false,
  activeOfferingsFetched: false,
  isLoadingUpcoming: false,
  upcomingOfferingsFetched: false,
  isLoadingCompleted: false,
  completedOfferingsFetched: false,

  offering: null,
  isLoading: false,
  error: null,

  // Fetch counts for all statuses using stats endpoint
  fetchOfferingCounts: async () => {
    try {
      const { data } = await $fetch<{
        active: number;
        upcoming: number;
        completed: number;
      }>({ url: "/api/ico/offer/stats", silent: true });

      if (data) {
        set({
          activePagination: {
            ...get().activePagination,
            total: data.active || 0,
          },
          upcomingPagination: {
            ...get().upcomingPagination,
            total: data.upcoming || 0,
          },
          completedPagination: {
            ...get().completedPagination,
            total: data.completed || 0,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch offering counts:", error);
    }
  },

  fetchOffering: async (id: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch({
      url: `/api/ico/offer/${id}`,
      silent: true,
    });

    if (data && !error) {
      // Parse tokenDetail fields if they are JSON strings
      if (data.tokenDetail) {
        // Parse useOfFunds if needed
        if (typeof data.tokenDetail.useOfFunds === "string") {
          try {
            data.tokenDetail.useOfFunds = JSON.parse(
              data.tokenDetail.useOfFunds
            );
          } catch (err) {
            console.error("Failed to parse useOfFunds:", err);
            data.tokenDetail.useOfFunds = [];
          }
        }
        // Parse links if needed and convert array to record
        if (typeof data.tokenDetail.links === "string") {
          try {
            const linksArray = JSON.parse(data.tokenDetail.links);
            const linksRecord = Array.isArray(linksArray)
              ? linksArray.reduce(
                  (
                    acc: Record<string, string>,
                    cur: { label: string; url: string }
                  ) => {
                    if (cur.label && cur.url) {
                      acc[cur.label] = cur.url;
                    }
                    return acc;
                  },
                  {}
                )
              : {};
            data.tokenDetail.links = linksRecord;
          } catch (err) {
            console.error("Failed to parse links:", err);
            data.tokenDetail.links = {};
          }
        }
      }
      set({ offering: data, isLoading: false });
    } else {
      set({
        error: error || "Failed to fetch offering",
        isLoading: false,
      });
    }
  },

  reset: () => set({ offering: null, error: null }),

  // Fetch active offerings
  fetchActiveOfferings: async (params = {}) => {
    set({ isLoadingActive: true });
    const { page = get().activePagination.currentPage, limit = DEFAULT_LIMIT } =
      params;

    // Build query string (unchanged)
    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.blockchains?.length) {
      params.blockchains.forEach((blockchain) =>
        queryParams.append("blockchain", blockchain)
      );
    }
    if (params.tokenTypes?.length) {
      params.tokenTypes.forEach((type) =>
        queryParams.append("tokenType", type)
      );
    }
    if (params.investmentRanges?.length) {
      params.investmentRanges.forEach((range) =>
        queryParams.append("investmentRange", range)
      );
    }

    const url = `/api/ico/offer?status=ACTIVE&${queryParams.toString()}`;

    try {
      const { data, error } = await $fetch<{
        items: offering[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          total: number;
        };
      }>({ url, silent: true });

      if (error) throw new Error(error);

      if (data) {
        const parsedOfferings = data.items.map(parseTokenDetail);
        set({
          activeOfferings: parsedOfferings,
          activePagination: data.pagination || {
            currentPage: page,
            totalPages: Math.ceil((parsedOfferings.length || 0) / limit),
            totalItems: parsedOfferings.length || 0,
            total: parsedOfferings.length || 0,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch active offerings:", error);
    } finally {
      set({ isLoadingActive: false, activeOfferingsFetched: true });
    }
  },

  // Fetch upcoming offerings
  fetchUpcomingOfferings: async (params = {}) => {
    set({ isLoadingUpcoming: true });
    const {
      page = get().upcomingPagination.currentPage,
      limit = DEFAULT_LIMIT,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.blockchains?.length) {
      params.blockchains.forEach((blockchain) =>
        queryParams.append("blockchain", blockchain)
      );
    }
    if (params.tokenTypes?.length) {
      params.tokenTypes.forEach((type) =>
        queryParams.append("tokenType", type)
      );
    }
    if (params.investmentRanges?.length) {
      params.investmentRanges.forEach((range) =>
        queryParams.append("investmentRange", range)
      );
    }

    const url = `/api/ico/offer?status=UPCOMING&${queryParams.toString()}`;

    try {
      const { data, error } = await $fetch<{
        items: offering[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          total: number;
        };
      }>({ url, silent: true });

      if (error) throw new Error(error);

      if (data) {
        const parsedOfferings = data.items.map(parseTokenDetail);
        set({
          upcomingOfferings: parsedOfferings,
          upcomingPagination: data.pagination || {
            currentPage: page,
            totalPages: Math.ceil((parsedOfferings.length || 0) / limit),
            totalItems: parsedOfferings.length || 0,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch upcoming offerings:", error);
    } finally {
      set({ isLoadingUpcoming: false, upcomingOfferingsFetched: true });
    }
  },

  // Fetch completed offerings
  fetchCompletedOfferings: async (params = {}) => {
    set({ isLoadingCompleted: true });
    const {
      page = get().completedPagination.currentPage,
      limit = DEFAULT_LIMIT,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("page", page.toString());
    queryParams.append("limit", limit.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.blockchains?.length) {
      params.blockchains.forEach((blockchain) =>
        queryParams.append("blockchain", blockchain)
      );
    }
    if (params.tokenTypes?.length) {
      params.tokenTypes.forEach((type) =>
        queryParams.append("tokenType", type)
      );
    }
    if (params.investmentRanges?.length) {
      params.investmentRanges.forEach((range) =>
        queryParams.append("investmentRange", range)
      );
    }

    const url = `/api/ico/offer?status=COMPLETED&${queryParams.toString()}`;

    try {
      const { data, error} = await $fetch<{
        items: offering[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          total: number;
        };
      }>({ url, silent: true });

      if (error) throw new Error(error);

      if (data) {
        const parsedOfferings = data.items.map(parseTokenDetail);
        set({
          completedOfferings: parsedOfferings,
          completedPagination: data.pagination || {
            currentPage: page,
            totalPages: Math.ceil((parsedOfferings.length || 0) / limit),
            totalItems: parsedOfferings.length || 0,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch completed offerings:", error);
    } finally {
      set({ isLoadingCompleted: false, completedOfferingsFetched: true });
    }
  },

  // Pagination actions
  setActivePage: (page: number) => {
    set((state) => ({
      activePagination: { ...state.activePagination, currentPage: page },
    }));
    get().fetchActiveOfferings({ page });
  },

  setUpcomingPage: (page: number) => {
    set((state) => ({
      upcomingPagination: { ...state.upcomingPagination, currentPage: page },
    }));
    get().fetchUpcomingOfferings({ page });
  },

  setCompletedPage: (page: number) => {
    set((state) => ({
      completedPagination: { ...state.completedPagination, currentPage: page },
    }));
    get().fetchCompletedOfferings({ page });
  },
}));
