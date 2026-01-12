"use client";

import React, { memo, useEffect, useCallback } from "react";
import { cn } from "../../utils/cn";
import type { OrderSide } from "./SideToggle";
import type { OrderType } from "./OrderTypeSelector";

interface OrderDetails {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number | null;
  amount: number;
  total: number;
  leverage?: number;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: OrderDetails;
  isSubmitting: boolean;
}

export const ConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  isSubmitting,
}: ConfirmationModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const isBuy = order.side === "buy";
  const typeLabel = order.type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "w-full max-w-sm mx-4",
          "bg-[var(--tp-bg-secondary)]",
          "border border-[var(--tp-border)]",
          "rounded-xl shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tp-border)]">
          <h3 className="text-base font-semibold text-[var(--tp-text-primary)]">
            Confirm Order
          </h3>
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
              {isBuy ? "Buy" : "Sell"} {typeLabel}
            </span>
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {order.symbol}
            </span>
          </div>

          {/* Order details */}
          <div className="space-y-2 py-2">
            {order.price && (
              <DetailRow label="Price" value={`${order.price.toFixed(2)} USDT`} />
            )}
            <DetailRow label="Amount" value={`${order.amount.toFixed(4)}`} />
            <DetailRow
              label="Total"
              value={`${order.total.toFixed(2)} USDT`}
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
                Market orders execute immediately at the best available price.
                The final price may differ from the displayed price.
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
              "text-sm font-semibold text-white",
              "rounded-lg",
              "transition-colors",
              isBuy
                ? "bg-[var(--tp-green)] hover:bg-[var(--tp-green-dim)]"
                : "bg-[var(--tp-red)] hover:bg-[var(--tp-red-dim)]",
              "disabled:opacity-50"
            )}
          >
            {isSubmitting ? "Confirming..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
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
          "text-sm font-mono",
          highlight
            ? "text-[var(--tp-text-primary)] font-semibold"
            : "text-[var(--tp-text-secondary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default ConfirmationModal;
