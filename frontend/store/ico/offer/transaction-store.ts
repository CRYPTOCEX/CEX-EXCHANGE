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
    icon: string;
    type?: {
      id: string;
      name: string;
      value: string;
      description: string;
    };
  };
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
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
      const { data, error } = await $fetch<IcoTransactionExtended[]>({
        url: "/api/ico/transaction",
        silent: true,
      });

      if (data && !error) {
        const enriched = data.map((tx) => {
          const invested = tx.amount * tx.price;
          const currentPrice =
            tx.offering && (tx.offering.currentPrice ?? tx.offering.tokenPrice)
              ? (tx.offering.currentPrice ?? tx.offering.tokenPrice)
              : tx.price;
          const currentValue = tx.amount * currentPrice;
          const profitLoss = currentValue - invested;
          const profitLossPercentage =
            invested > 0 ? (profitLoss / invested) * 100 : 0;

          return {
            ...tx,
            invested,
            currentValue,
            profitLoss,
            profitLossPercentage,
            transactionDate: tx.createdAt,
          };
        });
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
