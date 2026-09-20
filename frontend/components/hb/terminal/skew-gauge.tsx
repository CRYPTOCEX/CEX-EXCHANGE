"use client";

/**
 * Quote skew — which way the bot is leaning.
 *
 * A market maker earns the spread by being filled on both sides in roughly
 * equal measure. When only one side fills it stops being a maker and starts
 * being a directional position: buy fills with no sell fills means base asset
 * piling up, and the operator finds out from their balance, days later.
 *
 * Two bars, because they answer different questions and the difference between
 * them is the warning:
 *
 *   QUOTED — the notional currently resting on each side. This is intent, and
 *   it is what the strategy chose. Lopsided quoting usually means the bot ran
 *   out of one asset and could only place the other side.
 *
 *   FILLED — the notional actually traded on each side in the recent window.
 *   This is outcome. Balanced quotes with lopsided fills is the dangerous
 *   case: the bot looks healthy on the ladder while inventory drifts.
 *
 * Derived entirely from the existing snapshot — no balance lookup, no new
 * backend call. It is therefore SKEW, not inventory: it says which way the bot
 * is leaning, not what it currently holds.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ConsoleFill, ConsoleSymbolView, fmtNotional } from "./types";
import { sideBalance, windowFills } from "./metrics";
import { useNow } from "./use-now";
import { useTranslations } from "next-intl";

function SkewBar({
  label,
  buy,
  sell,
  hint,
  /** False when there are too few events for a ratio to mean anything. */
  confident = true,
  sample,
}: {
  label: string;
  buy: number;
  sell: number;
  hint: string;
  confident?: boolean;
  sample?: number;
}) {
  const total = buy + sell;
  const buyPct = total > 0 ? (buy / total) * 100 : 50;
  // "Balanced" is a band, not a point — a maker is never exactly 50/50 and
  // flagging every 51% lean would make the warning meaningless.
  const balanced = total === 0 || Math.abs(buyPct - 50) <= 15;
  // Two fills that happened to both be buys is not a 100% skew. Saying so is
  // better than a confident number derived from a sample of two.
  const tooFew = !confident && total > 0;

  return (
    <div className="px-3 py-2" title={hint}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            total === 0
              ? "text-muted-foreground"
              : balanced
                ? "text-muted-foreground"
                : buyPct > 50
                  ? "text-up"
                  : "text-down"
          )}
        >
          {total === 0
            ? "—"
            : tooFew
              ? `${sample ?? total} fills`
              : balanced
                ? "balanced"
                : buyPct > 50
                  ? `${Math.round(buyPct)}% bid`
                  : `${Math.round(100 - buyPct)}% ask`}
        </span>
      </div>

      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        {total > 0 && (
          <>
            <div
              className="absolute inset-y-0 left-0 bg-up transition-[width] duration-500"
              style={{ width: `${buyPct}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-down transition-[width] duration-500"
              style={{ width: `${100 - buyPct}%` }}
            />
          </>
        )}
        {/* The 50/50 mark, so "off centre" is readable without arithmetic. */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
      </div>

      <div className="mt-1 flex items-center justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>{fmtNotional(buy)}</span>
        <span>{fmtNotional(sell)}</span>
      </div>
    </div>
  );
}

export function SkewGauge({
  view,
  fills,
  className,
}: {
  view: ConsoleSymbolView | null;
  fills: ConsoleFill[];
  className?: string;
}) {
  const t = useTranslations("components");
  const quoted = useMemo(() => {
    if (!view) return { buy: 0, sell: 0 };
    const notional = (qs: ConsoleSymbolView["bids"]) =>
      qs.reduce((sum, q) => sum + q.price * Math.max(q.amount - q.filled, 0), 0);
    return { buy: notional(view.bids), sell: notional(view.asks) };
  }, [view]);

  /**
   * `fills` is the tail of a ring buffer, not a time window — on a busy bot it
   * can span seconds and on a quiet one hours. Windowing first is what stops
   * "60% of fills were buys" from silently describing yesterday.
   */
  const now = useNow(5_000);
  const filled = useMemo(() => {
    const recent = windowFills(fills, now);
    const b = sideBalance(recent);
    return { buy: b.buyValue, sell: b.sellValue, confident: b.confident, sample: b.sample };
  }, [fills, now]);

  return (
    <div className={cn("divide-y divide-border", className)}>
      <SkewBar
        label="Quoted"
        buy={quoted.buy}
        sell={quoted.sell}
        hint={t("notional_resting_on_each_side_right")}
      />
      <SkewBar
        label={t("filled_5m")}
        buy={filled.buy}
        sell={filled.sell}
        confident={filled.confident}
        sample={filled.sample}
        hint={t("notional_actually_traded_on_each_side")}
      />
    </div>
  );
}
