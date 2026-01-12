"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Loader2, Clock, AlertTriangle } from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import type { OrderSide } from "@/types/binary-trading";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

interface CashOutModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => Promise<{ success: boolean; cashoutAmount?: number; penalty?: number }>;
  currentPrice: number;
  earlyClosePenaltyPercent?: number;
  minTimeAfterEntry?: number; // Minimum seconds after entry before early close is allowed
}

export function CashOutModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  currentPrice,
  earlyClosePenaltyPercent = 10, // Default 10% penalty
  minTimeAfterEntry = 30, // Default 30 seconds minimum
}: CashOutModalProps) {
  const t = useTranslations("common");
  const tBinary = useTranslations("binary_components");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashOutValue, setCashOutValue] = useState(0);
  const [penalty, setPenalty] = useState(0);

  // Calculate cash out value based on current price
  const calculateCashOut = useCallback(() => {
    if (!order) return { value: 0, penalty: 0, isProfitable: false };

    const profitPercentage = order.profitPercentage || 85;
    const isProfitable = isBullishSide(order.side)
      ? currentPrice > order.entryPrice
      : currentPrice < order.entryPrice;

    let potentialProfit: number;
    if (isProfitable) {
      // Calculate potential profit
      potentialProfit = (order.amount * profitPercentage) / 100;
    } else {
      // Loss scenario - lose the stake
      potentialProfit = -order.amount;
    }

    // Calculate time-based penalty (decreases as we approach expiry)
    const now = Date.now();
    const timeFromEntry = now - order.createdAt;
    const totalDuration = order.expiryTime - order.createdAt;
    const timeProgress = Math.min(1, timeFromEntry / totalDuration);

    // Penalty decreases linearly from full penalty at entry to 0 at expiry
    // But only applies to profits
    let penaltyAmount = 0;
    if (isProfitable && potentialProfit > 0) {
      const penaltyRate = earlyClosePenaltyPercent * (1 - timeProgress);
      penaltyAmount = (potentialProfit * penaltyRate) / 100;
    }

    // Cash out value = original amount + profit - penalty
    const cashOutAmount = isProfitable
      ? order.amount + potentialProfit - penaltyAmount
      : Math.max(0, order.amount + potentialProfit); // Can't go below 0

    return {
      value: Math.max(0, cashOutAmount),
      penalty: penaltyAmount,
      isProfitable,
      potentialProfit,
    };
  }, [order, currentPrice, earlyClosePenaltyPercent]);

  // Update cash out value periodically
  useEffect(() => {
    if (!isOpen || !order) return;

    const updateValue = () => {
      const { value, penalty } = calculateCashOut();
      setCashOutValue(value);
      setPenalty(penalty);
    };

    updateValue();
    const interval = setInterval(updateValue, 500);

    return () => clearInterval(interval);
  }, [isOpen, order, currentPrice, calculateCashOut]);

  if (!order) return null;

  const now = Date.now();
  const timeFromEntry = now - order.createdAt;
  const timeUntilExpiry = order.expiryTime - now;
  const canCashOut = timeFromEntry >= (minTimeAfterEntry * 1000) && timeUntilExpiry >= 10000;
  const waitTimeRemaining = Math.max(0, (minTimeAfterEntry * 1000) - timeFromEntry);
  const waitTimeSeconds = Math.ceil(waitTimeRemaining / 1000);

  const { isProfitable, potentialProfit } = calculateCashOut();

  const handleConfirm = async () => {
  const tBinary = useTranslations("binary_components");
    if (!canCashOut) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onConfirm(order.id);
      if (result.success) {
        onClose();
      } else {
        setError(tBinary("cash_out_failed") || "Failed to cash out");
      }
    } catch (err) {
      setError(tBinary("cash_out_error") || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  // Extract quote currency from symbol
  const getCurrency = (symbol: string) => {
    if (symbol.includes("/")) {
      return symbol.split("/")[1];
    }
    return "USDT";
  };

  const currency = getCurrency(order.symbol);
  const priceDiff = currentPrice - order.entryPrice;
  const priceDiffPercent = ((priceDiff / order.entryPrice) * 100);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <DollarSign className="w-5 h-5 text-green-500" />
            {tBinary("cash_out_title") || "Cash Out Early"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {tBinary("cash_out_description") || "Close your position now at the current value"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Position Status */}
          <div className={`rounded-lg p-4 ${isProfitable ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">{tBinary("position_status") || "Position Status"}</span>
              <div className={`flex items-center gap-1 ${isProfitable ? "text-green-400" : "text-red-400"}`}>
                {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">
                  {isProfitable ? (tBinary("in_profit") || "In Profit") : (tBinary("in_loss") || "In Loss")}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-center py-2">
              <span className={isProfitable ? "text-green-400" : "text-red-400"}>
                {isProfitable ? "+" : ""}{formatCurrency(potentialProfit || 0)} {currency}
              </span>
            </div>
          </div>

          {/* Price Comparison */}
          <div className="rounded-lg bg-zinc-800/50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("entry_price") || "Entry Price"}:</span>
              <span className="text-white font-medium">{order.entryPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("current_price") || "Current Price"}:</span>
              <span className={`font-medium ${priceDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                {currentPrice.toFixed(2)} ({priceDiff >= 0 ? "+" : ""}{priceDiffPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("direction")}:</span>
              <span className={`font-medium ${isBullishSide(order.side) ? "text-green-400" : "text-red-400"}`}>
                {order.side}
              </span>
            </div>
          </div>

          {/* Cash Out Calculation */}
          <div className="rounded-lg bg-zinc-800/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("amount")}:</span>
              <span className="text-white">{formatCurrency(order.amount)} {currency}</span>
            </div>
            {potentialProfit !== undefined && potentialProfit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{tBinary("current_profit") || "Current Profit"}:</span>
                <span className="text-green-400">+{formatCurrency(potentialProfit)} {currency}</span>
              </div>
            )}
            {penalty > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{tBinary("early_close_fee") || "Early Close Fee"}:</span>
                <span className="text-red-400">-{formatCurrency(penalty)} {currency}</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-zinc-300 font-medium">{tBinary("cash_out_value") || "Cash Out Value"}:</span>
                <span className={`font-bold text-lg ${cashOutValue >= order.amount ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(cashOutValue)} {currency}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 text-right">
                {cashOutValue >= order.amount
                  ? `+${formatCurrency(cashOutValue - order.amount)} ${tBinary("net_profit") || "net profit"}`
                  : `-${formatCurrency(order.amount - cashOutValue)} ${tBinary("net_loss") || "net loss"}`
                }
              </div>
            </div>
          </div>

          {/* Warning if too early */}
          {!canCashOut && waitTimeRemaining > 0 && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <p className="text-yellow-400 text-sm">
                {tBinary("wait_before_cash_out") || `Please wait ${waitTimeSeconds}s before cashing out`}
              </p>
            </div>
          )}

          {/* Warning if too close to expiry */}
          {!canCashOut && timeUntilExpiry < 10000 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-red-400 text-sm">
                {tBinary("too_close_to_expiry") || "Too close to expiry to cash out"}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !canCashOut}
            className={`flex-1 ${isProfitable ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("processing") || "Processing..."}
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                {tBinary("cash_out_now") || "Cash Out Now"}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CashOutModal;
