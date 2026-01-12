"use client";

/**
 * Binary Trading Analytics Hook
 *
 * Provides reactive trading statistics and analytics data.
 */

import { useMemo } from "react";
import { useBinaryStore, type CompletedOrder } from "@/store/trade/use-binary-store";
import {
  calculateTradingStats,
  calculateStatsBySymbol,
  calculateStatsByHour,
  calculateStatsByDay,
  calculateStreaks,
  calculateEquityCurve,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateRecoveryFactor,
  type EquityPoint,
} from "./trading-analytics";
import type {
  TradingStats,
  SymbolStats,
  TimeOfDayStats,
  DayOfWeekStats,
} from "@/types/binary-trading";

// ============================================================================
// TYPES
// ============================================================================

export interface AdvancedMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  recoveryFactor: number;
  profitFactor: number;
  expectancy: number;
  riskRewardRatio: number;
}

export interface TradingAnalytics {
  // Core stats
  stats: TradingStats;

  // Grouped statistics
  statsBySymbol: SymbolStats[];
  statsByHour: TimeOfDayStats[];
  statsByDay: DayOfWeekStats[];

  // Streaks
  currentStreak: number;
  isWinningStreak: boolean;
  longestWinStreak: number;
  longestLossStreak: number;

  // Equity data
  equityCurve: EquityPoint[];
  currentBalance: number;
  startingBalance: number;

  // Advanced metrics
  advancedMetrics: AdvancedMetrics;

  // Recent trades
  recentTrades: CompletedOrder[];

  // Best/worst performance
  bestSymbol: SymbolStats | null;
  worstSymbol: SymbolStats | null;
  bestHour: TimeOfDayStats | null;
  worstHour: TimeOfDayStats | null;

  // Status
  isLoading: boolean;
  hasData: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to get comprehensive trading analytics
 */
export function useTradingAnalytics(): TradingAnalytics {
  const {
    completedOrders,
    isLoadingOrders,
    demoBalance,
    realBalance,
    tradingMode,
  } = useBinaryStore();

  // Get starting balance based on trading mode
  const startingBalance = useMemo(() => {
    return tradingMode === "demo" ? 10000 : (realBalance ?? 0);
  }, [tradingMode, realBalance]);

  // Current balance
  const currentBalance = useMemo(() => {
    return tradingMode === "demo" ? demoBalance : (realBalance ?? 0);
  }, [tradingMode, demoBalance, realBalance]);

  // Core statistics
  const stats = useMemo(() => {
    return calculateTradingStats(completedOrders);
  }, [completedOrders]);

  // Statistics by symbol
  const statsBySymbol = useMemo(() => {
    return calculateStatsBySymbol(completedOrders);
  }, [completedOrders]);

  // Statistics by hour
  const statsByHour = useMemo(() => {
    return calculateStatsByHour(completedOrders);
  }, [completedOrders]);

  // Statistics by day
  const statsByDay = useMemo(() => {
    return calculateStatsByDay(completedOrders);
  }, [completedOrders]);

  // Streaks
  const streaks = useMemo(() => {
    return calculateStreaks(completedOrders);
  }, [completedOrders]);

  // Equity curve
  const equityCurve = useMemo(() => {
    // Use starting balance as base for equity calculation
    const baseBalance = startingBalance || 10000;
    return calculateEquityCurve(completedOrders, baseBalance);
  }, [completedOrders, startingBalance]);

  // Advanced metrics
  const advancedMetrics = useMemo((): AdvancedMetrics => {
    const sharpeRatio = calculateSharpeRatio(completedOrders);
    const sortinoRatio = calculateSortinoRatio(completedOrders);
    const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(
      completedOrders,
      startingBalance || 10000
    );
    const recoveryFactor = calculateRecoveryFactor(
      completedOrders,
      startingBalance || 10000
    );

    // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
    const winPercent = stats.winRate / 100;
    const lossPercent = 1 - winPercent;
    const expectancy = stats.totalTrades > 0
      ? (winPercent * stats.avgWinAmount) - (lossPercent * stats.avgLossAmount)
      : 0;

    // Risk/Reward Ratio = Avg Win / Avg Loss
    const riskRewardRatio = stats.avgLossAmount > 0
      ? stats.avgWinAmount / stats.avgLossAmount
      : stats.avgWinAmount > 0 ? Infinity : 0;

    return {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      recoveryFactor,
      profitFactor: stats.profitFactor,
      expectancy,
      riskRewardRatio,
    };
  }, [completedOrders, startingBalance, stats]);

  // Recent trades (last 20)
  const recentTrades = useMemo(() => {
    return [...completedOrders]
      .sort((a, b) => b.expiryTime.getTime() - a.expiryTime.getTime())
      .slice(0, 20);
  }, [completedOrders]);

  // Best/worst symbols
  const bestSymbol = useMemo(() => {
    const sorted = [...statsBySymbol].sort((a, b) => b.winRate - a.winRate);
    return sorted.find(s => s.totalTrades >= 5) || sorted[0] || null;
  }, [statsBySymbol]);

  const worstSymbol = useMemo(() => {
    const sorted = [...statsBySymbol].sort((a, b) => a.winRate - b.winRate);
    return sorted.find(s => s.totalTrades >= 5) || sorted[0] || null;
  }, [statsBySymbol]);

  // Best/worst hours
  const bestHour = useMemo(() => {
    const sorted = [...statsByHour]
      .filter(h => h.trades >= 3)
      .sort((a, b) => b.winRate - a.winRate);
    return sorted[0] || null;
  }, [statsByHour]);

  const worstHour = useMemo(() => {
    const sorted = [...statsByHour]
      .filter(h => h.trades >= 3)
      .sort((a, b) => a.winRate - b.winRate);
    return sorted[0] || null;
  }, [statsByHour]);

  return {
    stats,
    statsBySymbol,
    statsByHour,
    statsByDay,
    currentStreak: streaks.currentStreak,
    isWinningStreak: streaks.isWinningStreak,
    longestWinStreak: streaks.longestWinStreak,
    longestLossStreak: streaks.longestLossStreak,
    equityCurve,
    currentBalance,
    startingBalance: startingBalance || 10000,
    advancedMetrics,
    recentTrades,
    bestSymbol,
    worstSymbol,
    bestHour,
    worstHour,
    isLoading: isLoadingOrders,
    hasData: completedOrders.length > 0,
  };
}

export default useTradingAnalytics;
