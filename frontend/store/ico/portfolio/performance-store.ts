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
      // Backend /api/ico/portfolio/performance returns:
      //   { performanceData: [{date, value}], metrics: { ... } }
      // We remap performanceData -> history and extract start/end values
      // from metrics or the first/last entries in performanceData.
      const { data, error } = await $fetch<{
        performanceData?: { date: string; value: string | number }[];
        metrics?: Record<string, string | number | any>;
      }>({
        url: `/api/ico/portfolio/performance?timeframe=${timeframe}`,
        silent: true,
      });
      if (data && !error) {
        const toNum = (v: string | number | undefined | null) =>
          typeof v === "number" ? v : parseFloat(v as string) || 0;

        const rawPoints = data.performanceData || [];
        const performanceData: PerformanceDataPoint[] = rawPoints.map(
          (point) => ({
            date: point.date,
            value: toNum(point.value),
          })
        );

        const m = data.metrics || {};
        const firstValue =
          performanceData.length > 0 ? performanceData[0].value : 0;
        const lastValue =
          performanceData.length > 0
            ? performanceData[performanceData.length - 1].value
            : 0;

        const initialValue =
          m.initialValue != null ? toNum(m.initialValue) : firstValue;
        const currentValue =
          m.currentValue != null ? toNum(m.currentValue) : lastValue;
        const absoluteChange =
          m.absoluteChange != null
            ? toNum(m.absoluteChange)
            : currentValue - initialValue;
        const percentageChange =
          m.percentageChange != null
            ? toNum(m.percentageChange)
            : initialValue > 0
              ? (absoluteChange / initialValue) * 100
              : 0;

        set({
          performanceData,
          metrics: {
            ...defaultMetrics,
            initialValue,
            currentValue,
            absoluteChange,
            percentageChange,
            // Carry through the rest of the analytics the endpoint computes.
            // These used to be dropped on the floor by the `...defaultMetrics`
            // spread, so bestDay/worstDay/volatility/sharpeRatio always rendered
            // as zeroes even though the backend had real values for them.
            bestDay: m.bestDay
              ? { date: String(m.bestDay.date ?? ""), change: toNum(m.bestDay.change) }
              : defaultMetrics.bestDay,
            worstDay: m.worstDay
              ? { date: String(m.worstDay.date ?? ""), change: toNum(m.worstDay.change) }
              : defaultMetrics.worstDay,
            volatility: toNum(m.volatility),
            sharpeRatio: toNum(m.sharpeRatio),
            rejectedInvested: toNum(m.rejectedInvested),
            allocation: {
              byToken: Array.isArray(m.allocation?.byToken)
                ? m.allocation.byToken.map((t: any) => ({
                    name: String(t?.name ?? ""),
                    percentage: toNum(t?.percentage),
                  }))
                : [],
            },
            // NOTE: marketComparison is NOT produced by the backend. It stays at
            // its zeroed default and must not be rendered as if it were real.
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
