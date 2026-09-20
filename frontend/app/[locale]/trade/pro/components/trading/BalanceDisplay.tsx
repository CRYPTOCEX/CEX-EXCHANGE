"use client";

import React, { memo } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import { formatCompact } from "../../utils/format";
import type { OrderSide } from "./SideToggle";
import { useTranslations } from "next-intl";

interface BalanceDisplayProps {
  baseBalance?: number;
  quoteBalance?: number;
  baseCurrency?: string;
  quoteCurrency?: string;
  side: OrderSide;
  isLoading?: boolean;
  pricePrecision?: number;
  amountPrecision?: number;
  onRefresh?: () => void;
}

/**
 * Both wallet legs, side by side.
 *
 * The old single line showed only the leg funding the current side, so half the
 * information a trader needs to decide the side in the first place was one
 * click away — and it abbreviated at a thousand ("190.24K USDT"), which hides
 * exactly the digits you size an order against.
 */
export const BalanceDisplay = memo(function BalanceDisplay({
  baseBalance = 0,
  quoteBalance = 0,
  baseCurrency = "BTC",
  quoteCurrency = "USDT",
  side,
  isLoading = false,
  pricePrecision = 2,
  amountPrecision = 4,
  onRefresh,
}: BalanceDisplayProps) {
  const tCommon = useTranslations("common");
  return (
    <div>
      <div className="flex items-center justify-between mb-1 min-h-[14px]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--tp-text-muted)]">
          Available
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title={tCommon("refresh_balances")}
            aria-label={tCommon("refresh_balances")}
            className="shrink-0 p-0.5 -mr-0.5 rounded text-[var(--tp-text-muted)] hover:text-[var(--tp-text-primary)] hover:bg-[var(--tp-bg-elevated)] transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <BalanceCell
          currency={quoteCurrency}
          balance={quoteBalance}
          precision={pricePrecision}
          active={side === "buy"}
          isLoading={isLoading}
        />
        <BalanceCell
          currency={baseCurrency}
          balance={baseBalance}
          precision={amountPrecision}
          active={side === "sell"}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
});

function BalanceCell({
  currency,
  balance,
  precision,
  active,
  isLoading,
}: {
  currency: string;
  balance: number;
  precision: number;
  active: boolean;
  isLoading: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1.5 transition-colors",
        active
          ? "border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]"
          : "border-transparent bg-[var(--tp-bg-tertiary)]/40"
      )}
    >
      <div className="text-[10px] text-[var(--tp-text-muted)] truncate">
        {currency}
      </div>
      {isLoading ? (
        <div className="mt-1 h-3 rounded bg-[var(--tp-bg-elevated)] animate-pulse" />
      ) : (
        <div
          className={cn(
            "text-[12px] font-mono tabular-nums truncate",
            active
              ? "text-[var(--tp-text-primary)]"
              : "text-[var(--tp-text-secondary)]"
          )}
          title={`${balance} ${currency}`}
        >
          {formatCompact(Number(balance) || 0, precision)}
        </div>
      )}
    </div>
  );
}

export default BalanceDisplay;
