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
      // API returns: { period, startValue, endValue, change, changePercentage, history: [{date, value}] }
      const { data, error } = await $fetch<{
        period: string;
        startValue: string;
        endValue: string;
        change: string;
        changePercentage: string;
        history: { date: string; value: string }[];
      }>({
        url: `/api/ico/portfolio/performance?timeframe=${timeframe}`,
        silent: true,
      });
      if (data && !error) {
        // Map API response to store format
        const performanceData: PerformanceDataPoint[] = (data.history || []).map(
          (point) => ({
            date: point.date,
            value: parseFloat(point.value) || 0,
          })
        );
        const initialValue = parseFloat(data.startValue) || 0;
        const currentValue = parseFloat(data.endValue) || 0;
        const absoluteChange = parseFloat(data.change) || 0;
        const percentageChange = parseFloat(data.changePercentage) || 0;

        set({
          performanceData,
          metrics: {
            ...defaultMetrics,
            initialValue,
            currentValue,
            absoluteChange,
            percentageChange,
          },
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
