"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { OrderSide } from "./SideToggle";
import type { OrderType } from "./OrderTypeSelector";

interface SubmitButtonProps {
  side: OrderSide;
  orderType: OrderType;
  amount: string;
  price?: string;
  isSubmitting: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const SubmitButton = memo(function SubmitButton({
  side,
  orderType,
  amount,
  price,
  isSubmitting,
  disabled,
  onClick,
}: SubmitButtonProps) {
  const isBuy = side === "buy";

  const getLabel = () => {
    const action = isBuy ? "Buy" : "Sell";
    const typeLabel = orderType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (orderType === "market") {
      return `${action} Market`;
    }

    return `${action} ${typeLabel}`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isSubmitting}
      className={cn(
        "w-full py-1.5",
        "text-xs font-semibold text-white",
        "rounded",
        "transition-all",
        isBuy
          ? "bg-[var(--tp-green)] hover:bg-[var(--tp-green-dim)] disabled:bg-[var(--tp-green)]/50"
          : "bg-[var(--tp-red)] hover:bg-[var(--tp-red-dim)] disabled:bg-[var(--tp-red)]/50",
        "disabled:cursor-not-allowed"
      )}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeOpacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              strokeLinecap="round"
            />
          </svg>
          Processing...
        </span>
      ) : (
        getLabel()
      )}
    </button>
  );
});

export default SubmitButton;
