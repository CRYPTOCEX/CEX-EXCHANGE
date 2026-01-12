"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import type { OrderSide } from "@/types/binary-trading";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => Promise<boolean>;
  cancellationFee?: number;
}

export function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  cancellationFee = 0,
}: CancelOrderModalProps) {
  const t = useTranslations("common");
  const tBinary = useTranslations("binary_components");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const refundAmount = order.amount - cancellationFee;
  const timeLeft = Math.max(0, order.expiryTime - Date.now());
  const timeLeftSeconds = Math.floor(timeLeft / 1000);
  const canCancel = timeLeftSeconds >= 10;

  const handleConfirm = async () => {
    if (!canCancel) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await onConfirm(order.id);
      if (success) {
        onClose();
      } else {
        setError(tBinary("cancel_order_failed") || "Failed to cancel order");
      }
    } catch (err) {
      setError(tBinary("cancel_order_error") || "An error occurred");
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

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            {tBinary("cancel_order_title") || "Cancel Order"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            {tBinary("cancel_order_description") || "Are you sure you want to cancel this order?"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Details */}
          <div className="rounded-lg bg-zinc-800/50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("symbol")}:</span>
              <span className="text-white font-medium">{order.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("direction")}:</span>
              <span className={`font-medium ${isBullishSide(order.side) ? "text-green-400" : "text-red-400"}`}>
                {order.side}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("amount")}:</span>
              <span className="text-white font-medium">
                {formatCurrency(order.amount)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("entry_price") || "Entry Price"}:</span>
              <span className="text-white font-medium">
                {order.entryPrice.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t("time_remaining") || "Time Remaining"}:</span>
              <span className={`font-medium ${timeLeftSeconds < 30 ? "text-red-400" : "text-white"}`}>
                {Math.floor(timeLeftSeconds / 60)}:{(timeLeftSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Refund Information */}
          <div className="rounded-lg bg-zinc-800/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{tBinary("order_amount") || "Order Amount"}:</span>
              <span className="text-white">{formatCurrency(order.amount)} {currency}</span>
            </div>
            {cancellationFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{tBinary("cancellation_fee") || "Cancellation Fee"}:</span>
                <span className="text-red-400">-{formatCurrency(cancellationFee)} {currency}</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-zinc-300 font-medium">{t("refund_amount") || "Refund Amount"}:</span>
                <span className="text-green-400 font-bold">{formatCurrency(refundAmount)} {currency}</span>
              </div>
            </div>
          </div>

          {/* Warning if close to expiry */}
          {!canCancel && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-red-400 text-sm">
                {tBinary("cannot_cancel_too_close") || "Cannot cancel order: Less than 10 seconds until expiry"}
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
            {t("keep_order") || "Keep Order"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !canCancel}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("cancelling") || "Cancelling..."}
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                {t("cancel_order") || "Cancel Order"}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CancelOrderModal;
