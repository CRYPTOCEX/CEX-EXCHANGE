"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useOfferStore } from "./offer-store";

export interface IcoTransactionExtended {
  id: string;
  userId: string;
  offeringId: string;
  amount: number;
  price: number;
  status: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  offering?: {
    name: string;
    symbol: string;
    currentPrice: number | null;
    tokenPrice: number;
    icon?: string;
    type?: {
      id: string;
      name: string;
      value: string;
      description: string;
    };
  };
  // Server-calculated fields (Decimal precision from Rust backend)
  invested?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
  transactionDate: string;
}

interface icoTransactionStoreState {
  transactions: IcoTransactionExtended[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  purchase: (
    offeringId: string,
    amount: number,
    walletAddress: string
  ) => Promise<void>;
}

export const useIcoTransactionStore = create<icoTransactionStoreState>(
  (set, get) => ({
    transactions: [],
    isLoading: false,
    isSubmitting: false,
    error: null,

    fetchTransactions: async () => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch<{
        items: IcoTransactionExtended[];
        total: number;
        page: number;
        limit: number;
      }>({
        url: "/api/ico/transaction",
        silent: true,
      });

      if (data && !error) {
        // Use server-calculated values (Decimal precision from Rust backend)
        // No client-side recalculation needed
        const enriched = data.items.map((tx) => ({
          ...tx,
          // Fallback to client calculation only if server didn't provide values
          invested: tx.invested ?? tx.amount * tx.price,
          currentValue: tx.currentValue ?? tx.amount * tx.price,
          profitLoss: tx.profitLoss ?? 0,
          profitLossPercentage: tx.profitLossPercentage ?? 0,
          transactionDate: tx.createdAt,
        }));
        set({ transactions: enriched, isLoading: false });
      } else {
        set({ isLoading: false, error: error || "Failed to fetch transactions" });
      }
    },

    purchase: async (
      offeringId: string,
      amount: number,
      walletAddress: string
    ) => {
      set({ isSubmitting: true, error: null });
      const { data, error } = await $fetch<IcoTransactionExtended>({
        url: "/api/ico/transaction",
        method: "POST",
        body: { offeringId, amount, walletAddress },
      });

      if (data && !error) {
        set({ isSubmitting: false });
        await useOfferStore.getState().fetchOffering(offeringId);
      } else {
        set({ isSubmitting: false, error: error || "Failed to process investment" });
        throw new Error("Failed to process investment");
      }
    },
  })
);
