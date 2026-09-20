"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";
import type { OrderSide } from "./SideToggle";
import type { OrderType } from "./OrderTypeSelector";
import { useTranslations } from "next-intl";

interface SubmitButtonProps {
  side: OrderSide;
  orderType: OrderType;
  amount: string;
  price?: string;
  isSubmitting: boolean;
  disabled: boolean;
  onClick: () => void;
  /** Base asset — named in the label so the action states its subject. */
  currency?: string;
}

export const SubmitButton = memo(function SubmitButton({
  side,
  orderType,
  amount,
  price,
  isSubmitting,
  disabled,
  onClick,
  currency,
}: SubmitButtonProps) {
  const t = useTranslations("common");
  const isBuy = side === "buy";

  const getLabel = () => {
    const action = isBuy ? "Buy" : "Sell";
    if (currency) return `${action} ${currency}`;

    const typeLabel = orderType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return `${action} ${typeLabel}`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isSubmitting}
      className={cn(
        "w-full py-2.5",
        "text-[13px] font-semibold",
        "rounded-md",
        "transition-all",
        // Ink is the direction token's PAIRED foreground, not white: white on
        // the dark-mode up-green measures 2.34:1.
        isBuy
          ? "bg-[var(--tp-green)] text-[var(--tp-green-fg)] hover:bg-[var(--tp-green-dim)]"
          : "bg-[var(--tp-red)] text-[var(--tp-red-fg)] hover:bg-[var(--tp-red-dim)]",
        // Fade the whole control, not just its ground. Halving only the
        // background alpha left the label at 1.8:1 against the blend — the
        // disabled state was the least readable thing on the panel.
        "disabled:opacity-50 disabled:cursor-not-allowed"
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
          {t("processing")}…
        </span>
      ) : (
        getLabel()
      )}
    </button>
  );
});

export default SubmitButton;
