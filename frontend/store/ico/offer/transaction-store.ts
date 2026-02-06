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

    fetchTransactions: async () => {
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
        set({ transactions: enriched });
      }
    },

    purchase: async (
      offeringId: string,
      amount: number,
      walletAddress: string
    ) => {
      const { data, error } = await $fetch<IcoTransactionExtended>({
        url: "/api/ico/transaction",
        method: "POST",
        body: { offeringId, amount, walletAddress },
      });

      if (data && !error) {
        await useOfferStore.getState().fetchOffering(offeringId);
      } else {
        throw new Error("Failed to process investment");
      }
    },
  })
);
