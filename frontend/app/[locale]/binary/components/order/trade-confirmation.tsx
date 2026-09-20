"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Clock, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import type { Symbol } from "@/store/trade/use-binary-store";
import { calculateNextExpiryTime } from "@/utils/time-sync";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SIDE_FILL } from "./order-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

interface TradeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "CALL" | "PUT";
  amount: number;
  symbol: Symbol;
  expiryMinutes: number;
  currentPrice: number;
  profitPercentage: number;
  className?: string;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
  priceMovement?: {
    direction: "up" | "down" | "neutral";
    percent: number;
    strength: "strong" | "medium" | "weak";
  };
}

export default function TradeConfirmation({
  isOpen,
  onClose,
  onConfirm,
  type,
  amount,
  symbol,
  expiryMinutes,
  currentPrice,
  profitPercentage,
  className = "",
}: TradeConfirmationProps) {
  const t = useTranslations("common");
  const tBinaryComponents = useTranslations("binary_components");
  const [countdown, setCountdown] = useState(10); // 10 seconds countdown
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate expiry time - aligned to next expiry boundary
  const expiryTime = calculateNextExpiryTime(expiryMinutes);
  const formattedExpiryTime = expiryTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate potential profit using the passed profitPercentage
  const potentialProfit = (amount * profitPercentage) / 100;

  // Calculate potential loss
  const potentialLoss = amount;

  // Extract currency from symbol (e.g., "BTC/USDT" -> "USDT")
  const getCurrency = (symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT"; // Default to USDT if parsing fails
  };

  // Auto-countdown for confirmation
  useEffect(() => {
    if (!isOpen) return;

    setIsAnimating(true);
    setIsProcessing(false); // Reset processing state when dialog opens
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      setCountdown(10); // Reset to 10 seconds
      setIsAnimating(false);
      setIsProcessing(false); // Reset processing state when dialog closes
    };
  }, [isOpen]);

  // Auto-confirm when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !isProcessing) {
      handleConfirm();
    }
  }, [countdown]); // Remove onConfirm from dependencies to prevent infinite loops

  // Handle confirm with loading state
  const handleConfirm = async () => {
    if (isProcessing) return; // Prevent multiple clicks

    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      // Reset processing state on error so user can try again
      setIsProcessing(false);
    }
    // Note: Don't reset isProcessing on success as the dialog should close
  };

  // CALL is the up half of the bet, PUT the down half. `SIDE_FILL` carries the
  // paired ink: `text-overlay-foreground` on `--up` measures 2.34:1 in dark mode.
  const side = type === "CALL" ? "up" : "down";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "p-4 max-w-[400px] w-[95%] mx-auto bg-card border border-border rounded-lg ",
          className
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-medium text-lg text-foreground text-center">
            {tBinaryComponents("confirm_trade")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review and confirm your trading order details before execution.
          </DialogDescription>
        </DialogHeader>

        {/* Order type and amount */}
        <div className="bg-surface-2 border border-border p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mr-3",
                  SIDE_FILL[side]
                )}
              >
                {type === "CALL" ? (
                  <ArrowUpRight size={20} />
                ) : (
                  <ArrowDownRight size={20} />
                )}
              </div>
              <div>
                <div className="text-muted-foreground">
                  {symbol.replace("USDT", "")} /USD
                </div>
                <div className="font-bold text-foreground text-xl">
                  {type === "CALL" ? t("call_up") : t("put_down")}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">{t("amount")}</div>
              <div className="font-bold text-foreground text-xl">
                <MoneyFigure value={`${amount.toLocaleString()} ${getCurrency(symbol)}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Trade details */}
        <div className="bg-surface-2 border border-border p-4 rounded-lg mb-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <div className="text-muted-foreground">{t("entry_price")}</div>
              <div className="text-foreground font-medium">
                <MoneyFigure value={`${currentPrice.toLocaleString()} ${getCurrency(symbol)}`} />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-muted-foreground">{tBinaryComponents("expiry_time")}</div>
              <div className="text-foreground font-medium flex items-center">
                <Clock size={14} className="mr-1.5" />
                {formattedExpiryTime} ({expiryMinutes} {t("min")})
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-muted-foreground">{tBinaryComponents("potential_profit")}</div>
              <div className="text-up font-medium">
                <MoneyFigure value={`${potentialProfit.toFixed(2)} ${getCurrency(symbol)}`} />{" "}
                <span>( {profitPercentage} %)</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-muted-foreground">{tBinaryComponents("potential_loss")}</div>
              <div className="text-down font-medium">
                <MoneyFigure value={`${potentialLoss.toFixed(2)} ${getCurrency(symbol)}`} />{" "}
                <span>( {100} %)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Show details toggle */}
        <button
          className="w-full text-left text-muted-foreground hover:text-foreground mb-4 flex items-center"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? t("hide_details") : t("show_details")}
          <span
            className="ml-1 transform transition-transform duration-200"
            style={{
              transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            ▼
          </span>
        </button>

        {/* Collapsible details */}
        <AnimatePresence>
          {showDetails && (
            <m.div
              className="bg-surface-2 border border-border p-4 rounded-lg mb-4 text-sm"
              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <div className="text-muted-foreground">{t("trade_type")}</div>
                  <div className="text-foreground">{tBinaryComponents("binary_option")}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">
                    {tBinaryComponents("risk_reward_ratio")}
                  </div>
                  <div className="text-foreground">
                    1:
                    {(potentialProfit / potentialLoss).toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">{t("execution")}</div>
                  <div className="text-foreground">{t("market")}</div>
                </div>
                <div className="flex justify-between">
                  <div className="text-muted-foreground">{t("fees")}</div>
                  <div className="text-foreground">{tBinaryComponents("included")}</div>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={cn(
              "flex-1 py-3 border border-border-strong hover:bg-surface-3 rounded-lg transition-colors text-foreground font-medium",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={cn(
              "flex-1 py-3 rounded-lg font-medium relative overflow-hidden hover:opacity-90 transition-opacity",
              SIDE_FILL[side],
              isProcessing && "opacity-75 cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-center">
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  <span>{t("processing")}</span>
                </>
              ) : (
                <span>
                  {t("confirm")}
                  {countdown} s)
                </span>
              )}
            </div>
            {isAnimating && !isProcessing && (
              <m.div
                /* `bg-opacity-*` does not exist in Tailwind v4, so the old
                   `bg-white bg-opacity-30` rendered a solid white bar. This
                   tracks the button's own ink instead. */
                className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 10, ease: "linear" }}
              />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
