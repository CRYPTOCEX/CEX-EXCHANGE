import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

interface TokenReleaseStoreState {
  pendingTransactions: any[];
  pendingVerificationTransactions: any[];
  releasedTransactions: any[];
  rejectedTransactions: any[];
  isLoadingTransactions: boolean;
  lastTokenId: string;
  paginationMeta: {
    pending: PaginationMeta;
    verification: PaginationMeta;
    released: PaginationMeta;
    rejected: PaginationMeta;
  };
  sortOptions: {
    pending: SortOptions;
    verification: SortOptions;
    released: SortOptions;
    rejected: SortOptions;
  };
  fetchTransactions: (
    tokenId: string,
    status?: string,
    page?: number,
    limit?: number,
    sortField?: string,
    sortDirection?: "asc" | "desc"
  ) => Promise<void>;
  submitReleaseUrl: (
    tokenId: string,
    transactionId: string,
    releaseUrl: string
  ) => Promise<void>;
  getTransactionById: (transactionId: string) => any | null;
  setSortOptions: (
    status: string,
    field: string,
    direction: "asc" | "desc"
  ) => void;
}

const defaultPaginationMeta: PaginationMeta = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
};

const defaultSortOptions: SortOptions = {
  field: "createdAt",
  direction: "desc",
};

export const useTokenReleaseStore = create<TokenReleaseStoreState>(
  (set, get) => ({
    pendingTransactions: [],
    pendingVerificationTransactions: [],
    releasedTransactions: [],
    rejectedTransactions: [],
    isLoadingTransactions: false,
    lastTokenId: "",
    paginationMeta: {
      pending: { ...defaultPaginationMeta },
      verification: { ...defaultPaginationMeta },
      released: { ...defaultPaginationMeta },
      rejected: { ...defaultPaginationMeta },
    },
    sortOptions: {
      pending: { ...defaultSortOptions },
      verification: { ...defaultSortOptions },
      released: { ...defaultSortOptions },
      rejected: { ...defaultSortOptions },
    },

    setSortOptions: (status, field, direction) => {
      set((state) => {
        const newSortOptions = { ...state.sortOptions };

        switch (status) {
          case "PENDING":
            newSortOptions.pending = { field, direction };
            break;
          case "VERIFICATION":
            newSortOptions.verification = { field, direction };
            break;
          case "RELEASED":
            newSortOptions.released = { field, direction };
            break;
          case "REJECTED":
            newSortOptions.rejected = { field, direction };
            break;
        }

        return { sortOptions: newSortOptions };
      });

      const { paginationMeta, lastTokenId } = get();
      const meta =
        status === "PENDING"
          ? paginationMeta.pending
          : status === "VERIFICATION"
            ? paginationMeta.verification
            : status === "RELEASED"
              ? paginationMeta.released
              : status === "REJECTED"
                ? paginationMeta.rejected
                : paginationMeta.pending;

      get().fetchTransactions(
        lastTokenId,
        status,
        1,
        meta.itemsPerPage,
        field,
        direction
      );
    },

    fetchTransactions: async (
      tokenId: string,
      status = "PENDING",
      page = 1,
      limit = 10,
      sortField?: string,
      sortDirection?: "asc" | "desc"
    ) => {
      set({ isLoadingTransactions: true, lastTokenId: tokenId });

      const { sortOptions } = get();
      const currentSortOptions =
        status === "PENDING"
          ? sortOptions.pending
          : status === "VERIFICATION"
            ? sortOptions.verification
            : status === "RELEASED"
              ? sortOptions.released
              : status === "REJECTED"
                ? sortOptions.rejected
                : sortOptions.pending;

      const sort = {
        field: sortField || currentSortOptions.field,
        direction: sortDirection || currentSortOptions.direction,
      };

      try {
        const { data, error } = await $fetch({
          url: `/api/ico/creator/token/${tokenId}/release`,
          params: {
            status,
            page,
            limit,
            sortField: sort.field,
            sortDirection: sort.direction,
          },
          silent: true,
        });

        if (error) throw new Error(error);

        if (status === "PENDING") {
          set((state) => ({
            pendingTransactions: data.items,
            paginationMeta: {
              ...state.paginationMeta,
              pending: data.pagination,
            },
            isLoadingTransactions: false,
          }));
        } else if (status === "VERIFICATION") {
          set((state) => ({
            pendingVerificationTransactions: data.items,
            paginationMeta: {
              ...state.paginationMeta,
              verification: data.pagination,
            },
            isLoadingTransactions: false,
          }));
        } else if (status === "RELEASED") {
          set((state) => ({
            releasedTransactions: data.items,
            paginationMeta: {
              ...state.paginationMeta,
              released: data.pagination,
            },
            isLoadingTransactions: false,
          }));
        } else if (status === "REJECTED") {
          set((state) => ({
            rejectedTransactions: data.items,
            paginationMeta: {
              ...state.paginationMeta,
              rejected: data.pagination,
            },
            isLoadingTransactions: false,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch transactions", err);
        set({ isLoadingTransactions: false });
      }
    },

    submitReleaseUrl: async (
      tokenId: string,
      transactionId: string,
      releaseUrl: string
    ) => {
      const { data, error } = await $fetch({
        url: `/api/ico/creator/token/${tokenId}/release/${transactionId}`,
        method: "PUT",
        body: { releaseUrl },
      });

      if (error) {
        throw new Error(error);
      }

      // Refresh all transaction lists after submission
      const { paginationMeta, sortOptions } = get();

      await get().fetchTransactions(
        tokenId,
        "PENDING",
        paginationMeta.pending.currentPage,
        paginationMeta.pending.itemsPerPage,
        sortOptions.pending.field,
        sortOptions.pending.direction
      );

      await get().fetchTransactions(
        tokenId,
        "VERIFICATION",
        paginationMeta.verification.currentPage,
        paginationMeta.verification.itemsPerPage,
        sortOptions.verification.field,
        sortOptions.verification.direction
      );
    },

    getTransactionById: (transactionId: string) => {
      const {
        pendingTransactions,
        pendingVerificationTransactions,
        releasedTransactions,
        rejectedTransactions,
      } = get();
      return (
        pendingTransactions.find((tx) => tx.id === transactionId) ||
        pendingVerificationTransactions.find((tx) => tx.id === transactionId) ||
        releasedTransactions.find((tx) => tx.id === transactionId) ||
        rejectedTransactions.find((tx) => tx.id === transactionId) ||
        null
      );
    },
  })
);
