"use client";
import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface AdminTransaction {
  id: string;
  amount: number;
  price: number;
  status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED";
  releaseUrl: string;
  walletAddress: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  offering: {
    id: string;
    name: string;
    symbol: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  relatedTransactions?: Array<{
    id: string;
    amount: number;
    price: number;
    status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED";
    releaseUrl: string;
    createdAt: string;
  }>;
}

interface AdminTransactionStoreState {
  transaction: AdminTransaction | null;
  isLoadingTransaction: boolean;
  errorTransaction: string | null;
  fetchTransaction: (id: string) => Promise<void>;
  verifyTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string, note: string) => Promise<void>;
  saveTransactionNote: (id: string, note: string) => Promise<void>;
  removeTransactionNote: (id: string) => Promise<void>;
}

export const useAdminTransactionStore = create<AdminTransactionStoreState>(
  (set, get) => ({
    transaction: null,
    isLoadingTransaction: false,
    errorTransaction: null,

    fetchTransaction: async (id: string) => {
      set({ isLoadingTransaction: true, errorTransaction: null });
      const { data, error } = await $fetch({
        url: `/api/admin/ico/transaction/${id}`,
        silent: true,
      });
      if (data && !error) {
        set({ transaction: data, isLoadingTransaction: false });
      } else {
        set({
          errorTransaction: error || "Failed to fetch transaction",
          isLoadingTransaction: false,
        });
      }
    },

    verifyTransaction: async (id: string) => {
      set({ isLoadingTransaction: true, errorTransaction: null });
      const { error } = await $fetch({
        url: `/api/admin/ico/transaction/${id}?action=verify`,
        method: "POST",
      });
      if (error) {
        set({ errorTransaction: error, isLoadingTransaction: false });
        throw new Error(error);
      }
      await get().fetchTransaction(id);
      set({ isLoadingTransaction: false });
    },

    rejectTransaction: async (id: string, note: string) => {
      set({ isLoadingTransaction: true, errorTransaction: null });
      const { error } = await $fetch({
        url: `/api/admin/ico/transaction/${id}?action=reject`,
        method: "POST",
        body: { note },
      });
      if (error) {
        set({ errorTransaction: error, isLoadingTransaction: false });
        throw new Error(error);
      }
      await get().fetchTransaction(id);
      set({ isLoadingTransaction: false });
    },

    saveTransactionNote: async (id: string, note: string) => {
      set({ isLoadingTransaction: true, errorTransaction: null });
      const { error } = await $fetch({
        url: `/api/admin/ico/transaction/${id}?action=save-note`,
        method: "POST",
        body: { note },
      });
      if (error) {
        set({ errorTransaction: error, isLoadingTransaction: false });
        throw new Error(error);
      }
      await get().fetchTransaction(id);
      set({ isLoadingTransaction: false });
    },

    removeTransactionNote: async (id: string) => {
      set({ isLoadingTransaction: true, errorTransaction: null });
      const { error } = await $fetch({
        url: `/api/admin/ico/transaction/${id}?action=remove-note`,
        method: "POST",
      });
      if (error) {
        set({ errorTransaction: error, isLoadingTransaction: false });
        throw new Error(error);
      }
      await get().fetchTransaction(id);
      set({ isLoadingTransaction: false });
    },
  })
);
