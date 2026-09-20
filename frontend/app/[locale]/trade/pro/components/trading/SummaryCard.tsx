"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

/**
 * The "here is what this costs" block, shared by every tab of the trading
 * column.
 *
 * It exists as one component rather than three lookalikes because that is the
 * only way the three tabs stay identical: the order form's cost breakdown, the
 * AI tab's projected return and the Algo tab's projection are the same object
 * doing the same job, and each one having its own padding and type ramp was
 * most of what made the tabs feel like separate products.
 *
 * (The Algo panel gets the same shell from `.algo-card` in algo.css instead of
 * importing this — it also mounts in the Standard layout, where `trade/pro/`
 * may not be installed at all.)
 */
export const SummaryCard = memo(function SummaryCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--tp-border)] bg-[var(--tp-bg-tertiary)]/60 px-2.5 py-2 space-y-1.5",
        className
      )}
    >
      {children}
    </div>
  );
});

/** Hairline rule between the breakdown and the number that matters. */
export const SummaryDivider = memo(function SummaryDivider() {
  return <div className="h-px bg-[var(--tp-border)]" />;
});

export const SummaryRow = memo(function SummaryRow({
  label,
  value,
  currency,
  emphasis,
  tone = "neutral",
}: {
  label: React.ReactNode;
  value: string;
  currency?: string;
  /** The bottom line: larger, heavier, primary ink. */
  emphasis?: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--tp-green)]"
      : tone === "negative"
        ? "text-[var(--tp-red)]"
        : emphasis
          ? "text-[var(--tp-text-primary)]"
          : "text-[var(--tp-text-secondary)]";

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={cn(
          "text-[10px] shrink-0",
          emphasis
            ? "text-[var(--tp-text-secondary)]"
            : "text-[var(--tp-text-muted)]"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums truncate",
          emphasis ? "text-[12px] font-semibold" : "text-[11px]",
          toneClass
        )}
      >
        {value}
        {currency && (
          <>
            {" "}
            <span className="font-sans text-[var(--tp-text-muted)]">
              {currency}
            </span>
          </>
        )}
      </span>
    </div>
  );
});

export default SummaryCard;
