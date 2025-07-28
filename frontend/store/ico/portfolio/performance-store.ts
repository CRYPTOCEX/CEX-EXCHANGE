"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface PerformanceMetrics {
  initialValue: number;
  currentValue: number;
  absoluteChange: number;
  percentageChange: number;
  bestDay: { date: string; change: number };
  worstDay: { date: string; change: number };
  volatility: number;
  sharpeRatio: number;
  allocation: { byToken: { name: string; percentage: number }[] };
  rejectedInvested: number;
  marketComparison: { btc: number; eth: number; index: number };
}

const defaultMetrics: PerformanceMetrics = {
  initialValue: 0,
  currentValue: 0,
  absoluteChange: 0,
  percentageChange: 0,
  bestDay: { date: "", change: 0 },
  worstDay: { date: "", change: 0 },
  volatility: 0,
  sharpeRatio: 0,
  allocation: { byToken: [] },
  rejectedInvested: 0,
  marketComparison: { btc: 0, eth: 0, index: 0 },
};

interface PortfolioPerformanceState {
  performanceData: PerformanceDataPoint[];
  metrics: PerformanceMetrics;
  timeframe: string;
  isLoading: boolean;
  error: string | null;
  fetchPerformanceData: (timeframe: string) => Promise<void>;
  setTimeframe: (timeframe: string) => void;
}

export const usePortfolioPerformanceStore = create<PortfolioPerformanceState>(
  (set, get) => ({
    performanceData: [],
    metrics: defaultMetrics,
    timeframe: "1M",
    isLoading: false,
    error: null,
    fetchPerformanceData: async (timeframe: string) => {
      set({ isLoading: true, error: null });
      const { data, error } = await $fetch<{
        performanceData: PerformanceDataPoint[];
        metrics: PerformanceMetrics;
      }>({
        url: `/api/ico/portfolio/performance?timeframe=${timeframe}`,
        silent: true,
      });
      if (data && !error) {
        set({
          performanceData: data.performanceData,
          metrics: data.metrics,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          error: error || "An error occurred while fetching performance data",
        });
      }
    },
    setTimeframe: (timeframe: string) => {
      set({ timeframe });
      get().fetchPerformanceData(timeframe);
    },
  })
);
