"use client";

import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyFigure } from "@/components/ui/money-figure";
import { cn } from "../../utils/cn";
import type { OrderSide } from "./SideToggle";
import type { OrderType } from "./OrderTypeSelector";
import { useTranslations } from "next-intl";

interface OrderDetails {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number | null;
  amount: number;
  total: number;
  leverage?: number;
  quoteCurrency?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: OrderDetails;
  isSubmitting: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
}

export const ConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  isSubmitting,
  pricePrecision = 2,
  amountPrecision = 4,
}: ConfirmationModalProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");
  const isBuy = order.side === "buy";
  const typeLabel = order.type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        size="sm"
        hideCloseButton
        aria-describedby={undefined}
        className={cn(
          "gap-0 p-0",
          "bg-[var(--tp-bg-secondary)]",
          "border-[var(--tp-border)]",
          "rounded-xl shadow-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tp-border)]">
          <DialogTitle className="text-base font-semibold text-[var(--tp-text-primary)]">
            {tTrade("confirm_order")}
          </DialogTitle>
          <button
            onClick={onClose}
            className="text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Order type badge */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "px-3 py-1.5 text-sm font-semibold rounded-lg",
                isBuy
                  ? "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                  : "bg-[var(--tp-red)]/20 text-[var(--tp-red)]"
              )}
            >
              {isBuy ? tCommon("buy") : tCommon("sell")} {typeLabel}
            </span>
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {order.symbol}
            </span>
          </div>

          {/* Order details */}
          <div className="space-y-2 py-2">
            {order.price && (
              <DetailRow label="Price" value={`${order.price.toFixed(pricePrecision)} ${order.quoteCurrency || order.symbol.split("/")[1] || ""}`} />
            )}
            <DetailRow label="Amount" value={`${order.amount.toFixed(amountPrecision)}`} />
            <DetailRow
              label="Total"
              value={`${order.total.toFixed(pricePrecision)} ${order.quoteCurrency || order.symbol.split("/")[1] || ""}`}
              highlight
            />
            {order.leverage && (
              <DetailRow label="Leverage" value={`${order.leverage}x`} />
            )}
          </div>

          {/* Warning for market orders */}
          {order.type === "market" && (
            <div className="p-2 bg-[var(--tp-yellow)]/10 border border-[var(--tp-yellow)]/30 rounded-lg">
              <p className="text-xs text-[var(--tp-yellow)]">
                {t("market_orders_execute_immediately_at_the")}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-[var(--tp-border)]">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={cn(
              "flex-1 py-2.5",
              "text-sm font-medium",
              "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]",
              "rounded-lg",
              "hover:bg-[var(--tp-bg-elevated)]",
              "transition-colors",
              "disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn(
              "flex-1 py-2.5",
              "text-sm font-semibold",
              "rounded-lg",
              "transition-colors",
              isBuy
                ? "bg-[var(--tp-green)] text-[var(--tp-green-fg)] hover:bg-[var(--tp-green-dim)]"
                : "bg-[var(--tp-red)] text-[var(--tp-red-fg)] hover:bg-[var(--tp-red-dim)]",
              "disabled:opacity-50"
            )}
          >
            {isSubmitting ? `${t("confirming")}…` : tCommon("confirm")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--tp-text-muted)]">{label}</span>
      <span
        className={cn(
          "text-sm",
          highlight
            ? "text-[var(--tp-text-primary)] font-semibold"
            : "text-[var(--tp-text-secondary)]"
        )}
      >
        {/* Price and Total arrive as "1,234.56 USDT" — a figure with a word
            glued to it. MoneyFigure monospaces the digits and leaves the
            ticker in the interface face; "0.001" and "10x" carry no trailing
            word, so they stay whole in the mono run exactly as before. */}
        <MoneyFigure value={value} />
      </span>
    </div>
  );
}

export default ConfirmationModal;
