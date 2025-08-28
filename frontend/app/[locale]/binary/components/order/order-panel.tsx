"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Symbol, OrderSide } from "@/store/trade/use-binary-store";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import AmountSelector from "./amount-selector";
import ExpirySelector from "./expiry-selector";
import ProfitDisplay from "./profit-display";
import TemplatesSelector from "./templates-selector";
import TradingButtons from "./trading-buttons";
import TradingShortcuts from "./trading-shortcuts";
import RiskCalculator from "./risk-calculator";
import AdvancedTradeConfirmation from "./trade-confirmation";
import {
  getChartSynchronizedTime,
  formatChartTime,
  calculateNextExpiryTime,
} from "@/utils/time-sync";
import { CandleData } from "@/components/blocks/advanced-chart/types";
import { useTranslations } from "next-intl";

// Define the binary duration interface
interface BinaryDurationAttributes {
  id: string;
  duration: number;
  profitPercentage: number;
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
  const t = useTranslations("binary/components/order/order-panel");
  // Core state - Get selectedExpiryMinutes from store
  const storeSelectedExpiryMinutes = useBinaryStore((state) => state.selectedExpiryMinutes);
  const [amount, setAmount] = useState<number>(1000);
  // Use store value as initial state and sync with it
  const [expiryMinutes, setInternalExpiryMinutes] = useState<number>(storeSelectedExpiryMinutes || 5);
  const [expiryTime, setExpiryTime] = useState<string>("00:00");
  const [pendingSide, setPendingSide] = useState<OrderSide | null>(null);
  const [timeToNextExpiry, setTimeToNextExpiry] = useState<string>("00:00");
  
  // Custom setter that updates both internal state and notifies parent
  const setExpiryMinutes = useCallback((minutes: number) => {
    setInternalExpiryMinutes(minutes);
    if (onExpiryChange) {
      onExpiryChange(minutes);
    }
  }, [onExpiryChange]);

  // UI state
  const [activeTab, setActiveTab] = useState<"basic">("basic");
  const [showAmountDropdown, setShowAmountDropdown] = useState<boolean>(false);
  const [showExpiryDropdown, setShowExpiryDropdown] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [orderPlacementError, setOrderPlacementError] = useState<string | null>(
    null
  );
  const [isLoadingDurations, setIsLoadingDurations] = useState<boolean>(true);

  // Advanced trading state
  const [orderMode, setOrderMode] = useState<"market" | "limit" | "stop">(
    "market"
  );
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(80);
  const [stopLossPercent, setStopLossPercent] = useState<number>(50);

  // Binary durations state
  const [binaryDurations, setBinaryDurations] = useState<
    BinaryDurationAttributes[]
  >([]);

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

  // Calculate profit percentage and amount based on selected expiry
  const selectedDuration = binaryDurations.find(
    (d) => d.duration === expiryMinutes
  );
  const profitPercentage = selectedDuration?.profitPercentage || 85;
  const profitAmount = (amount * profitPercentage) / 100;

  // Debug log to check if we're receiving candle data - use a ref to prevent re-renders
  useEffect(() => {
    const currentCandleLength = candleData?.length || 0;
    if (currentCandleLength !== prevCandleDataLengthRef.current) {
      console.log(
        `OrderPanel received ${currentCandleLength} candles for ${symbol}`
      );
      prevCandleDataLengthRef.current = currentCandleLength;
    }
  }, [candleData, symbol]);

  // Use binary durations from store instead of fetching separately
  useEffect(() => {
    // Get durations from the binary store
    const storeDurations = useBinaryStore.getState().binaryDurations;
    const storeIsLoading = useBinaryStore.getState().isLoadingDurations;

    console.log(`[OrderPanel] Using durations from store:`, storeDurations);

    // Defer initial state updates to prevent setState during render
    setTimeout(() => {
      if (storeDurations.length > 0) {
        // Convert store durations to component format
        const durations: BinaryDurationAttributes[] = storeDurations.map((d) => ({
          id: d.id,
          duration: d.duration,
          profitPercentage: d.profitPercentage,
          status: d.status,
        }));

        setBinaryDurations(durations);
        setIsLoadingDurations(false);

        // Set default expiry to the first active duration only if not already set
        if (!storeSelectedExpiryMinutes) {
          const activeDurations = durations.filter((d) => d.status === true);
          const defaultDuration =
            activeDurations.length > 0 ? activeDurations[0] : durations[0];
          setExpiryMinutes(defaultDuration.duration);
        }
      } else {
        setIsLoadingDurations(storeIsLoading);
      }
    }, 0);

    // Subscribe to store changes
    const unsubscribe = useBinaryStore.subscribe((state) => {
      // Defer state updates to prevent setState during render
      setTimeout(() => {
        if (state.binaryDurations.length > 0 && binaryDurations.length === 0) {
          const durations: BinaryDurationAttributes[] = state.binaryDurations.map(
            (d) => ({
              id: d.id,
              duration: d.duration,
              profitPercentage: d.profitPercentage,
              status: d.status,
            })
          );

          setBinaryDurations(durations);
          setIsLoadingDurations(false);

          // Set default expiry to the first active duration only if not already set
          if (!storeSelectedExpiryMinutes) {
            const activeDurations = durations.filter((d) => d.status === true);
            const defaultDuration =
              activeDurations.length > 0 ? activeDurations[0] : durations[0];
            setExpiryMinutes(defaultDuration.duration);
          }
        }
        setIsLoadingDurations(state.isLoadingDurations);
      }, 0);
    });

    return unsubscribe;
  }, [storeSelectedExpiryMinutes]);

  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Sync with store changes - when store value changes, update internal state
  useEffect(() => {
    if (storeSelectedExpiryMinutes && storeSelectedExpiryMinutes !== expiryMinutes) {
      console.log(`[OrderPanel] Syncing with store expiry: ${storeSelectedExpiryMinutes} minutes`);
      setInternalExpiryMinutes(storeSelectedExpiryMinutes);
    }
  }, [storeSelectedExpiryMinutes]);

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
    const activeDurations = binaryDurations.filter(
      (duration) => duration.status === true
    );

    const expiryTimes = activeDurations
      .map((duration) => {
        // Calculate the next expiry time based on the interval
        const nextExpiry = calculateNextExpiryTime(duration.duration);

        return {
          minutes: duration.duration,
          display: formatChartTime(nextExpiry),
          profit: duration.profitPercentage,
          remaining: calculateRemaining(nextExpiry),
          expiryTime: nextExpiry,
        };
      })
      .sort((a, b) => a.minutes - b.minutes); // Sort by duration

    return expiryTimes;
  }, [binaryDurations]);

  // Update expiry times every second with throttling to prevent excessive updates
  useEffect(() => {
    if (binaryDurations.length === 0) return;

    // Initial calculation
    const initialExpiryTimes = calculateExpiryTimes();
    setPresetExpiryTimes(initialExpiryTimes);

    // Update every second to keep times in sync with chart, but throttle to prevent excessive updates
    const updateTimesAndExpiry = () => {
      const now = Date.now();
      // Only update if at least 500ms have passed since the last update
      if (now - lastUpdateTimeRef.current >= 500) {
        lastUpdateTimeRef.current = now;

        const updatedExpiryTimes = calculateExpiryTimes();
        setPresetExpiryTimes(updatedExpiryTimes);

        // Update time to next expiry
        const chartTime = getChartSynchronizedTime();
        const nextExpiry = calculateNextExpiryTime(expiryMinutes);
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

    // Clear any error message after 5 seconds
    if (orderPlacementError) {
      const errorTimer = setTimeout(() => setOrderPlacementError(null), 5000);
      return () => {
        clearTimeout(errorTimer);
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      };
    }

    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, [
    calculateExpiryTimes,
    expiryMinutes,
    orderPlacementError,
    binaryDurations,
  ]);

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
      console.log(
        `[OrderPanel] Notifying parent of expiry change: ${expiryMinutes} minutes`
      );
      prevExpiryMinutesRef.current = expiryMinutes;
      onExpiryChange(expiryMinutes);
    }
  }, [expiryMinutes, onExpiryChange]);

  // Initialize with first option when presetExpiryTimes changes from empty to populated
  useEffect(() => {
    if (
      presetExpiryTimes.length > 0 &&
      !presetExpiryTimes.some((item) => item.minutes === expiryMinutes)
    ) {
      // Try to find the closest available duration
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
  }, [presetExpiryTimes.length]); // Only depend on length to avoid infinite loops

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

  // Handle amount changes
  const increaseAmount = () => {
    if (amount < balance) {
      setAmount((prev) => Math.min(prev + 100, balance));
    }
  };
  const decreaseAmount = () => {
    if (amount > 100) {
      setAmount((prev) => Math.max(100, prev - 100));
    }
  };
  const setQuickAmount = (newAmount: number) =>
    setAmount(Math.min(newAmount, balance));

  // Apply template
  const applyTemplate = (template: (typeof templates)[0]) => {
    setAmount(template.amount);
    setExpiryMinutes(template.expiryMinutes);
    setRiskPercent(template.riskPercent);
    setTakeProfitPercent(template.takeProfitPercent);
    setStopLossPercent(template.stopLossPercent);
  };

  // Handle order placement with confirmation
  const handlePlaceOrder = (side: OrderSide) => {
    // Check if we're in the safe zone
    if (isInSafeZone) {
      setOrderPlacementError("Cannot place orders within 15 seconds of expiry");
      return;
    }

    // Show the advanced confirmation modal instead of placing the order immediately
    setPendingSide(side);
    setShowConfirmation(true);
  };

  const confirmOrder = useCallback(async () => {
    if (pendingSide) {
      try {
        const success = await onPlaceOrder(pendingSide, amount, expiryMinutes);
        if (!success) {
          setOrderPlacementError(
            "Order placement failed - check your balance or try again"
          );
        }
      } catch (error) {
        console.error("Error placing order:", error);
        setOrderPlacementError("Order placement failed - please try again");
      }
      setShowConfirmation(false);
      setPendingSide(null);
    }
  }, [pendingSide, onPlaceOrder, amount, expiryMinutes]);

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
        className="z-[9999]"
        darkMode={darkMode}
        priceMovement={priceMovement}
      />,
      document.body
    );
  };

  // Update the main container div to use conditional styling based on darkMode
  return (
    <div
      className={`flex flex-col h-full ${darkMode ? "bg-black" : "bg-white"} ${darkMode ? "text-white" : "text-zinc-800"} ${isMobile ? "w-full" : `border-l ${darkMode ? "border-zinc-800" : "border-gray-200"} w-[300px]`} relative z-50 overflow-hidden`}
    >
      {/* Basic Tab Content */}
      <div className="flex-1 overflow-y-auto h-0 min-h-0">
        <div className="p-3 space-y-3">
          {/* Loading state */}
          {isLoadingDurations ? (
            <div className="flex justify-center items-center py-4">
              <div
                className={`animate-spin rounded-full h-6 w-6 border-b-2 border-[#F7941D]`}
              ></div>
            </div>
          ) : (
            <>
              {/* Amount and Expiry in a compact row */}
              <div className="flex space-x-2">
                {/* Amount section */}
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
                />

                {/* Expiration section */}
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
                />
              </div>

              {/* Profit section */}
              <ProfitDisplay
                profitPercentage={profitPercentage}
                profitAmount={profitAmount}
                amount={amount}
                darkMode={darkMode}
              />

              {/* Quick templates */}
              <TemplatesSelector
                templates={templates}
                applyTemplate={applyTemplate}
                darkMode={darkMode}
              />

              {/* Trading shortcuts and risk calculator */}
              <div className="flex space-x-2">
                <TradingShortcuts
                  onPlaceOrder={(type) =>
                    handlePlaceOrder(type === "CALL" ? "RISE" : "FALL")
                  }
                  onIncreaseAmount={increaseAmount}
                  onDecreaseAmount={decreaseAmount}
                  onQuickAmount={setQuickAmount}
                  darkMode={darkMode}
                />
                <RiskCalculator
                  balance={balance}
                  onSetAmount={setQuickAmount}
                  darkMode={darkMode}
                />
              </div>

              {/* Time to next expiry */}
              <div
                className={`flex justify-between items-center p-2 ${darkMode ? "bg-zinc-900" : "bg-gray-100"} rounded-md`}
              >
                <span
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {t("next_expiry_in")}
                </span>
                <span className="text-sm font-mono">{timeToNextExpiry}</span>
              </div>

              {/* Error message display */}
              {orderPlacementError && (
                <div
                  className={`p-2 ${darkMode ? "bg-red-950/30 border-red-800 text-red-400" : "bg-red-100 border-red-300 text-red-600"} border rounded-md text-xs`}
                >
                  {orderPlacementError}
                </div>
              )}

              {/* Safe zone warning */}
              {isInSafeZone && (
                <div
                  className={`p-2 ${darkMode ? "bg-yellow-950/30 border-yellow-800 text-yellow-400" : "bg-yellow-100 border-yellow-300 text-yellow-600"} border rounded-md text-xs`}
                >
                  {t("trading_paused_within_15_seconds_of_expiry")}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Trading buttons */}
      <TradingButtons
        handlePlaceOrder={handlePlaceOrder}
        profitPercentage={profitPercentage}
        disabled={isInSafeZone || isLoadingDurations}
        isMobile={isMobile}
        darkMode={darkMode}
      />

      {/* Render confirmation portal */}
      {renderConfirmationPortal()}
    </div>
  );
}

// Add default export
export default OrderPanel;
