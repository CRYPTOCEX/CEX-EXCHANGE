"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface PortfolioInvestment {
  offeringId: string;
  offeringName: string;
  offeringSymbol: string;
  offeringIcon: string;
  tokensHeld: number;
  tokensVesting: number;
  purchasePrice: number;
  currentPrice?: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  vestingProgress: number;
}

export interface PortfolioOverview {
  totalInvested: number;
  totalTokens: number;
  currentValue: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  investments: PortfolioInvestment[];
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
    totalTokens: 0,
    currentValue: 0,
    totalProfitLoss: 0,
    profitLossPercentage: 0,
    investments: [],
  },
  isLoading: false,
  error: null,
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    // API returns string values for Decimal fields
    const { data, error } = await $fetch<{
      totalInvested: string;
      totalTokens: string;
      currentValue: string;
      totalProfitLoss: string;
      profitLossPercentage: string;
      investments: Array<{
        offeringId: string;
        offeringName: string;
        offeringSymbol: string;
        offeringIcon: string;
        tokensHeld: string;
        tokensVesting: string;
        purchasePrice: string;
        currentPrice?: string;
        totalInvested: string;
        currentValue: string;
        profitLoss: string;
        profitLossPercentage: string;
        vestingProgress: string;
      }>;
    }>({
      url: "/api/ico/portfolio",
      silent: true,
    });
    if (data && !error) {
      // Parse string values to numbers
      const portfolio: PortfolioOverview = {
        totalInvested: parseFloat(data.totalInvested) || 0,
        totalTokens: parseFloat(data.totalTokens) || 0,
        currentValue: parseFloat(data.currentValue) || 0,
        totalProfitLoss: parseFloat(data.totalProfitLoss) || 0,
        profitLossPercentage: parseFloat(data.profitLossPercentage) || 0,
        investments: (data.investments || []).map((inv) => ({
          offeringId: inv.offeringId,
          offeringName: inv.offeringName,
          offeringSymbol: inv.offeringSymbol,
          offeringIcon: inv.offeringIcon,
          tokensHeld: parseFloat(inv.tokensHeld) || 0,
          tokensVesting: parseFloat(inv.tokensVesting) || 0,
          purchasePrice: parseFloat(inv.purchasePrice) || 0,
          currentPrice: inv.currentPrice ? parseFloat(inv.currentPrice) : undefined,
          totalInvested: parseFloat(inv.totalInvested) || 0,
          currentValue: parseFloat(inv.currentValue) || 0,
          profitLoss: parseFloat(inv.profitLoss) || 0,
          profitLossPercentage: parseFloat(inv.profitLossPercentage) || 0,
          vestingProgress: parseFloat(inv.vestingProgress) || 0,
        })),
      };
      set({ portfolio, isLoading: false, error: null });
    } else {
      set({
        isLoading: false,
        error: error || "An error occurred while fetching portfolio data",
      });
    }
  },
}));
