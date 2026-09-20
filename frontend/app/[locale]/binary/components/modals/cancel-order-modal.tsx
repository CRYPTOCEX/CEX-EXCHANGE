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
import { X, AlertTriangle } from "lucide-react";
import type { Order } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";
import type { OrderSide } from "@/types/binary-trading";
import { NoticeStrip } from "../order/order-ui";
import { DetailRow, InsetPanel, ToneMark } from "../binary-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

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
  const isBullish = isBullishSide(order.side);

  const handleConfirm = async () => {
    if (!canCancel) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await onConfirm(order.id);
      if (success) {
        onClose();
      } else {
        setError(tBinary("cancel_order_failed") || t("failed_to_cancel_order"));
      }
    } catch (err) {
      setError(tBinary("cancel_order_error") || t("an_error_occurred"));
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
      <AlertDialogContent className="sm:max-w-md bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {tBinary("cancel_order_title") || t("cancel_order")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {tBinary("cancel_order_description") || t("are_you_sure_you_want_to_cancel_this_order")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Details */}
          <InsetPanel className="space-y-3">
            <DetailRow label={`${t("symbol")}:`} value={order.symbol} />
            <DetailRow
              label={`${t("direction")}:`}
              /* The written side ("RISE"/"FALL") plus a disc-vs-diamond mark
                 carry the direction; --up and --down alone are not separable
                 under deuteranopia, and text-up is 2.8:1 here in light mode. */
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ToneMark tone={isBullish ? "up" : "down"} size={7} />
                  {order.side}
                </span>
              }
            />
            <DetailRow
              label={`${t("amount")}:`}
              value={<MoneyFigure value={`${formatCurrency(order.amount)} ${currency}`} />}
            />
            <DetailRow
              label={`${t("entry_price") || t("entry_price")}:`}
              value={<MoneyFigure value={`${order.entryPrice.toFixed(2)} ${currency}`} />}
            />
            <DetailRow
              label={`${t("time_remaining") || t("time_remaining")}:`}
              value={
                <span className="inline-flex items-center gap-1.5">
                  {timeLeftSeconds < 30 ? <ToneMark tone="warning" size={7} /> : null}
                  {Math.floor(timeLeftSeconds / 60)}:
                  {(timeLeftSeconds % 60).toString().padStart(2, "0")}
                </span>
              }
            />
          </InsetPanel>

          {/* Refund Information */}
          <InsetPanel className="space-y-2">
            <DetailRow
              label={`${t("order_amount") || t("order_amount")}:`}
              value={<MoneyFigure value={`${formatCurrency(order.amount)} ${currency}`} />}
            />
            {cancellationFee > 0 && (
              /* The leading `-` is the direction cue. `text-down` on this
                 ground measures 4.01:1 in light at 14px — under the 4.5 floor
                 — so the figure stays on `foreground` and the mark carries
                 the hue. Same rule for the refund below. */
              <DetailRow
                label={`${t("cancellation_fee") || t("cancellation_fee")}:`}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <ToneMark tone="down" size={7} />
                    <MoneyFigure value={`-${formatCurrency(cancellationFee)} ${currency}`} />
                  </span>
                }
              />
            )}
            {/*
              THE REFUND IS ONLY QUOTED WHEN THE FEE IS ACTUALLY KNOWN.

              `cancellationFee` defaults to 0 and the only caller
              (`active-positions.tsx`) passes nothing, so this row rendered
              `refundAmount = order.amount - 0` — the FULL STAKE — as a bold,
              emphasised, green figure directly above the confirm button.

              The server does not agree and never did.
              `BinaryOrderService.ts:1256-1275` derives a graduated penalty from
              the time remaining (5% / 10% / 20% by default) and states in a
              comment that it deliberately refuses a client-supplied percentage,
              precisely so a caller cannot cancel for free. `:1383-1387` then
              credits `amount − amount × pct/100`. A trader was shown 1,000.00
              and paid back 800.00.

              The client cannot compute this: the cancellation rule is not in
              any payload it receives — the store only learns `cancellationFee`
              from the cancel RESPONSE, i.e. after the irreversible action. So
              the honest fix is not a better formula, it is to stop asserting a
              figure that is not knowable here. When the fee IS supplied the
              exact refund is shown as before.
            */}
            <div className="border-t border-border pt-2 mt-2">
              {cancellationFee > 0 ? (
                <DetailRow
                  emphasis
                  label={`${t("refund_amount") || t("refund_amount")}:`}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <ToneMark tone="up" size={7} />
                      <MoneyFigure value={`${formatCurrency(refundAmount)} ${currency}`} />
                    </span>
                  }
                  valueClassName="font-bold"
                />
              ) : (
                <DetailRow
                  emphasis
                  label={`${t("refund_amount") || t("refund_amount")}:`}
                  value={
                    <span className="text-xs text-muted-foreground">
                      {tBinary("cancellation_penalty_applies")}
                    </span>
                  }
                />
              )}
            </div>
          </InsetPanel>

          {/* Warning if close to expiry */}
          {!canCancel && (
            <NoticeStrip tone="warning" icon={AlertTriangle}>
              {tBinary("cannot_cancel_too_close") || t("cannot_cancel_order_less_than_10")}
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
            {t("keep_order") || t("keep_order")}
          </Button>
          {/*
            In-flight state, house pattern: `loading` on the Button itself.

            `<Button loading>` renders the design system's own `size-4` spinner
            in its own slot, ahead of the children, and sets `aria-busy` so the
            label change is announced rather than just seen. The hand-rolled
            version this replaced swapped the ENTIRE content — icon and label
            together — for a `w-4 h-4 mr-2` Loader2 plus different copy, which
            is the shape the scanner reads as a shapeless fallback.

            The icon is hidden while loading ON PURPOSE — the same exemption
            `components/auth/wallet-login-form.tsx` carries, which the scanner's
            `hidden-while-loading` rule cannot distinguish from a withheld row.
            The Button already paints one spinner in the leading slot, so
            keeping <X> there too would put two 16px glyphs side by side and
            widen the button mid-press. Do NOT "fix" this into an unconditional
            icon.
          */}
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
            disabled={!canCancel}
            className="flex-1"
          >
            {!isLoading && <X className="w-4 h-4" />}
            {isLoading
              ? t("cancelling") || `${t("cancelling")}…`
              : t("cancel_order") || t("cancel_order")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CancelOrderModal;
