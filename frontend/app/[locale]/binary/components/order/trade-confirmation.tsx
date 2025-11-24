"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import type { Symbol } from "@/store/trade/use-binary-store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface TradeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "CALL" | "PUT";
  amount: number;
  symbol: Symbol;
  expiryMinutes: number;
  currentPrice: number;
  className?: string;
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
  className = "",
  darkMode = true,
  priceMovement,
}: TradeConfirmationProps) {
  const t = useTranslations("binary/components/order/trade-confirmation");
  const [countdown, setCountdown] = useState(10); // 10 seconds countdown
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate expiry time
  const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const formattedExpiryTime = expiryTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate potential profit
  const profitPercentage = 87;
  const potentialProfit = (amount * profitPercentage) / 100;

  // Calculate potential loss
  const potentialLoss = amount;

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

  // Theme-based styles
  const styles = {
    dialogBg: darkMode
      ? "bg-black border-zinc-800"
      : "bg-white border-gray-200",
    headerText: darkMode ? "text-white" : "text-gray-900",
    cardBg: darkMode
      ? "bg-zinc-900 border-zinc-800"
      : "bg-gray-100 border-gray-200",
    labelText: darkMode ? "text-zinc-400" : "text-gray-500",
    valueText: darkMode ? "text-white" : "text-gray-900",
    buttonBorder: darkMode
      ? "border-zinc-700 hover:bg-zinc-800"
      : "border-gray-300 hover:bg-gray-100",
    buttonText: darkMode ? "text-white" : "text-gray-900",
    detailsButton: darkMode
      ? "text-zinc-400 hover:text-white"
      : "text-gray-500 hover:text-gray-900",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`p-4 max-w-[400px] w-[95%] mx-auto ${styles.dialogBg} border rounded-lg shadow-xl ${className}`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle
            className={`font-medium text-lg ${styles.headerText} text-center`}
          >
            {t("confirm_trade")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review and confirm your trading order details before execution.
          </DialogDescription>
        </DialogHeader>

        {/* Order type and amount */}
        <div className={`${styles.cardBg} p-4 rounded-lg mb-4 border`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${
                  type === "CALL" ? "bg-[#00C896]" : "bg-[#FF4D4F]"
                }`}
              >
                {type === "CALL" ? (
                  <ArrowUpRight size={20} className="text-white" />
                ) : (
                  <ArrowDownRight size={20} className="text-white" />
                )}
              </div>
              <div>
                <div className={styles.labelText}>
                  {symbol.replace("USDT", "")} /USD
                </div>
                <div className={`font-bold ${styles.valueText} text-xl`}>
                  {type === "CALL" ? "CALL (Up)" : "PUT (Down)"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={styles.labelText}>{t("Amount")}</div>
              <div className={`font-bold ${styles.valueText} text-xl`}>
                $
                {amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Trade details */}
        <div className={`${styles.cardBg} p-4 rounded-lg mb-4 border`}>
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <div className={styles.labelText}>{t("entry_price")}</div>
              <div className={`${styles.valueText} font-medium`}>
                $
                {currentPrice.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={styles.labelText}>{t("expiry_time")}</div>
              <div
                className={`${styles.valueText} font-medium flex items-center`}
              >
                <Clock size={14} className="mr-1.5" />
                {formattedExpiryTime} ( {expiryMinutes} {t("min)")}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={styles.labelText}>{t("potential_profit")}</div>
              <div className="text-[#00C896] font-medium">
                $
                {potentialProfit.toFixed(2)}{" "}
                <span className="text-[#00C896]">
                  ( {profitPercentage} %)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={styles.labelText}>{t("potential_loss")}</div>
              <div className="text-[#FF4D4F] font-medium">
                $
                {potentialLoss.toFixed(2)}{" "}
                <span className="text-[#FF4D4F]">
                  ( {100} %)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Show details toggle */}
        <button
          className={`w-full text-left ${styles.detailsButton} mb-4 flex items-center`}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide details" : "Show details"}
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
            <motion.div
              className={`${styles.cardBg} p-4 rounded-lg mb-4 border text-sm`}
              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <div className={styles.labelText}>{t("trade_type")}</div>
                  <div className={styles.valueText}>{t("binary_option")}</div>
                </div>
                <div className="flex justify-between">
                  <div className={styles.labelText}>
                    {t("risk_reward_ratio")}
                  </div>
                  <div className={styles.valueText}>
                    1:
                    {(potentialProfit / potentialLoss).toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className={styles.labelText}>{t("execution")}</div>
                  <div className={styles.valueText}>{t("Market")}</div>
                </div>
                <div className="flex justify-between">
                  <div className={styles.labelText}>{t("fees")}</div>
                  <div className={styles.valueText}>{t("Included")}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`flex-1 py-3 border ${styles.buttonBorder} rounded-lg transition-colors ${styles.buttonText} font-medium ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("Cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`flex-1 py-3 rounded-lg font-medium relative overflow-hidden ${
              type === "CALL"
                ? "bg-[#00C896] hover:bg-[#00B085]"
                : "bg-[#FF4D4F] hover:bg-[#E54042]"
            } text-white ${
              isProcessing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            <div className="flex items-center justify-center">
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  <span>{t("processing")}</span>
                </>
              ) : (
                <span>
                  {t("confirm_(")}
                  {countdown} s)
                </span>
              )}
            </div>
            {isAnimating && !isProcessing && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30"
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
