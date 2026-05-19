"use client";

/**
 * Risk Management Hook
 *
 * Central hook for managing all risk management features:
 * - Limit orders
 * - Stop-loss / Take-profit
 * - OCO orders
 * - Daily loss limits
 * - Position sizing
 * - Trade cooldown
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  RiskManagementState,
  LimitOrder,
  LimitOrderFormData,
  StopLossSettings,
  TakeProfitSettings,
  OCOSettings,
  OCOOrder,
  DailyLimitSettings,
  PositionSizingSettings,
  PositionSizeResult,
  CooldownSettings,
} from "./risk-management-types";
import {
  DEFAULT_RISK_MANAGEMENT_STATE,
  DEFAULT_STOP_LOSS_SETTINGS,
  DEFAULT_TAKE_PROFIT_SETTINGS,
  DEFAULT_DAILY_LIMIT_SETTINGS,
  DEFAULT_COOLDOWN_SETTINGS,
} from "./risk-management-types";

const STORAGE_KEY = "binary-risk-management";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for orders
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate Kelly criterion position size
 */
function calculateKellySize(
  balance: number,
  winRate: number,
  profitRatio: number,
  fraction: number = 1
): number {
  // Kelly formula: f = (bp - q) / b
  // where b = profit ratio, p = win probability, q = loss probability
  const p = winRate / 100;
  const q = 1 - p;
  const b = profitRatio;

  const kelly = (b * p - q) / b;

  // Apply fraction (half-Kelly, quarter-Kelly, etc.)
  const adjustedKelly = Math.max(0, kelly * fraction);

  // Never risk more than 25% even with full Kelly
  const maxKelly = Math.min(adjustedKelly, 0.25);

  return balance * maxKelly;
}

/**
 * Check if a limit order should trigger
 */
function shouldTriggerLimitOrder(
  order: LimitOrder,
  currentPrice: number,
  previousPrice: number
): boolean {
  switch (order.condition) {
    case "above":
      return currentPrice >= order.limitPrice;
    case "below":
      return currentPrice <= order.limitPrice;
    case "cross_above":
      return previousPrice < order.limitPrice && currentPrice >= order.limitPrice;
    case "cross_below":
      return previousPrice > order.limitPrice && currentPrice <= order.limitPrice;
    default:
      return false;
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseRiskManagementOptions {
  balance: number;
  currentPrice: number;
  previousPrice?: number;
  onLimitOrderTriggered?: (order: LimitOrder) => void;
  onStopLossTriggered?: (orderId: string, reason: string) => void;
  onTakeProfitTriggered?: (orderId: string, reason: string) => void;
  onDailyLimitReached?: () => void;
  onCooldownStarted?: (endsAt: number) => void;
}

export interface UseRiskManagementReturn {
  state: RiskManagementState;

  // Limit orders
  addLimitOrder: (data: LimitOrderFormData, symbol: string) => LimitOrder;
  cancelLimitOrder: (orderId: string) => void;
  getPendingLimitOrders: () => LimitOrder[];

  // Stop-loss
  updateStopLoss: (settings: Partial<StopLossSettings>) => void;
  checkStopLoss: (currentLoss: number) => { triggered: boolean; reason: string };

  // Take-profit
  updateTakeProfit: (settings: Partial<TakeProfitSettings>) => void;
  checkTakeProfit: (currentProfit: number) => { triggered: boolean; reason: string };

  // OCO
  updateOCO: (settings: Partial<OCOSettings>) => void;
  createOCOForOrder: (orderId: string) => OCOOrder | null;
  cancelOCO: (ocoId: string) => void;

  // Daily limit
  updateDailyLimit: (settings: Partial<DailyLimitSettings>) => void;
  recordTrade: (profit: number) => void;
  canTrade: () => { allowed: boolean; reason?: string };
  overrideDailyLimit: (durationMinutes: number) => void;

  // Position sizing
  updatePositionSizing: (settings: Partial<PositionSizingSettings>) => void;
  calculatePositionSize: (winRate?: number, avgProfit?: number, avgLoss?: number) => PositionSizeResult;

  // Cooldown
  updateCooldown: (settings: Partial<CooldownSettings>) => void;
  recordLoss: () => void;
  recordWin: () => void;
  isInCooldown: () => boolean;
  getCooldownRemaining: () => number;
  overrideCooldown: () => void;

  // Reset
  resetSession: () => void;
  resetDaily: () => void;
}

export function useRiskManagement(
  options: UseRiskManagementOptions
): UseRiskManagementReturn {
  const {
    balance,
    currentPrice,
    previousPrice = currentPrice,
    onLimitOrderTriggered,
    onStopLossTriggered,
    onTakeProfitTriggered,
    onDailyLimitReached,
    onCooldownStarted,
  } = options;

  // Load initial state from localStorage
  const [state, setState] = useState<RiskManagementState>(() => {
    if (typeof window === "undefined") return DEFAULT_RISK_MANAGEMENT_STATE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields
        return {
          ...DEFAULT_RISK_MANAGEMENT_STATE,
          ...parsed,
          stopLoss: { ...DEFAULT_STOP_LOSS_SETTINGS, ...parsed.stopLoss },
          takeProfit: { ...DEFAULT_TAKE_PROFIT_SETTINGS, ...parsed.takeProfit },
          dailyLimit: { ...DEFAULT_DAILY_LIMIT_SETTINGS, ...parsed.dailyLimit },
          cooldown: { ...DEFAULT_COOLDOWN_SETTINGS, ...parsed.cooldown },
        };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_RISK_MANAGEMENT_STATE;
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  // Check for daily reset
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (state.dailyLimit.lastResetDate !== today) {
      setState((prev) => ({
        ...prev,
        dailyLimit: {
          ...prev.dailyLimit,
          currentDailyPL: 0,
          isLimitReached: false,
          lastResetDate: today,
        },
        stopLoss: {
          ...prev.stopLoss,
          currentDailyLoss: 0,
          lastDailyReset: today,
        },
        takeProfit: {
          ...prev.takeProfit,
          currentDailyProfit: 0,
          lastDailyReset: today,
        },
      }));
    }
  }, [state.dailyLimit.lastResetDate]);

  // Check limit orders on price change
  useEffect(() => {
    const pendingOrders = state.limitOrders.filter((o) => o.status === "WAITING");
    const now = Date.now();

    for (const order of pendingOrders) {
      // Check if limit order expired
      if (order.expiresAt < now) {
        setState((prev) => ({
          ...prev,
          limitOrders: prev.limitOrders.map((o) =>
            o.id === order.id ? { ...o, status: "EXPIRED" as const } : o
          ),
        }));
        continue;
      }

      // Check if limit order should trigger
      if (shouldTriggerLimitOrder(order, currentPrice, previousPrice)) {
        setState((prev) => ({
          ...prev,
          limitOrders: prev.limitOrders.map((o) =>
            o.id === order.id ? { ...o, status: "TRIGGERED" as const } : o
          ),
        }));
        onLimitOrderTriggered?.(order);
      }
    }
  }, [currentPrice, previousPrice, state.limitOrders, onLimitOrderTriggered]);

  // Check cooldown expiry
  useEffect(() => {
    if (state.cooldown.isInCooldown && state.cooldown.cooldownEndsAt) {
      const now = Date.now();
      if (now >= state.cooldown.cooldownEndsAt) {
        setState((prev) => ({
          ...prev,
          cooldown: {
            ...prev.cooldown,
            isInCooldown: false,
            cooldownEndsAt: undefined,
          },
        }));
      }
    }
  }, [state.cooldown.isInCooldown, state.cooldown.cooldownEndsAt]);

  // ============================================================================
  // LIMIT ORDER FUNCTIONS
  // ============================================================================

  const addLimitOrder = useCallback(
    (data: LimitOrderFormData, symbol: string): LimitOrder => {
      const duration = state.stopLoss.enabled ? data.expiryMinutes : 60; // Default limit duration
      const order: LimitOrder = {
        id: generateId(),
        symbol,
        side: data.side,
        amount: data.amount,
        limitPrice: data.limitPrice,
        expiryMinutes: data.expiryMinutes,
        condition: data.condition,
        createdAt: Date.now(),
        expiresAt: Date.now() + data.limitOrderExpiry * 60 * 1000,
        status: "WAITING",
        profitPercentage: 85, // Default, should be fetched from duration
      };

      setState((prev) => ({
        ...prev,
        limitOrders: [order, ...prev.limitOrders],
      }));

      return order;
    },
    [state.stopLoss.enabled]
  );

  const cancelLimitOrder = useCallback((orderId: string) => {
    setState((prev) => ({
      ...prev,
      limitOrders: prev.limitOrders.map((o) =>
        o.id === orderId ? { ...o, status: "CANCELLED" as const } : o
      ),
    }));
  }, []);

  const getPendingLimitOrders = useCallback(() => {
    return state.limitOrders.filter((o) => o.status === "WAITING");
  }, [state.limitOrders]);

  // ============================================================================
  // STOP-LOSS FUNCTIONS
  // ============================================================================

  const updateStopLoss = useCallback((settings: Partial<StopLossSettings>) => {
    setState((prev) => ({
      ...prev,
      stopLoss: { ...prev.stopLoss, ...settings },
    }));
  }, []);

  const checkStopLoss = useCallback(
    (currentLoss: number): { triggered: boolean; reason: string } => {
      if (!state.stopLoss.enabled) {
        return { triggered: false, reason: "" };
      }

      switch (state.stopLoss.type) {
        case "per_trade":
          if (currentLoss >= state.stopLoss.perTradeLossPercent) {
            return { triggered: true, reason: "Per-trade stop-loss triggered" };
          }
          break;
        case "session":
          if (state.stopLoss.currentSessionLoss >= state.stopLoss.sessionLossLimit) {
            return { triggered: true, reason: "Session stop-loss limit reached" };
          }
          break;
        case "daily":
          if (state.stopLoss.currentDailyLoss >= state.stopLoss.dailyLossLimit) {
            return { triggered: true, reason: "Daily stop-loss limit reached" };
          }
          break;
      }

      return { triggered: false, reason: "" };
    },
    [state.stopLoss]
  );

  // ============================================================================
  // TAKE-PROFIT FUNCTIONS
  // ============================================================================

  const updateTakeProfit = useCallback((settings: Partial<TakeProfitSettings>) => {
    setState((prev) => ({
      ...prev,
      takeProfit: { ...prev.takeProfit, ...settings },
    }));
  }, []);

  const checkTakeProfit = useCallback(
    (currentProfit: number): { triggered: boolean; reason: string } => {
      if (!state.takeProfit.enabled) {
        return { triggered: false, reason: "" };
      }

      switch (state.takeProfit.type) {
        case "per_trade":
          if (currentProfit >= state.takeProfit.perTradeProfitPercent) {
            return { triggered: true, reason: "Per-trade take-profit triggered" };
          }
          break;
        case "session":
          if (state.takeProfit.currentSessionProfit >= state.takeProfit.sessionProfitTarget) {
            return { triggered: true, reason: "Session profit target reached" };
          }
          break;
        case "daily":
          if (state.takeProfit.currentDailyProfit >= state.takeProfit.dailyProfitTarget) {
            return { triggered: true, reason: "Daily profit target reached" };
          }
          break;
      }

      return { triggered: false, reason: "" };
    },
    [state.takeProfit]
  );

  // ============================================================================
  // OCO FUNCTIONS
  // ============================================================================

  const updateOCO = useCallback((settings: Partial<OCOSettings>) => {
    setState((prev) => ({
      ...prev,
      oco: { ...prev.oco, ...settings },
    }));
  }, []);

  const createOCOForOrder = useCallback(
    (orderId: string): OCOOrder | null => {
      if (!state.oco.enabled) return null;

      const oco: OCOOrder = {
        id: generateId(),
        stopLossPercent: state.oco.defaultStopLossPercent,
        takeProfitPercent: state.oco.defaultTakeProfitPercent,
        linkedOrderId: orderId,
        status: "ACTIVE",
      };

      setState((prev) => ({
        ...prev,
        ocoOrders: [...prev.ocoOrders, oco],
      }));

      return oco;
    },
    [state.oco]
  );

  const cancelOCO = useCallback((ocoId: string) => {
    setState((prev) => ({
      ...prev,
      ocoOrders: prev.ocoOrders.map((o) =>
        o.id === ocoId ? { ...o, status: "CANCELLED" as const } : o
      ),
    }));
  }, []);

  // ============================================================================
  // DAILY LIMIT FUNCTIONS
  // ============================================================================

  const updateDailyLimit = useCallback((settings: Partial<DailyLimitSettings>) => {
    setState((prev) => ({
      ...prev,
      dailyLimit: { ...prev.dailyLimit, ...settings },
    }));
  }, []);

  const recordTrade = useCallback(
    (profit: number) => {
      setState((prev) => {
        const newPL = prev.dailyLimit.currentDailyPL + profit;
        const maxLoss =
          prev.dailyLimit.maxDailyLossType === "percentage"
            ? (balance * prev.dailyLimit.maxDailyLoss) / 100
            : prev.dailyLimit.maxDailyLoss;

        const isLimitReached = prev.dailyLimit.enabled && -newPL >= maxLoss;

        if (isLimitReached && !prev.dailyLimit.isLimitReached) {
          onDailyLimitReached?.();
        }

        return {
          ...prev,
          dailyLimit: {
            ...prev.dailyLimit,
            currentDailyPL: newPL,
            isLimitReached,
          },
          stopLoss: {
            ...prev.stopLoss,
            currentDailyLoss: profit < 0 ? prev.stopLoss.currentDailyLoss - profit : prev.stopLoss.currentDailyLoss,
            currentSessionLoss: profit < 0 ? prev.stopLoss.currentSessionLoss - profit : prev.stopLoss.currentSessionLoss,
          },
          takeProfit: {
            ...prev.takeProfit,
            currentDailyProfit: profit > 0 ? prev.takeProfit.currentDailyProfit + profit : prev.takeProfit.currentDailyProfit,
            currentSessionProfit: profit > 0 ? prev.takeProfit.currentSessionProfit + profit : prev.takeProfit.currentSessionProfit,
          },
        };
      });
    },
    [balance, onDailyLimitReached]
  );

  const canTrade = useCallback((): { allowed: boolean; reason?: string } => {
    // Check daily limit
    if (state.dailyLimit.enabled && state.dailyLimit.isLimitReached) {
      // Check for override
      if (state.dailyLimit.overrideUntil && Date.now() < state.dailyLimit.overrideUntil) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Daily loss limit reached" };
    }

    // Check cooldown
    if (state.cooldown.enabled && state.cooldown.isInCooldown) {
      return { allowed: false, reason: "Cooldown active" };
    }

    return { allowed: true };
  }, [state.dailyLimit, state.cooldown]);

  const overrideDailyLimit = useCallback((durationMinutes: number) => {
    setState((prev) => ({
      ...prev,
      dailyLimit: {
        ...prev.dailyLimit,
        overrideUntil: Date.now() + durationMinutes * 60 * 1000,
      },
    }));
  }, []);

  // ============================================================================
  // POSITION SIZING FUNCTIONS
  // ============================================================================

  const updatePositionSizing = useCallback((settings: Partial<PositionSizingSettings>) => {
    setState((prev) => ({
      ...prev,
      positionSizing: { ...prev.positionSizing, ...settings },
    }));
  }, []);

  const calculatePositionSize = useCallback(
    (winRate?: number, avgProfit?: number, avgLoss?: number): PositionSizeResult => {
      const settings = state.positionSizing;

      switch (settings.method) {
        case "fixed":
          return {
            suggestedAmount: Math.min(settings.fixedAmount, balance),
            method: "fixed",
            explanation: "Fixed position size",
            riskAmount: settings.fixedAmount,
            riskPercentage: (settings.fixedAmount / balance) * 100,
          };

        case "percentage": {
          const percentAmount = (balance * settings.riskPercentage) / 100;
          return {
            suggestedAmount: percentAmount,
            method: "percentage",
            explanation: `${settings.riskPercentage}% of balance`,
            riskAmount: percentAmount,
            riskPercentage: settings.riskPercentage,
          };
        }

        case "kelly": {
          const effectiveWinRate = winRate ?? settings.kellyWinRate;
          const effectiveProfitRatio = avgProfit && avgLoss ? avgProfit / avgLoss : settings.kellyProfitRatio;
          const kellyAmount = calculateKellySize(
            balance,
            effectiveWinRate,
            effectiveProfitRatio,
            settings.kellyFraction
          );
          return {
            suggestedAmount: Math.max(0, kellyAmount),
            method: "kelly",
            explanation: `Kelly criterion (${settings.kellyFraction * 100}% Kelly)`,
            riskAmount: kellyAmount,
            riskPercentage: (kellyAmount / balance) * 100,
          };
        }

        case "anti_martingale": {
          // Anti-martingale increases after wins, not losses
          // This is handled elsewhere, return base percentage for now
          const baseAmount = (balance * settings.riskPercentage) / 100;
          return {
            suggestedAmount: baseAmount,
            method: "anti_martingale",
            explanation: "Anti-martingale: increases after wins",
            riskAmount: baseAmount,
            riskPercentage: settings.riskPercentage,
          };
        }

        default:
          return {
            suggestedAmount: 100,
            method: "fixed",
            explanation: "Default position size",
            riskAmount: 100,
            riskPercentage: (100 / balance) * 100,
          };
      }
    },
    [balance, state.positionSizing]
  );

  // ============================================================================
  // COOLDOWN FUNCTIONS
  // ============================================================================

  const updateCooldown = useCallback((settings: Partial<CooldownSettings>) => {
    setState((prev) => ({
      ...prev,
      cooldown: { ...prev.cooldown, ...settings },
    }));
  }, []);

  const recordLoss = useCallback(() => {
    if (!state.cooldown.enabled) return;

    setState((prev) => {
      const newConsecutiveLosses = prev.cooldown.consecutiveLosses + 1;
      const shouldStartCooldown = newConsecutiveLosses >= prev.cooldown.triggerAfterLosses;

      if (shouldStartCooldown && !prev.cooldown.isInCooldown) {
        const endsAt = Date.now() + prev.cooldown.cooldownMinutes * 60 * 1000;
        onCooldownStarted?.(endsAt);

        return {
          ...prev,
          cooldown: {
            ...prev.cooldown,
            consecutiveLosses: newConsecutiveLosses,
            isInCooldown: true,
            cooldownEndsAt: endsAt,
          },
        };
      }

      return {
        ...prev,
        cooldown: {
          ...prev.cooldown,
          consecutiveLosses: newConsecutiveLosses,
        },
      };
    });
  }, [state.cooldown.enabled, onCooldownStarted]);

  const recordWin = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cooldown: {
        ...prev.cooldown,
        consecutiveLosses: 0,
      },
    }));
  }, []);

  const isInCooldown = useCallback((): boolean => {
    if (!state.cooldown.enabled || !state.cooldown.isInCooldown) return false;
    if (!state.cooldown.cooldownEndsAt) return false;
    return Date.now() < state.cooldown.cooldownEndsAt;
  }, [state.cooldown]);

  const getCooldownRemaining = useCallback((): number => {
    if (!state.cooldown.cooldownEndsAt) return 0;
    return Math.max(0, state.cooldown.cooldownEndsAt - Date.now());
  }, [state.cooldown.cooldownEndsAt]);

  const overrideCooldown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cooldown: {
        ...prev.cooldown,
        isInCooldown: false,
        cooldownEndsAt: undefined,
        overrideWarningShown: true,
      },
    }));
  }, []);

  // ============================================================================
  // RESET FUNCTIONS
  // ============================================================================

  const resetSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stopLoss: {
        ...prev.stopLoss,
        currentSessionLoss: 0,
      },
      takeProfit: {
        ...prev.takeProfit,
        currentSessionProfit: 0,
      },
      cooldown: {
        ...prev.cooldown,
        consecutiveLosses: 0,
        isInCooldown: false,
        cooldownEndsAt: undefined,
      },
    }));
  }, []);

  const resetDaily = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setState((prev) => ({
      ...prev,
      dailyLimit: {
        ...prev.dailyLimit,
        currentDailyPL: 0,
        isLimitReached: false,
        lastResetDate: today,
      },
      stopLoss: {
        ...prev.stopLoss,
        currentDailyLoss: 0,
        lastDailyReset: today,
      },
      takeProfit: {
        ...prev.takeProfit,
        currentDailyProfit: 0,
        lastDailyReset: today,
      },
    }));
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return useMemo(
    () => ({
      state,
      // Limit orders
      addLimitOrder,
      cancelLimitOrder,
      getPendingLimitOrders,
      // Stop-loss
      updateStopLoss,
      checkStopLoss,
      // Take-profit
      updateTakeProfit,
      checkTakeProfit,
      // OCO
      updateOCO,
      createOCOForOrder,
      cancelOCO,
      // Daily limit
      updateDailyLimit,
      recordTrade,
      canTrade,
      overrideDailyLimit,
      // Position sizing
      updatePositionSizing,
      calculatePositionSize,
      // Cooldown
      updateCooldown,
      recordLoss,
      recordWin,
      isInCooldown,
      getCooldownRemaining,
      overrideCooldown,
      // Reset
      resetSession,
      resetDaily,
    }),
    [
      state,
      addLimitOrder,
      cancelLimitOrder,
      getPendingLimitOrders,
      updateStopLoss,
      checkStopLoss,
      updateTakeProfit,
      checkTakeProfit,
      updateOCO,
      createOCOForOrder,
      cancelOCO,
      updateDailyLimit,
      recordTrade,
      canTrade,
      overrideDailyLimit,
      updatePositionSizing,
      calculatePositionSize,
      updateCooldown,
      recordLoss,
      recordWin,
      isInCooldown,
      getCooldownRemaining,
      overrideCooldown,
      resetSession,
      resetDaily,
    ]
  );
}

export default useRiskManagement;
