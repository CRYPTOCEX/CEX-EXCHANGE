"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface PortfolioOverview {
  totalInvested: number;
  pendingInvested: number;
  pendingVerificationInvested: number;
  receivedInvested: number;
  rejectedInvested: number;
  currentValue: number;
}

interface PortfolioStoreState {
  portfolio: PortfolioOverview;
  isLoading: boolean;
  error: string | null;
  fetchPortfolio: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStoreState>((set) => ({
  portfolio: {
    totalInvested: 0,
    pendingInvested: 0,
    pendingVerificationInvested: 0,
    receivedInvested: 0,
    rejectedInvested: 0,
    currentValue: 0,
  },
  isLoading: false,
  error: null,
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await $fetch<PortfolioOverview>({
      url: "/api/ico/portfolio",
      silent: true,
    });
    if (data && !error) {
      set({ portfolio: data, isLoading: false, error: null });
    } else {
      set({
        isLoading: false,
        error: error || "An error occurred while fetching portfolio data",
      });
    }
  },
}));
