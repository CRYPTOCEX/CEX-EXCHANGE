"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import type { Position } from "./PositionCard";

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: Position;
  onConfirm: (closeType: "market" | "limit", price?: number, amount?: number) => Promise<void>;
}

export const ClosePositionModal = memo(function ClosePositionModal({
  isOpen,
  onClose,
  position,
  onConfirm,
}: ClosePositionModalProps) {
  const [closeType, setCloseType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState(position.markPrice.toFixed(2));
  const [amount, setAmount] = useState(position.size.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCloseType("market");
      setLimitPrice(position.markPrice.toFixed(2));
      setAmount(position.size.toString());
    }
  }, [isOpen, position]);

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

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(
        closeType,
        closeType === "limit" ? parseFloat(limitPrice) : undefined,
        parseFloat(amount)
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLong = position.side === "LONG";
  const estimatedPnl =
    closeType === "market"
      ? position.unrealizedPnl
      : isLong
      ? (parseFloat(limitPrice) - position.entryPrice) * parseFloat(amount)
      : (position.entryPrice - parseFloat(limitPrice)) * parseFloat(amount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            Close Position
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
        <div className="p-4 space-y-4">
          {/* Position info */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "px-2 py-1 text-xs font-semibold rounded",
                isLong
                  ? "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                  : "bg-[var(--tp-red)]/20 text-[var(--tp-red)]"
              )}
            >
              {position.side} {position.leverage}x
            </span>
            <span className="text-sm font-medium text-[var(--tp-text-primary)]">
              {position.symbol}
            </span>
          </div>

          {/* Close type */}
          <div>
            <label className="block text-xs text-[var(--tp-text-muted)] mb-1.5">
              Close Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCloseType("market")}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded",
                  closeType === "market"
                    ? "bg-[var(--tp-blue)] text-white"
                    : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
                )}
              >
                Market
              </button>
              <button
                onClick={() => setCloseType("limit")}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded",
                  closeType === "limit"
                    ? "bg-[var(--tp-blue)] text-white"
                    : "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]"
                )}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Limit price */}
          {closeType === "limit" && (
            <div>
              <label className="block text-xs text-[var(--tp-text-muted)] mb-1.5">
                Limit Price
              </label>
              <input
                type="text"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className={cn(
                  "w-full px-3 py-2",
                  "text-sm font-mono",
                  "bg-[var(--tp-bg-tertiary)]",
                  "border border-[var(--tp-border)]",
                  "rounded-lg",
                  "outline-none focus:border-[var(--tp-blue)]"
                )}
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[var(--tp-text-muted)]">Amount</label>
              <button
                onClick={() => setAmount(position.size.toString())}
                className="text-[10px] text-[var(--tp-blue)]"
              >
                Max: {position.size.toFixed(4)}
              </button>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(
                "w-full px-3 py-2",
                "text-sm font-mono",
                "bg-[var(--tp-bg-tertiary)]",
                "border border-[var(--tp-border)]",
                "rounded-lg",
                "outline-none focus:border-[var(--tp-blue)]"
              )}
            />
            {/* Quick buttons */}
            <div className="flex gap-1 mt-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAmount((position.size * (pct / 100)).toFixed(4))}
                  className="flex-1 py-1 text-[10px] bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)] rounded hover:text-[var(--tp-text-secondary)]"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Estimated P&L */}
          <div className="flex items-center justify-between py-2 px-3 bg-[var(--tp-bg-tertiary)] rounded-lg">
            <span className="text-xs text-[var(--tp-text-muted)]">Est. P&L</span>
            <span
              className={cn(
                "text-sm font-mono font-semibold",
                estimatedPnl >= 0 ? "text-[var(--tp-green)]" : "text-[var(--tp-red)]"
              )}
            >
              {estimatedPnl >= 0 ? "+" : ""}
              {estimatedPnl.toFixed(2)} USDT
            </span>
          </div>
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
            onClick={handleConfirm}
            disabled={isSubmitting || parseFloat(amount) <= 0}
            className={cn(
              "flex-1 py-2.5",
              "text-sm font-semibold text-white",
              "rounded-lg",
              "transition-colors",
              "bg-[var(--tp-red)] hover:bg-[var(--tp-red-dim)]",
              "disabled:opacity-50"
            )}
          >
            {isSubmitting ? "Closing..." : "Close Position"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ClosePositionModal;
