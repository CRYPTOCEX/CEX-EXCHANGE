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
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle } from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import type { OrderSide } from "@/types/binary-trading";
import { cn } from "@/lib/utils";
import { NoticeStrip } from "../order/order-ui";
import { DetailRow, InsetPanel, ToneMark } from "../binary-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

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
    // `useTranslations` was called HERE, inside the click handler, shadowing the
    // identical binding already declared at the top of the component. Calling a
    // hook outside render throws "Invalid hook call", so Cash Out Now crashed
    // the moment it was pressed. The outer `tBinary` is what the body already
    // uses; this line was pure duplication.
    if (!canCashOut) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onConfirm(order.id);
      if (result.success) {
        onClose();
      } else {
        setError(tBinary("cash_out_failed") || t("failed_to_cash_out"));
      }
    } catch (err) {
      setError(tBinary("cash_out_error") || t("an_error_occurred"));
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
  const isBullish = isBullishSide(order.side);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <DollarSign className="w-5 h-5 text-up" />
            {tBinary("cash_out_title") || t("cash_out_early")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {tBinary("cash_out_description") || t("close_your_position_now_at_the_current_value")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/*
            Current position status. The tint + the direction icon + the words
            "In Profit"/"In Loss" are three channels; the figure itself stays on
            `foreground` because `text-up` on `bg-up/10` is 3.03:1 in light mode
            and this block is read, not glanced at.
          */}
          <div
            className={cn(
              "rounded-lg p-4 border",
              isProfitable
                ? "bg-up/10 border-up/40"
                : "bg-down/10 border-down/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">
                {t("position_status") || t("position_status")}
              </span>
              <div className="flex items-center gap-1 text-foreground">
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4 text-up" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-down" />
                )}
                <span className="font-medium">
                  {isProfitable ? (t("in_profit") || t("in_profit")) : (t("in_loss") || t("in_loss"))}
                </span>
              </div>
            </div>
            <div className="text-2xl font-bold text-center py-2 text-foreground">
              <MoneyFigure
                value={`${isProfitable ? "+" : ""}${formatCurrency(potentialProfit || 0)} ${currency}`}
              />
            </div>
          </div>

          {/* Price Comparison */}
          <InsetPanel className="space-y-3">
            <DetailRow
              label={`${t("entry_price") || t("entry_price")}:`}
              value={order.entryPrice.toFixed(2)}
            />
            <DetailRow
              label={`${t("current_price") || t("current_price")}:`}
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ToneMark tone={priceDiff >= 0 ? "up" : "down"} size={7} />
                  {currentPrice.toFixed(2)} ({priceDiff >= 0 ? "+" : ""}
                  {priceDiffPercent.toFixed(2)}%)
                </span>
              }
            />
            <DetailRow
              label={`${t("direction")}:`}
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ToneMark tone={isBullish ? "up" : "down"} size={7} />
                  {order.side}
                </span>
              }
            />
          </InsetPanel>

          {/* Cash Out Calculation */}
          <InsetPanel className="space-y-2">
            <DetailRow
              label={`${t("amount")}:`}
              value={<MoneyFigure value={`${formatCurrency(order.amount)} ${currency}`} />}
            />
            {potentialProfit !== undefined && potentialProfit > 0 && (
              <DetailRow
                label={`${t("current_profit") || t("current_profit")}:`}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <ToneMark tone="up" size={7} />
                    <MoneyFigure value={`+${formatCurrency(potentialProfit)} ${currency}`} />
                  </span>
                }
              />
            )}
            {penalty > 0 && (
              <DetailRow
                label={`${t("early_close_fee") || t("early_close_fee")}:`}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <ToneMark tone="down" size={7} />
                    <MoneyFigure value={`-${formatCurrency(penalty)} ${currency}`} />
                  </span>
                }
              />
            )}
            <div className="border-t border-border pt-2 mt-2">
              <DetailRow
                emphasis
                label={`${t("cash_out_value") || t("cash_out_value")}:`}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <ToneMark
                      tone={cashOutValue >= order.amount ? "up" : "down"}
                      size={8}
                    />
                    <MoneyFigure value={`${formatCurrency(cashOutValue)} ${currency}`} />
                  </span>
                }
                valueClassName="font-bold text-lg"
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {cashOutValue >= order.amount
                  ? `+${formatCurrency(cashOutValue - order.amount)} ${t("net_profit") || t("net_profit")}`
                  : `-${formatCurrency(order.amount - cashOutValue)} ${t("net_loss") || t("net_loss")}`
                }
              </div>
            </div>
          </InsetPanel>

          {/* Warning if too early */}
          {!canCashOut && waitTimeRemaining > 0 && (
            <NoticeStrip tone="warning" icon={Clock}>
              {tBinary("wait_before_cash_out") || t("please_wait_s_before_cashing_out", { waitTimeSeconds: String(waitTimeSeconds) })}
            </NoticeStrip>
          )}

          {/* Warning if too close to expiry */}
          {!canCashOut && timeUntilExpiry < 10000 && (
            <NoticeStrip tone="destructive" icon={AlertTriangle}>
              {tBinary("too_close_to_expiry") || t("too_close_to_expiry_to_cash_out")}
            </NoticeStrip>
          )}

          {/* Error message */}
          {error && (
            <NoticeStrip tone="destructive" icon={AlertTriangle}>
              {error}
            </NoticeStrip>
          )}
        </div>

        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-border-strong text-foreground hover:bg-surface-3"
          >
            {t("cancel")}
          </Button>
          {/*
            In-flight state, house pattern: `loading` on the Button itself, so
            the spinner is the design system's own `size-4` glyph in the leading
            slot and `aria-busy` is set for a screen reader. What was here
            before swapped the whole content — icon AND label — for a
            hand-rolled `w-4 h-4 mr-2` Loader2, which is the shapeless-fallback
            shape the scanner flags.

            The DollarSign is suppressed while loading DELIBERATELY — the same
            exemption `components/auth/wallet-login-form.tsx` carries, and one
            the scanner's `hidden-while-loading` rule cannot tell from a
            withheld row. `loading` already paints a spinner in that slot, so an
            unconditional icon would sit two 16px glyphs side by side and widen
            the button under the user's finger. Leave it.
          */}
          <Button
            onClick={handleConfirm}
            loading={isLoading}
            disabled={!canCashOut}
            className={cn(
              "flex-1",
              /* Cashing out in profit is the happy path; cashing out at a loss
                 is a caution the user can still take, so it is `warning`, not
                 `destructive` — nothing has been refused. */
              isProfitable
                ? "bg-up text-success-foreground hover:bg-up/90"
                : "bg-warning text-warning-foreground hover:bg-warning/90"
            )}
          >
            {!isLoading && <DollarSign className="w-4 h-4" />}
            {isLoading
              ? t("processing") || `${t("processing")}…`
              : t("cash_out_now") || t("cash_out_now")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CashOutModal;
