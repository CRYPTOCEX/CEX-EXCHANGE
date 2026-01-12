"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Symbol, OrderSide } from "@/store/trade/use-binary-store";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import type { BinaryOrderType } from "@/types/binary-trading";
import { ORDER_TYPE_CONFIGS, getProfitPercentageForType } from "@/types/binary-trading";
import AmountSelector from "./amount-selector";
import ExpirySelector from "./expiry-selector";
import ProfitDisplay from "./profit-display";
import TemplatesSelector from "./templates-selector";
import TradingButtons from "./trading-buttons";
import DynamicTradingButtons from "./dynamic-trading-buttons";
import BinaryTypeSelector from "./binary-type-selector";
import OrderTypeModal from "./order-type-modal";
import BarrierInput from "./barrier-input";
import StrikePriceInput from "./strike-price-input";
import PayoutPerPointInput from "./payout-per-point-input";
import TradingShortcuts from "./trading-shortcuts";
import RiskCalculator from "./risk-calculator";
import AdvancedTradeConfirmation from "./trade-confirmation";
import { OrderTypeIcon, ORDER_TYPE_COLORS } from "./order-type-icons";
import {
  getChartSynchronizedTime,
  formatChartTime,
  calculateNextExpiryTime,
} from "@/utils/time-sync";
import { useTranslations } from "next-intl";

// CandleData interface for chart data
interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
import { Timer, Sparkles, Zap } from "lucide-react";
import { useOneClickTrading } from "../settings/one-click-toggle";
import { useMartingale } from "../settings/martingale-settings";
import { toast } from "sonner";
import { useTradingSettingsStore } from "@/store/trade/use-trading-settings-store";
import { AudioFeedback } from "@/components/binary/audio-feedback";
import { notifyOrderPlaced } from "@/components/binary/notifications";

// Define the binary duration interface
interface BinaryDurationAttributes {
  id: string;
  duration: number;

  // Type-specific profit percentages
  profitPercentageRiseFall: number;
  profitPercentageHigherLower: number;
  profitPercentageTouchNoTouch: number;
  profitPercentageCallPut: number;
  profitPercentageTurbo: number;

  // Deprecated - kept for backward compatibility
  profitPercentage?: number;

  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Add the darkMode prop to the OrderPanelProps interface
interface OrderPanelProps {
  currentPrice: number;
  symbol: Symbol;
  onPlaceOrder: (
    side: OrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<boolean>;
  onExpiryChange?: (minutes: number) => void;
  balance?: number;
  candleData: CandleData[];
  priceMovement: {
    direction: "up" | "down" | "neutral";
    percent: number;
    strength: "strong" | "medium" | "weak";
  };
  isInSafeZone?: boolean;
  tradingMode?: "demo" | "real";
  isMobile?: boolean;
  darkMode?: boolean;
}

// Update the function parameters to include darkMode with a default value
export function OrderPanel({
  currentPrice,
  symbol,
  onPlaceOrder,
  onExpiryChange,
  balance = 10000,
  candleData,
  priceMovement = { direction: "neutral", percent: 0, strength: "weak" },
  isInSafeZone = false,
  tradingMode = "demo",
  isMobile = false,
  darkMode = true,
}: OrderPanelProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  // Core state - Get selectedExpiryMinutes and selectedAmount from store
  const storeSelectedExpiryMinutes = useBinaryStore((state) => state.selectedExpiryMinutes);
  const storeSelectedAmount = useBinaryStore((state) => state.selectedAmount);

  // Order type state from store
  const selectedOrderType = useBinaryStore((state) => state.selectedOrderType);
  const storeBarrier = useBinaryStore((state) => state.barrier);
  const storeStrikePrice = useBinaryStore((state) => state.strikePrice);
  const storePayoutPerPoint = useBinaryStore((state) => state.payoutPerPoint);
  const setOrderTypeInStore = useBinaryStore((state) => state.setOrderType);
  const setBarrierInStore = useBinaryStore((state) => state.setBarrier);
  const setStrikePriceInStore = useBinaryStore((state) => state.setStrikePrice);
  const setPayoutPerPointInStore = useBinaryStore((state) => state.setPayoutPerPoint);
  const setStoreSelectedAmount = useBinaryStore((state) => state.setSelectedAmount);
  const setStoreSelectedExpiryMinutes = useBinaryStore((state) => state.setSelectedExpiryMinutes);
  const completedOrders = useBinaryStore((state) => state.completedOrders);

  // Get selected barrier/strike level for profit calculation
  const selectedBarrierLevel = useBinaryStore((state) => state.selectedBarrierLevel);
  const selectedStrikeLevel = useBinaryStore((state) => state.selectedStrikeLevel);
  const getProfitForSelectedLevel = useBinaryStore((state) => state.getProfitForSelectedLevel);

  // Market data for validation
  const binaryMarkets = useBinaryStore((state) => state.binaryMarkets);
  const currentSymbol = useBinaryStore((state) => state.currentSymbol);

  // Use store values as initial state and sync with it
  const [amount, setInternalAmount] = useState<number>(storeSelectedAmount || 1000);
  const [expiryMinutes, setInternalExpiryMinutes] = useState<number>(storeSelectedExpiryMinutes || 5);
  const [expiryTime, setExpiryTime] = useState<string>("00:00");
  const [pendingSide, setPendingSide] = useState<OrderSide | null>(null);
  const [timeToNextExpiry, setTimeToNextExpiry] = useState<string>("00:00");

  // Custom setter that updates both internal state, store, and notifies parent
  const setAmount = useCallback((newAmount: number) => {
    setInternalAmount(newAmount);
    setStoreSelectedAmount(newAmount);
  }, [setStoreSelectedAmount]);

  // Custom setter that updates both internal state, store, and notifies parent
  const setExpiryMinutes = useCallback((minutes: number) => {
    setInternalExpiryMinutes(minutes);
    setStoreSelectedExpiryMinutes(minutes);
    if (onExpiryChange) {
      onExpiryChange(minutes);
    }
  }, [onExpiryChange, setStoreSelectedExpiryMinutes]);

  // UI state
  const [showAmountDropdown, setShowAmountDropdown] = useState<boolean>(false);
  const [showExpiryDropdown, setShowExpiryDropdown] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [orderPlacementError, setOrderPlacementError] = useState<string | null>(
    null
  );
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Advanced trading state
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(80);
  const [stopLossPercent, setStopLossPercent] = useState<number>(50);

  // One-click trading
  const oneClickTrading = useOneClickTrading(balance * 0.5); // Max 50% of balance for one-click

  // Martingale mode
  const martingale = useMartingale(amount);

  // Audio feedback - uses global settings store
  const audioConfig = useTradingSettingsStore((state) => state.audio);
  const audioFeedbackRef = useRef<AudioFeedback | null>(null);

  // Initialize audio feedback
  useEffect(() => {
    audioFeedbackRef.current = new AudioFeedback(audioConfig);
    return () => {
      audioFeedbackRef.current?.dispose();
    };
  }, []);

  // Sync audio config when it changes
  useEffect(() => {
    if (audioFeedbackRef.current) {
      audioFeedbackRef.current.setConfig(audioConfig);
    }
  }, [audioConfig]);

  // Calculate trading statistics for smart suggestions
  const tradingStats = useMemo(() => {
    // Get recent trade amounts (last 10 trades)
    const recentAmounts = completedOrders.slice(0, 10).map((order) => order.amount);

    // Calculate win/loss streak
    let winStreak = 0;
    let lossStreak = 0;

    for (const order of completedOrders) {
      if (order.status === "WIN") {
        if (lossStreak === 0) winStreak++;
        else break;
      } else {
        if (winStreak === 0) lossStreak++;
        else break;
      }
    }

    // Calculate win rate, avg profit, avg loss for position sizing
    const wins = completedOrders.filter(o => o.status === "WIN");
    const losses = completedOrders.filter(o => o.status === "LOSS");
    const winRate = completedOrders.length > 0 ? (wins.length / completedOrders.length) * 100 : 55;
    const avgProfit = wins.length > 0 ? wins.reduce((sum, o) => sum + (o.profit || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, o) => sum + Math.abs(o.profit || 0), 0) / losses.length : 0;

    return { recentAmounts, winStreak, lossStreak, winRate, avgProfit, avgLoss };
  }, [completedOrders]);

  // Get current market for amount validation
  const currentMarket = useMemo(() => {
    return binaryMarkets.find(m =>
      m.symbol === currentSymbol ||
      `${m.currency}/${m.pair}` === currentSymbol
    );
  }, [binaryMarkets, currentSymbol]);

  // Extract market min/max amounts from metadata
  const marketMinAmount = useMemo(() => {
    if (!currentMarket?.metadata) return 100;
    const metadata = typeof currentMarket.metadata === 'string'
      ? JSON.parse(currentMarket.metadata)
      : currentMarket.metadata;
    return Number(metadata?.limits?.amount?.min || 100);
  }, [currentMarket]);

  const marketMaxAmount = useMemo(() => {
    if (!currentMarket?.metadata) return balance;
    const metadata = typeof currentMarket.metadata === 'string'
      ? JSON.parse(currentMarket.metadata)
      : currentMarket.metadata;
    return Number(metadata?.limits?.amount?.max || 100000);
  }, [currentMarket, balance]);

  // Binary durations - use store directly as single source of truth
  // This will automatically re-render when store durations change
  const storeBinaryDurations = useBinaryStore((state) => state.binaryDurations);
  const storeIsLoadingDurations = useBinaryStore((state) => state.isLoadingDurations);

  // Convert store durations to local format - MEMOIZED to prevent infinite loops
  const binaryDurations: BinaryDurationAttributes[] = useMemo(() =>
    storeBinaryDurations.map((d) => ({
      id: d.id,
      duration: d.duration,
      profitPercentageRiseFall: d.profitPercentageRiseFall,
      profitPercentageHigherLower: d.profitPercentageHigherLower,
      profitPercentageTouchNoTouch: d.profitPercentageTouchNoTouch,
      profitPercentageCallPut: d.profitPercentageCallPut,
      profitPercentageTurbo: d.profitPercentageTurbo,
      profitPercentage: d.profitPercentage,
      status: d.status,
    })),
    [storeBinaryDurations]
  );

  // Trading templates
  const [templates, setTemplates] = useState<
    Array<{
      name: string;
      amount: number;
      expiryMinutes: number;
      riskPercent: number;
      takeProfitPercent: number;
      stopLossPercent: number;
    }>
  >([
    {
      name: "Conservative",
      amount: 500,
      expiryMinutes: 5,
      riskPercent: 1,
      takeProfitPercent: 50,
      stopLossPercent: 25,
    },
    {
      name: "Balanced",
      amount: 1000,
      expiryMinutes: 5,
      riskPercent: 2,
      takeProfitPercent: 80,
      stopLossPercent: 50,
    },
    {
      name: "Aggressive",
      amount: 2000,
      expiryMinutes: 1,
      riskPercent: 5,
      takeProfitPercent: 100,
      stopLossPercent: 75,
    },
  ]);

  const amountButtonRef = useRef<HTMLDivElement>(null);
  const expiryButtonRef = useRef<HTMLDivElement>(null);

  // Refs to track previous values and prevent unnecessary updates
  const prevExpiryMinutesRef = useRef<number>(expiryMinutes);
  const prevCandleDataLengthRef = useRef<number>(0);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Preset expiry times in minutes with their profit percentages
  const [presetExpiryTimes, setPresetExpiryTimes] = useState<
    Array<{
      minutes: number;
      display: string;
      profit: number;
      remaining: string;
      expiryTime: Date;
    }>
  >([]);

  // Calculate profit percentage and amount based on selected expiry, order type, and barrier/strike level
  const selectedDuration = binaryDurations.find(
    (d) => d.duration === expiryMinutes
  );

  // Get base profit from duration (includes duration adjustment)
  const baseProfitFromDuration = selectedDuration
    ? getProfitPercentageForType(selectedDuration, selectedOrderType)
    : 85;

  // Get binarySettings to access base order type profits for adjustment calculation
  const binarySettings = useBinaryStore((state) => state.binarySettings);

  // Calculate the duration adjustment ratio for barrier/strike types
  // This ratio represents how much the duration adjustments affect the profit
  const durationAdjustmentRatio = useMemo(() => {
    if (!binarySettings || !selectedDuration) return 1;

    // Get the base profit for the order type (before any duration adjustments)
    const orderTypeConfig = binarySettings.orderTypes[selectedOrderType];
    if (!orderTypeConfig) return 1;

    const baseProfit = orderTypeConfig.profitPercentage;
    if (baseProfit <= 0) return 1;

    // The ratio is: adjustedProfit / baseProfit
    // This tells us the multiplier to apply to barrier/strike level profits
    return baseProfitFromDuration / baseProfit;
  }, [binarySettings, selectedDuration, selectedOrderType, baseProfitFromDuration]);

  // For barrier-based types (HIGHER_LOWER, TOUCH_NO_TOUCH), use barrier level profit WITH duration adjustment
  // For CALL_PUT, use strike level profit WITH duration adjustment
  // For RISE_FALL, use duration profit (already adjusted)
  // For TURBO, profit is variable based on price movement (not a fixed percentage)
  const profitPercentage = useMemo(() => {
    // TURBO is special - profit is based on distance moved × payoutPerPoint, not a fixed percentage
    // We use barrier level profit as a proxy for display, but actual profit varies
    if (selectedOrderType === 'TURBO') {
      // For TURBO, calculate estimated profit percentage based on barrier distance and payout
      if (storeBarrier && storePayoutPerPoint && currentPrice > 0 && amount > 0) {
        const distance = Math.abs(storeBarrier - currentPrice);
        const estimatedProfit = distance * storePayoutPerPoint;
        // Convert to percentage for display
        return Math.round((estimatedProfit / amount) * 100);
      }
      // Fallback to barrier level profit with duration adjustment
      const barrierProfit = selectedBarrierLevel?.profitPercent || baseProfitFromDuration;
      return Math.round(barrierProfit * durationAdjustmentRatio);
    }
    // Check if order type requires barrier and we have a selected barrier level
    if (['HIGHER_LOWER', 'TOUCH_NO_TOUCH'].includes(selectedOrderType) && selectedBarrierLevel) {
      // Apply duration adjustment to barrier level profit
      return Math.round(selectedBarrierLevel.profitPercent * durationAdjustmentRatio);
    }
    // Check if order type requires strike price and we have a selected strike level
    if (selectedOrderType === 'CALL_PUT' && selectedStrikeLevel) {
      // Apply duration adjustment to strike level profit
      return Math.round(selectedStrikeLevel.profitPercent * durationAdjustmentRatio);
    }
    // Default to duration-based profit (already has adjustment applied)
    return baseProfitFromDuration;
  }, [selectedOrderType, selectedBarrierLevel, selectedStrikeLevel, baseProfitFromDuration, durationAdjustmentRatio, storeBarrier, storePayoutPerPoint, currentPrice, amount]);

  // For TURBO, profit amount is distance × payoutPerPoint, not percentage-based
  const profitAmount = useMemo(() => {
    if (selectedOrderType === 'TURBO' && storeBarrier && storePayoutPerPoint && currentPrice > 0) {
      const distance = Math.abs(storeBarrier - currentPrice);
      return distance * storePayoutPerPoint;
    }
    return (amount * profitPercentage) / 100;
  }, [selectedOrderType, storeBarrier, storePayoutPerPoint, currentPrice, amount, profitPercentage]);

  // Track candle data length changes (for debugging if needed)
  useEffect(() => {
    const currentCandleLength = candleData?.length || 0;
    if (currentCandleLength !== prevCandleDataLengthRef.current) {
      prevCandleDataLengthRef.current = currentCandleLength;
    }
  }, [candleData, symbol]);

  // Track completed orders to update martingale state
  const prevCompletedOrdersLengthRef = useRef(completedOrders.length);
  useEffect(() => {
    if (!martingale.state.enabled) return;

    // Check if new orders were completed
    if (completedOrders.length > prevCompletedOrdersLengthRef.current) {
      // Get the newly completed orders
      const newOrdersCount = completedOrders.length - prevCompletedOrdersLengthRef.current;
      const newOrders = completedOrders.slice(0, newOrdersCount);

      // Process each new order
      for (const order of newOrders) {
        const isWin = order.status === "WIN";
        martingale.processTradeResult(isWin, order.amount);
      }
    }

    prevCompletedOrdersLengthRef.current = completedOrders.length;
  }, [completedOrders, martingale]);

  // Sync loading state from store
  const [isLoadingDurationsLocal, setIsLoadingDurationsLocal] = useState(true);

  // Sync loading state - derived from store but with local override when we have data
  useEffect(() => {
    if (binaryDurations.length > 0) {
      setIsLoadingDurationsLocal(false);
    } else {
      setIsLoadingDurationsLocal(storeIsLoadingDurations);
    }
  }, [binaryDurations.length, storeIsLoadingDurations]);

  // Track if we've already set the default expiry to prevent re-setting
  const hasSetDefaultExpiryRef = useRef(false);

  // Set default expiry when durations first become available
  useEffect(() => {
    if (binaryDurations.length === 0) return;
    if (hasSetDefaultExpiryRef.current) return;
    if (storeSelectedExpiryMinutes) return; // Store already has a value

    hasSetDefaultExpiryRef.current = true;
    const activeDurations = binaryDurations.filter((d) => d.status === true);
    const defaultDuration = activeDurations.length > 0 ? activeDurations[0] : binaryDurations[0];
    setExpiryMinutes(defaultDuration.duration);
  }, [binaryDurations, storeSelectedExpiryMinutes, setExpiryMinutes]);

  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Sync with store changes - when store value changes, update internal state
  useEffect(() => {
    if (storeSelectedExpiryMinutes && storeSelectedExpiryMinutes !== expiryMinutes) {
      setInternalExpiryMinutes(storeSelectedExpiryMinutes);
    }
  }, [storeSelectedExpiryMinutes]);

  // Sync amount with store changes
  useEffect(() => {
    if (storeSelectedAmount && storeSelectedAmount !== amount) {
      setInternalAmount(storeSelectedAmount);
    }
  }, [storeSelectedAmount]);

  // Calculate expiry times based on adjusted current time and fetched durations
  const calculateExpiryTimes = useCallback(() => {
    if (!binaryDurations.length) {
      return [];
    }

    // Use adjusted time to match chart display
    const now = getChartSynchronizedTime();

    // Calculate remaining time
    const calculateRemaining = (date: Date) => {
      const diff = date.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Calculate exact expiry times based on current time and fetched durations
    // Prefer active durations, but fallback to all durations if none are active
    const activeDurations = binaryDurations.filter(
      (duration) => duration.status === true
    );
    const durationsToUse = activeDurations.length > 0 ? activeDurations : binaryDurations;

    const expiryTimes = durationsToUse
      .map((duration) => {
        // Calculate the next expiry time based on the interval
        const nextExpiry = calculateNextExpiryTime(duration.duration);

        return {
          minutes: duration.duration,
          display: formatChartTime(nextExpiry),
          // Use getProfitPercentageForType to get correct profit for selected order type
          profit: getProfitPercentageForType(duration, selectedOrderType),
          remaining: calculateRemaining(nextExpiry),
          expiryTime: nextExpiry,
        };
      })
      .sort((a, b) => a.minutes - b.minutes); // Sort by duration

    return expiryTimes;
  }, [binaryDurations, selectedOrderType]);

  // Refs for timer callback to avoid recreating the timer when these values change
  const expiryMinutesRef = useRef(expiryMinutes);
  const calculateExpiryTimesRef = useRef(calculateExpiryTimes);

  // Keep refs updated
  useEffect(() => {
    expiryMinutesRef.current = expiryMinutes;
  }, [expiryMinutes]);

  useEffect(() => {
    calculateExpiryTimesRef.current = calculateExpiryTimes;
  }, [calculateExpiryTimes]);

  // FIXED: Update expiry times every second - separated from error handling
  // Using refs for dynamic values prevents timer restart when they change
  useEffect(() => {
    if (binaryDurations.length === 0) return;

    // Clear any existing timer before setting up new one
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // CRITICAL: Update ref immediately before using it
    // This ensures we have the latest calculateExpiryTimes function with current binaryDurations
    calculateExpiryTimesRef.current = calculateExpiryTimes;

    // Initial calculation - use the function directly to ensure we have current binaryDurations
    const initialExpiryTimes = calculateExpiryTimes();
    setPresetExpiryTimes(initialExpiryTimes);

    // CRITICAL: Also set the initial expiryTime display value
    // This ensures the display shows the correct time immediately when durations load
    if (initialExpiryTimes.length > 0) {
      // Update ref to current value before using it (in case effect order is different)
      expiryMinutesRef.current = expiryMinutes;

      const currentExpiry = expiryMinutes; // Use state directly, not ref
      const matchingExpiry = initialExpiryTimes.find((item) => item.minutes === currentExpiry);
      if (matchingExpiry) {
        setExpiryTime(matchingExpiry.display);
      } else {
        // If current expiryMinutes doesn't match any preset, use the first one
        // Also update expiryMinutes to match the first preset
        const firstPreset = initialExpiryTimes[0];
        setExpiryTime(firstPreset.display);
        setExpiryMinutes(firstPreset.minutes);
        expiryMinutesRef.current = firstPreset.minutes;
      }
    }

    // Update every second to keep times in sync with chart
    const updateTimesAndExpiry = () => {
      const now = Date.now();
      // Only update if at least 500ms have passed since the last update
      if (now - lastUpdateTimeRef.current >= 500) {
        lastUpdateTimeRef.current = now;

        const updatedExpiryTimes = calculateExpiryTimesRef.current();
        setPresetExpiryTimes(updatedExpiryTimes);

        // Also update expiryTime display (it changes as time passes - e.g., "10:30 AM" -> "10:31 AM")
        const currentExpiry = expiryMinutesRef.current;
        const matchingExpiry = updatedExpiryTimes.find((item) => item.minutes === currentExpiry);
        if (matchingExpiry) {
          setExpiryTime(matchingExpiry.display);
        }

        // Update time to next expiry using ref for current expiry minutes
        const chartTime = getChartSynchronizedTime();
        const nextExpiry = calculateNextExpiryTime(currentExpiry);
        const timeToExpiry = nextExpiry.getTime() - chartTime.getTime();
        const minutes = Math.floor(timeToExpiry / 60000);
        const seconds = Math.floor((timeToExpiry % 60000) / 1000);
        setTimeToNextExpiry(
          `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }

      // Schedule next update
      updateTimerRef.current = setTimeout(updateTimesAndExpiry, 1000);
    };

    // Start the update cycle
    updateTimerRef.current = setTimeout(updateTimesAndExpiry, 1000);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
   
  }, [binaryDurations.length, calculateExpiryTimes]); // Restart when durations become available

  // FIXED: Separate effect for error message clearing
  useEffect(() => {
    if (!orderPlacementError) return;

    const errorTimer = setTimeout(() => setOrderPlacementError(null), 5000);
    return () => clearTimeout(errorTimer);
  }, [orderPlacementError]);

  // Expiry time navigation
  const increaseExpiry = useCallback(() => {
    const currentIndex = presetExpiryTimes.findIndex(
      (item) => item.minutes === expiryMinutes
    );
    if (
      presetExpiryTimes.length > 0 &&
      currentIndex < presetExpiryTimes.length - 1
    ) {
      const newMinutes = presetExpiryTimes[currentIndex + 1].minutes;
      setExpiryMinutes(newMinutes);
      setExpiryTime(presetExpiryTimes[currentIndex + 1].display);
    }
  }, [expiryMinutes, presetExpiryTimes, setExpiryMinutes]);

  const decreaseExpiry = useCallback(() => {
    const currentIndex = presetExpiryTimes.findIndex(
      (item) => item.minutes === expiryMinutes
    );
    if (presetExpiryTimes.length > 0 && currentIndex > 0) {
      const newMinutes = presetExpiryTimes[currentIndex - 1].minutes;
      setExpiryMinutes(newMinutes);
      setExpiryTime(presetExpiryTimes[currentIndex - 1].display);
    }
  }, [expiryMinutes, presetExpiryTimes, setExpiryMinutes]);

  // Update expiry time display
  useEffect(() => {
    if (presetExpiryTimes.length > 0) {
      const selectedExpiry = presetExpiryTimes.find(
        (item) => item.minutes === expiryMinutes
      );
      if (selectedExpiry) {
        setExpiryTime(selectedExpiry.display);
      }
    }
  }, [expiryMinutes, presetExpiryTimes]);

  // Add a separate effect that only runs when expiryMinutes changes
  useEffect(() => {
    // Only notify parent if the value has actually changed
    if (
      onExpiryChange &&
      expiryMinutes > 0 &&
      expiryMinutes !== prevExpiryMinutesRef.current
    ) {
      prevExpiryMinutesRef.current = expiryMinutes;
      onExpiryChange(expiryMinutes);
    }
  }, [expiryMinutes, onExpiryChange]);

  // Initialize with first option when presetExpiryTimes changes from empty to populated
  // Also handle case when expiryMinutes doesn't match any preset
  useEffect(() => {
    if (presetExpiryTimes.length === 0) return;

    const matchingPreset = presetExpiryTimes.find((item) => item.minutes === expiryMinutes);

    if (matchingPreset) {
      // expiryMinutes matches a preset - just ensure expiryTime is set
      if (expiryTime === "00:00") {
        setExpiryTime(matchingPreset.display);
      }
    } else {
      // expiryMinutes doesn't match any preset - find closest duration
      const closestDuration = presetExpiryTimes.reduce((prev, curr) => {
        return Math.abs(curr.minutes - expiryMinutes) < Math.abs(prev.minutes - expiryMinutes)
          ? curr
          : prev;
      });

      if (closestDuration) {
        setExpiryMinutes(closestDuration.minutes);
        setExpiryTime(closestDuration.display);
      }
    }
  }, [presetExpiryTimes.length, expiryMinutes]); // Depend on both to catch mismatches

  // Add event listener for window resize to update dropdown positions
  useEffect(() => {
    const handleResize = () => {
      // Force re-render to update dropdown positions
      if (showAmountDropdown || showExpiryDropdown) {
        setIsMounted(false);
        setTimeout(() => setIsMounted(true), 0);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [showAmountDropdown, showExpiryDropdown]);

  // Handle amount changes with market min/max validation
  const increaseAmount = useCallback(() => {
    if (amount < Math.min(balance, marketMaxAmount)) {
      setAmount(Math.min(amount + 100, balance, marketMaxAmount));
    }
  }, [amount, balance, marketMaxAmount, setAmount]);

  const decreaseAmount = useCallback(() => {
    if (amount > marketMinAmount) {
      setAmount(Math.max(marketMinAmount, amount - 100));
    }
  }, [amount, marketMinAmount, setAmount]);

  const setQuickAmount = useCallback((newAmount: number) =>
    setAmount(Math.min(newAmount, balance, marketMaxAmount)), [balance, marketMaxAmount, setAmount]);

  // Apply template
  const applyTemplate = (template: (typeof templates)[0]) => {
    setAmount(template.amount);
    setExpiryMinutes(template.expiryMinutes);
    setRiskPercent(template.riskPercent);
    setTakeProfitPercent(template.takeProfitPercent);
    setStopLossPercent(template.stopLossPercent);
  };

  // Handle order placement with confirmation or one-click
  const handlePlaceOrder = useCallback(async (side: OrderSide) => {
    // Calculate trade amount (apply martingale if enabled)
    let tradeAmount = amount;
    if (martingale.state.enabled) {
      const { amount: martingaleAmount, isLimited, limitReason } = martingale.getCurrentAmount(balance);
      tradeAmount = martingaleAmount;

      // Warn if limited
      if (isLimited) {
        toast.warning(
          limitReason === "max_increases_reached"
            ? t("martingale_max_reached") || "Martingale max level reached, resetting to base"
            : limitReason === "stop_loss_limit"
              ? t("martingale_stop_loss") || "Stop loss limit reached"
              : t("martingale_balance_limit") || "Balance limit reached",
          { duration: 3000 }
        );
      }
    }

    // Market order - check if we're in the safe zone
    if (isInSafeZone) {
      setOrderPlacementError(t("cannot_place_orders_within_15_seconds_of_expiry"));
      return;
    }

    // Validate amount is within market limits
    if (tradeAmount < marketMinAmount) {
      setOrderPlacementError(t("amount_below_minimum") || `Amount must be at least ${marketMinAmount}`);
      return;
    }
    if (tradeAmount > marketMaxAmount) {
      setOrderPlacementError(t("amount_above_maximum") || `Amount cannot exceed ${marketMaxAmount}`);
      return;
    }

    // Check if one-click trading is enabled and amount is within limit
    if (oneClickTrading.canOneClick(tradeAmount)) {
      // Execute trade immediately
      setIsPlacingOrder(true);
      try {
        const success = await onPlaceOrder(side, tradeAmount, expiryMinutes);
        if (success) {
          // Play order placed sound
          audioFeedbackRef.current?.playOrderPlaced();

          // Show success toast
          toast.success(
            tCommon("order_placed_successfully") || `${side} order placed for ${tradeAmount} USDT`,
            {
              duration: 2000,
              icon: <Zap className="w-4 h-4 text-yellow-500" />,
            }
          );

          // Send notification
          notifyOrderPlaced({
            orderId: `order-${Date.now()}`,
            symbol: symbol as string,
            side,
            amount: tradeAmount,
          });
        } else {
          // Play error sound
          audioFeedbackRef.current?.playError();
          setOrderPlacementError(
            t("order_placement_failed") || "Order placement failed - check your balance or try again"
          );
        }
      } catch (error) {
        console.error("Error placing order:", error);
        audioFeedbackRef.current?.playError();
        setOrderPlacementError(t("order_placement_error") || "Order placement failed - please try again");
      } finally {
        setIsPlacingOrder(false);
      }
      return;
    }

    // Show the advanced confirmation modal
    setPendingSide(side);
    setShowConfirmation(true);
  }, [isInSafeZone, t, oneClickTrading, amount, onPlaceOrder, expiryMinutes, martingale, balance, marketMinAmount, marketMaxAmount]);

  const confirmOrder = useCallback(async () => {
    if (pendingSide) {
      // Calculate trade amount (apply martingale if enabled)
      let tradeAmount = amount;
      if (martingale.state.enabled) {
        const { amount: martingaleAmount } = martingale.getCurrentAmount(balance);
        tradeAmount = martingaleAmount;
      }

      setIsPlacingOrder(true);
      try {
        const success = await onPlaceOrder(pendingSide, tradeAmount, expiryMinutes);
        if (success) {
          // Play order placed sound
          audioFeedbackRef.current?.playOrderPlaced();

          // Send notification
          notifyOrderPlaced({
            orderId: `order-${Date.now()}`,
            symbol: symbol as string,
            side: pendingSide,
            amount: tradeAmount,
          });
        } else {
          audioFeedbackRef.current?.playError();
          setOrderPlacementError(
            "Order placement failed - check your balance or try again"
          );
        }
      } catch (error) {
        console.error("Error placing order:", error);
        audioFeedbackRef.current?.playError();
        setOrderPlacementError("Order placement failed - please try again");
      } finally {
        setIsPlacingOrder(false);
      }
      setShowConfirmation(false);
      setPendingSide(null);
    }
  }, [pendingSide, onPlaceOrder, amount, expiryMinutes, martingale, balance, symbol]);

  const cancelOrder = useCallback(() => {
    setShowConfirmation(false);
    setPendingSide(null);
  }, []);

  // Render confirmation modal portal
  const renderConfirmationPortal = () => {
    if (!isMounted || !showConfirmation || !pendingSide) return null;

    return createPortal(
      <AdvancedTradeConfirmation
        isOpen={showConfirmation}
        onClose={cancelOrder}
        onConfirm={confirmOrder}
        type={pendingSide === "RISE" ? "CALL" : "PUT"}
        amount={amount}
        symbol={symbol}
        expiryMinutes={expiryMinutes}
        currentPrice={currentPrice}
        profitPercentage={profitPercentage}
        className="z-[9999]"
        darkMode={darkMode}
        priceMovement={priceMovement}
      />,
      document.body
    );
  };

  // Skeleton loader - uses Tailwind dark: variant for proper theme support during SSR
  // This ensures skeleton follows the theme immediately without JavaScript
  const renderSkeleton = () => (
    <div className="space-y-2">
      {/* Order Type button skeleton - compact version matching actual */}
      <div className="w-full px-2.5 py-2 rounded-lg border bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-50 dark:bg-blue-500/20">
            <div className="w-3.5 h-3.5" />
          </div>
          <div className="h-3.5 w-14 rounded bg-gray-200 dark:bg-zinc-700" />
        </div>
      </div>

      {/* Amount and Expiry skeleton row */}
      <div className="flex gap-2">
        {/* Amount skeleton - matches AmountSelector exactly */}
        <div className="relative flex-1 rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800/60">
          <div className="p-2">
            {/* Header: label + buttons - text-[10px] uppercase = ~10px height */}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">&nbsp;</span>
              <div className="flex items-center gap-0.5">
                <div className="p-1 rounded bg-gray-200 dark:bg-zinc-800">
                  <div className="w-[10px] h-[10px]" />
                </div>
                <div className="p-1 rounded bg-gray-200 dark:bg-zinc-800">
                  <div className="w-[10px] h-[10px]" />
                </div>
              </div>
            </div>
            {/* Amount value row - text-lg = 18px line height */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-transparent">000</span>
              <span className="text-[11px] text-transparent">USDT</span>
              <div className="w-3 h-3 rounded ml-auto bg-gray-300 dark:bg-zinc-700" />
            </div>
            {/* Progress bar section */}
            <div className="mt-1.5">
              <div className="h-0.5 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800">
                <div className="h-full w-[10%] rounded-full bg-emerald-500" />
              </div>
              <div className="text-[9px] mt-0.5 text-gray-400 dark:text-zinc-600">
                <span className="text-emerald-500 font-medium">&nbsp;</span>
              </div>
            </div>
          </div>
        </div>
        {/* Expiry skeleton - matches ExpirySelector exactly */}
        <div className="relative flex-1 rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800/60">
          <div className="p-2">
            {/* Header: label + buttons */}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">&nbsp;</span>
              <div className="flex items-center gap-0.5">
                <div className="p-1 rounded bg-gray-200 dark:bg-zinc-800">
                  <div className="w-[10px] h-[10px]" />
                </div>
                <div className="p-1 rounded bg-gray-200 dark:bg-zinc-800">
                  <div className="w-[10px] h-[10px]" />
                </div>
              </div>
            </div>
            {/* Time value row */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-transparent">00:00 PM</span>
              <div className="w-3 h-3 rounded ml-auto bg-gray-300 dark:bg-zinc-700" />
            </div>
            {/* Duration + profit badge */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-400 dark:text-zinc-600">
                <span className="text-blue-500 font-medium">&nbsp;</span>
              </span>
              <div className="h-[18px] w-12 rounded px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Profit display skeleton - matches ProfitDisplay exactly */}
      <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800/60">
        {/* Profit row */}
        <div className="px-2.5 py-2 bg-emerald-50/50 dark:bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-emerald-300 dark:bg-emerald-500/40" />
              <span className="text-[10px] font-medium uppercase text-transparent">POTENTIAL PROFIT</span>
            </div>
            <span className="text-[11px] font-bold text-transparent bg-emerald-500/10 px-1.5 py-0.5 rounded">+90%</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-[10px] text-transparent">Win</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold text-transparent">+90.00</span>
              <span className="text-[10px] text-transparent">USDT</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden mt-1.5 bg-gray-200 dark:bg-zinc-800">
            <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
          </div>
        </div>
        {/* Loss row */}
        <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-gray-200 dark:border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-400 dark:bg-zinc-600" />
            <span className="text-[10px] text-transparent">Loss</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-semibold text-transparent">-100.00</span>
            <span className="text-[10px] text-transparent">USDT</span>
          </div>
        </div>
        {/* Risk/Reward row */}
        <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-gray-100 dark:border-zinc-800/30 bg-gray-50/50 dark:bg-zinc-900/50">
          <span className="text-[9px] uppercase tracking-wide text-transparent">RISK/REWARD</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-1 rounded-full bg-red-100 dark:bg-red-500/30" />
              <div className="w-4 h-1 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[10px] font-medium text-transparent">1:0.9</span>
          </div>
        </div>
      </div>

      {/* Templates skeleton - matches TemplatesSelector exactly */}
      <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/40">
        {/* Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800/30">
          <div className="flex items-center gap-1.5">
            <div className="w-[11px] h-[11px] rounded bg-gray-400 dark:bg-zinc-500" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-transparent">TEMPLATES</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-transparent">Presets</span>
            <div className="w-[10px] h-[10px] rounded bg-gray-400 dark:bg-zinc-600" />
          </div>
        </div>
        {/* Template cards */}
        <div className="grid grid-cols-3 gap-1.5 p-2 pt-1.5">
          {/* Blue template */}
          <div className="rounded-lg p-1.5 bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-50 dark:bg-blue-500/10">
                <div className="w-3.5 h-3.5 rounded bg-blue-300 dark:bg-blue-500/40" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] font-medium text-transparent">Safe</div>
                <div className="text-[9px] text-transparent">$500</div>
              </div>
            </div>
          </div>
          {/* Amber template */}
          <div className="rounded-lg p-1.5 bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-amber-50 dark:bg-amber-500/10">
                <div className="w-3.5 h-3.5 rounded bg-amber-300 dark:bg-amber-500/40" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] font-medium text-transparent">Balanced</div>
                <div className="text-[9px] text-transparent">$1000</div>
              </div>
            </div>
          </div>
          {/* Rose template */}
          <div className="rounded-lg p-1.5 bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded flex items-center justify-center bg-rose-50 dark:bg-rose-500/10">
                <div className="w-3.5 h-3.5 rounded bg-rose-300 dark:bg-rose-500/40" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] font-medium text-transparent">Risk</div>
                <div className="text-[9px] text-transparent">$2000</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action buttons skeleton - matches TradingShortcuts & RiskCalculator */}
      <div className="grid grid-cols-2 gap-2">
        {/* Keys button skeleton */}
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/50">
          <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10">
            <div className="w-3 h-3 rounded bg-emerald-300 dark:bg-emerald-500/40" />
          </div>
          <span className="text-[10px] font-semibold text-transparent">Keys</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-gray-200 dark:bg-zinc-800 text-transparent">K</kbd>
        </div>
        {/* Risk button skeleton */}
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/50">
          <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-500/10">
            <div className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-500/40" />
          </div>
          <span className="text-[10px] font-semibold text-transparent">Risk</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-gray-200 dark:bg-zinc-800 text-transparent">2%</span>
        </div>
      </div>

      {/* Next expiry skeleton - matches the next expiry section */}
      <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-gray-100 dark:bg-zinc-900/30 border border-gray-200 dark:border-zinc-800/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-400 dark:bg-zinc-500" />
          <span className="text-[10px] font-medium uppercase text-transparent">NEXT EXPIRY IN</span>
        </div>
        <div className="font-mono text-sm font-semibold px-2 py-0.5 rounded bg-white dark:bg-zinc-800/50 text-transparent">00:00</div>
      </div>
    </div>
  );

  return (
    <div
      data-tutorial="order-panel"
      className={`flex flex-col h-full relative z-10 overflow-hidden transition-colors duration-300 ${
        // Use Tailwind dark: variant for initial render to match skeleton theme
        // Then the JS-based classes take over after hydration
        isLoadingDurationsLocal
          ? "bg-white dark:bg-[#0a0a0a] text-zinc-800 dark:text-white"
          : darkMode
            ? "bg-[#0a0a0a] text-white"
            : "bg-white text-zinc-800"
      } ${
        isMobile
          ? "w-full"
          : `border-l w-[300px] ${
              isLoadingDurationsLocal
                ? "border-gray-200 dark:border-zinc-800/50"
                : darkMode ? "border-zinc-800/50" : "border-gray-200"
            }`
      }`}
    >

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto h-0 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <div className="p-2">
          {isLoadingDurationsLocal ? renderSkeleton() : (
            <div className="space-y-2">
                  {/* Order Type - Show selector only if multiple types enabled, otherwise just show label */}
                  {(() => {
                    const enabledTypes = useBinaryStore.getState().getEnabledOrderTypes();
                    const hasMultipleTypes = enabledTypes.length > 1;
                    const typeColors = ORDER_TYPE_COLORS[selectedOrderType];

                    if (hasMultipleTypes) {
                      // Show clickable button to open modal
                      return (
                        <button
                          onClick={() => setShowOrderTypeModal(true)}
                          className={`w-full px-2.5 py-2 rounded-lg border transition-all flex items-center justify-between ${
                            darkMode
                              ? `bg-slate-800/50 ${typeColors.border}/30 hover:${typeColors.border}/50 text-white`
                              : `bg-slate-50 ${typeColors.border}/30 hover:${typeColors.border}/50 text-slate-900`
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${
                              darkMode ? `${typeColors.bgDark} ${typeColors.textDark}` : `${typeColors.bg} ${typeColors.text}`
                            }`}>
                              <OrderTypeIcon orderType={selectedOrderType} size={14} />
                            </div>
                            <div className="text-xs font-medium">
                              {ORDER_TYPE_CONFIGS[selectedOrderType].label}
                            </div>
                          </div>
                          <svg
                            className={`w-3 h-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      );
                    } else if (enabledTypes.length === 1) {
                      // Show static label (non-clickable) for single type
                      return (
                        <div
                          className={`w-full px-2.5 py-2 rounded-lg border flex items-center gap-2 ${
                            darkMode
                              ? `bg-slate-800/30 ${typeColors.border}/20 text-white`
                              : `bg-slate-50/50 ${typeColors.border}/20 text-slate-900`
                          }`}
                        >
                          <div className={`p-1 rounded ${
                            darkMode ? `${typeColors.bgDark} ${typeColors.textDark}` : `${typeColors.bg} ${typeColors.text}`
                          }`}>
                            <OrderTypeIcon orderType={selectedOrderType} size={14} />
                          </div>
                          <div className="text-xs font-medium">
                            {ORDER_TYPE_CONFIGS[selectedOrderType].label}
                          </div>
                        </div>
                      );
                    }
                    // No types enabled - show nothing or error
                    return null;
                  })()}

                  {/* Amount and Expiry row */}
                  <div className="flex gap-2">
                    <div data-tutorial="amount-input" className="flex-1">
                    <AmountSelector
                      amount={amount}
                      balance={balance}
                      increaseAmount={increaseAmount}
                      decreaseAmount={decreaseAmount}
                      setAmount={setAmount}
                      showAmountDropdown={showAmountDropdown}
                      setShowAmountDropdown={setShowAmountDropdown}
                      amountButtonRef={amountButtonRef}
                      isMounted={isMounted}
                      isMobile={isMobile}
                      darkMode={darkMode}
                      symbol={symbol}
                      recentTradeAmounts={tradingStats.recentAmounts}
                      winStreak={tradingStats.winStreak}
                      lossStreak={tradingStats.lossStreak}
                      minAmount={marketMinAmount}
                      maxAmount={marketMaxAmount}
                    />
                    </div>

                    <div data-tutorial="expiry-selector" className="flex-1">
                    <ExpirySelector
                      expiryMinutes={expiryMinutes}
                      expiryTime={expiryTime}
                      increaseExpiry={increaseExpiry}
                      decreaseExpiry={decreaseExpiry}
                      setExpiryMinutes={setExpiryMinutes}
                      setExpiryTime={setExpiryTime}
                      showExpiryDropdown={showExpiryDropdown}
                      setShowExpiryDropdown={setShowExpiryDropdown}
                      expiryButtonRef={expiryButtonRef}
                      presetExpiryTimes={presetExpiryTimes}
                      isMobile={isMobile}
                      darkMode={darkMode}
                      // For barrier/strike-based types, show the level profit WITH duration adjustment
                      // For TURBO, show the calculated profit percentage based on barrier distance
                      profitOverride={
                        selectedOrderType === 'TURBO'
                          ? (storeBarrier && storePayoutPerPoint && currentPrice > 0 && amount > 0
                              ? Math.round((Math.abs(storeBarrier - currentPrice) * storePayoutPerPoint / amount) * 100)
                              : selectedBarrierLevel
                                ? Math.round(selectedBarrierLevel.profitPercent * durationAdjustmentRatio)
                                : null)
                          : ['HIGHER_LOWER', 'TOUCH_NO_TOUCH'].includes(selectedOrderType) && selectedBarrierLevel
                            ? Math.round(selectedBarrierLevel.profitPercent * durationAdjustmentRatio)
                            : selectedOrderType === 'CALL_PUT' && selectedStrikeLevel
                              ? Math.round(selectedStrikeLevel.profitPercent * durationAdjustmentRatio)
                              : null
                      }
                    />
                    </div>
                  </div>

                  {/* Profit display */}
                  <ProfitDisplay
                    profitPercentage={profitPercentage}
                    profitAmount={profitAmount}
                    amount={amount}
                    symbol={symbol}
                    darkMode={darkMode}
                  />

                  {/* Barrier Input (for HIGHER_LOWER, TOUCH_NO_TOUCH, TURBO) */}
                  {ORDER_TYPE_CONFIGS[selectedOrderType].requiresBarrier && (
                    <BarrierInput
                      orderType={selectedOrderType}
                      currentPrice={currentPrice}
                      barrier={storeBarrier}
                      onChange={setBarrierInStore}
                      darkMode={darkMode}
                      disabled={isInSafeZone || isLoadingDurationsLocal}
                    />
                  )}

                  {/* Strike Price Input (for CALL_PUT) */}
                  {ORDER_TYPE_CONFIGS[selectedOrderType].requiresStrikePrice && (
                    <StrikePriceInput
                      orderType={selectedOrderType}
                      currentPrice={currentPrice}
                      strikePrice={storeStrikePrice}
                      onChange={setStrikePriceInStore}
                      darkMode={darkMode}
                      disabled={isInSafeZone || isLoadingDurationsLocal}
                    />
                  )}

                  {/* Payout Per Point Input (for TURBO) */}
                  {ORDER_TYPE_CONFIGS[selectedOrderType].requiresPayoutPerPoint && (
                    <PayoutPerPointInput
                      orderType={selectedOrderType}
                      currentPrice={currentPrice}
                      payoutPerPoint={storePayoutPerPoint}
                      barrier={storeBarrier}
                      onChange={setPayoutPerPointInStore}
                      darkMode={darkMode}
                      disabled={isInSafeZone || isLoadingDurationsLocal}
                    />
                  )}

                  {/* Templates */}
                  <TemplatesSelector
                    templates={templates}
                    applyTemplate={applyTemplate}
                    darkMode={darkMode}
                  />

                  {/* Quick actions - Keys and Risk */}
                  <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {!isMobile && (
                      <TradingShortcuts
                        onPlaceOrder={(type) =>
                          handlePlaceOrder(type === "CALL" ? "RISE" : "FALL")
                        }
                        onIncreaseAmount={increaseAmount}
                        onDecreaseAmount={decreaseAmount}
                        onQuickAmount={setQuickAmount}
                        darkMode={darkMode}
                      />
                    )}
                    <RiskCalculator
                      balance={balance}
                      onSetAmount={setQuickAmount}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Time to next expiry - Compact */}
                  <div
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg ${
                      darkMode
                        ? "bg-zinc-900/30 border border-zinc-800/30"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Timer size={12} className={darkMode ? "text-zinc-500" : "text-gray-400"} />
                      <span className={`text-[10px] font-medium uppercase ${
                        darkMode ? "text-zinc-500" : "text-gray-500"
                      }`}>
                        {t("next_expiry_in")}
                      </span>
                    </div>
                    <div className={`font-mono text-sm font-semibold px-2 py-0.5 rounded ${
                      darkMode
                        ? "bg-zinc-800/50 text-white"
                        : "bg-white text-gray-800"
                    }`}>
                      {timeToNextExpiry}
                    </div>
                  </div>

              {/* Error message */}
              {orderPlacementError && (
                <div className={`px-2 py-1.5 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 ${
                  darkMode
                    ? "bg-red-950/30 border border-red-900/40"
                    : "bg-red-50 border border-red-200"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span className={`text-[10px] ${darkMode ? "text-red-400" : "text-red-600"}`}>
                    {orderPlacementError}
                  </span>
                </div>
              )}

              {/* Safe zone warning */}
              {isInSafeZone && (
                <div className={`px-2 py-1.5 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 ${
                  darkMode
                    ? "bg-amber-950/30 border border-amber-900/40"
                    : "bg-amber-50 border border-amber-200"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span className={`text-[10px] ${darkMode ? "text-amber-400" : "text-amber-600"}`}>
                    {t("trading_paused_within_15_seconds_of_expiry")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trading buttons */}
      <div className="space-y-2" data-tutorial="trade-buttons">
        {/* One-click indicator (shown when enabled, as a quick status) */}
        {oneClickTrading.enabled && (
          <div className={`flex items-center justify-center gap-1.5 px-2 py-1 ${
            darkMode ? "text-yellow-500/80" : "text-yellow-600/80"
          }`}>
            <Zap size={10} className="animate-pulse" />
            <span className="text-[10px] font-medium">
              {t("one_click_active") || "One-Click Active"}
            </span>
          </div>
        )}
        <DynamicTradingButtons
          orderType={selectedOrderType}
          handlePlaceOrder={handlePlaceOrder}
          profitPercentage={profitPercentage}
          disabled={isInSafeZone || isLoadingDurationsLocal}
          isMobile={isMobile}
          darkMode={darkMode}
          oneClickEnabled={oneClickTrading.enabled}
          isLoading={isPlacingOrder}
        />
      </div>

      {/* Render confirmation portal */}
      {renderConfirmationPortal()}

      {/* Order Type Modal */}
      <OrderTypeModal
        isOpen={showOrderTypeModal}
        onClose={() => setShowOrderTypeModal(false)}
        selectedType={selectedOrderType}
        onSelectType={setOrderTypeInStore}
        darkMode={darkMode}
      />
    </div>
  );
}

// Add default export
export default OrderPanel;
