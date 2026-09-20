"use client";

/**
 * The dock's Quotes tab — the blotter, inverted.
 *
 * A trader's order blotter is newest-first, because the question is "what did I
 * just do". A bot operator's question is the opposite: "what has gone stale" —
 * an order the strategy placed and then forgot about, still resting, still
 * fillable, at a price from twenty minutes ago. So this sorts OLDEST FIRST and
 * the age column is the point of the table.
 *
 * Everything here is arithmetic on the snapshot already on the wire; the rows
 * are `view.bids` and `view.asks` flattened.
 */

import { useMemo } from "react";
import { CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnHeader, EmptyState, directionText } from "@/components/terminal";
import { ConsoleQuote, ConsoleSymbolView, fmtAge, fmtAmount, fmtPrice } from "./types";
import { STALE_REFERENCE_MS } from "./metrics";
import { useNow } from "./use-now";
import { useTranslations } from "next-intl";

export function QuotesTable({
  view,
  driftMs,
  className,
}: {
  view: ConsoleSymbolView | null;
  driftMs: number;
  className?: string;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  // Consumed here rather than passed from the shell, so a ticking clock
  // re-renders this table and not the whole workspace.
  useNow(1000);

  const rows = useMemo(() => {
    if (!view) return [] as ConsoleQuote[];
    return [...view.bids, ...view.asks].sort((a, b) => b.ageMs - a.ageMs);
  }, [view]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ColumnHeader
        labels={["Side", "Price", "Remaining", "Filled", "Age"]}
        cols="grid-cols-5"
      />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<CircleSlash className="h-5 w-5" />}
            title={t("no_resting_quotes")}
            hint={t("orders_the_bot_has_on_the")}
          />
        ) : (
          rows.map((q) => {
            const buy = q.side === "BUY";
            const age = q.ageMs + driftMs;
            const stale = age >= STALE_REFERENCE_MS * 3;
            const remaining = Math.max(q.amount - q.filled, 0);
            return (
              <div
                key={q.id}
                className="grid grid-cols-5 border-b border-border px-2 py-1 text-[11px] transition-colors hover:bg-surface-3/60"
              >
                <span className={cn("text-center font-medium", directionText(buy))}>
                  {buy ? tCommon("bid") : tCommon("ask")}
                </span>
                <span className="text-center font-mono tabular-nums text-foreground">
                  {fmtPrice(q.price)}
                </span>
                <span className="text-center font-mono tabular-nums text-foreground">
                  {fmtAmount(remaining)}
                </span>
                <span
                  className={cn(
                    "text-center font-mono tabular-nums",
                    q.filled > 0 ? "text-primary-ink" : "text-muted-foreground/50"
                  )}
                >
                  {q.filled > 0 ? fmtAmount(q.filled) : "—"}
                </span>
                <span
                  className={cn(
                    "text-center font-mono tabular-nums",
                    stale ? "text-warning" : "text-muted-foreground"
                  )}
                  title={
                    stale
                      ? t("this_quote_has_not_been_replaced")
                      : undefined
                  }
                >
                  {fmtAge(age)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Quote-age histogram — one thin bar per resting quote, oldest tallest.
 *
 * Strictly more informative than an oldest-per-side number, and it is the only
 * element on the page that distinguishes the worst silent failure: a uniform
 * short comb is a healthy re-quote loop; a wall of tall bars is a dead strategy
 * loop whose orders are still resting. That state looks correct on the process,
 * in the logs, AND on the ladder simultaneously.
 */
export function QuoteAgeHistogram({
  view,
  driftMs,
  className,
}: {
  view: ConsoleSymbolView | null;
  driftMs: number;
  className?: string;
}) {
  const t = useTranslations("components");
  useNow(1000);

  const bars = useMemo(() => {
    if (!view) return [] as { key: string; height: number; buy: boolean; age: number }[];
    return [...view.bids, ...view.asks]
      .sort((a, b) => a.price - b.price)
      .map((q) => {
        const age = q.ageMs + driftMs;
        // Log scale: a linear axis pins every bar to the floor the moment one
        // stale order shows up, hiding the spread of the healthy ones.
        const height = Math.min(
          100,
          (Math.log10(Math.max(age, 500) / 500) / Math.log10(STALE_REFERENCE_MS * 6 / 500)) * 100
        );
        return { key: q.id, height: Math.max(6, height), buy: q.side === "BUY", age };
      });
  }, [view, driftMs]);

  if (!bars.length) {
    return (
      <div className={cn("flex items-end", className)}>
        <span className="text-[9px] text-muted-foreground/60">{t("no_quotes")}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-end gap-px", className)}
      title={t("one_bar_per_resting_quote_taller")}
    >
      {bars.map((b) => (
        <span
          key={b.key}
          className={cn(
            "min-w-[2px] flex-1 rounded-t-sm transition-[height] duration-500",
            b.age >= STALE_REFERENCE_MS * 3
              ? "bg-warning"
              : b.buy
                ? "bg-up/60"
                : "bg-down/60"
          )}
          style={{ height: `${b.height}%` }}
        />
      ))}
    </div>
  );
}
