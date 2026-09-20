"use client";

/**
 * The fill tape — proof of life.
 *
 * The ladder shows intent; this shows results. It is the most convincing
 * element on the page, because a row appearing means the bot traded, just now,
 * on this exchange.
 *
 * Chrome matches the trades tab of `trade/components/orderbook/orderbook-panel.tsx`
 * — `grid-cols-3`, `border-b border-border`, `hover:bg-surface-3/60`,
 * `directionText` on the price, size on `--foreground`, time on
 * `--muted-foreground`.
 *
 * The one addition is the arrival flash. A trader's tape is a firehose where
 * highlighting every print would be noise; a single bot's fills are sparse
 * enough that each one is an event worth catching out of the corner of an eye.
 */

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnHeader, EmptyState, directionText } from "@/components/terminal";
import { ConsoleFill, fmtAmount, fmtNotional, fmtPrice } from "./types";
import { useTranslations } from "next-intl";

export function FillTape({
  fills,
  emptyHint,
  className,
}: {
  fills: ConsoleFill[];
  emptyHint?: string;
  className?: string;
}) {
  const tComponents = useTranslations("components");
  /** Ids seen in a previous render — anything else arrived just now. */
  const seenRef = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    const incoming = fills.filter((f) => !seenRef.current.has(f.id)).map((f) => f.id);
    // The first render is history, not news. Flashing all of it would claim a
    // burst of activity that did not happen while anyone was watching.
    const seeded = seenRef.current.size > 0;
    for (const f of fills) seenRef.current.add(f.id);
    // The tape is a ring buffer server-side, so the id set would otherwise grow
    // for the lifetime of the page.
    if (seenRef.current.size > 600) seenRef.current = new Set(fills.map((f) => f.id));
    if (!seeded || !incoming.length) return;

    setFresh((prev) => new Set([...prev, ...incoming]));
    const t = setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev);
        for (const id of incoming) next.delete(id);
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [fills]);

  // Newest first — the interesting end of a tape is the top.
  const rows = [...fills].reverse();

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ColumnHeader labels={["Price", "Size", "Value", "Time"]} cols="grid-cols-4" />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<Clock className="h-5 w-5" />}
            title={tComponents("no_fills_yet")}
            hint={emptyHint}
          />
        ) : (
          rows.map((f) => {
            const buy = f.side === "BUY";
            const isFresh = fresh.has(f.id);
            return (
              <div
                key={f.id}
                className={cn(
                  "grid grid-cols-4 border-b border-border px-2 py-1.5 transition-colors duration-700 hover:bg-surface-3/60",
                  isFresh &&
                    (buy
                      ? "animate-in fade-in-0 slide-in-from-top-1 bg-up/15"
                      : "animate-in fade-in-0 slide-in-from-top-1 bg-down/15")
                )}
              >
                <span
                  className={cn(
                    "text-center font-mono text-xs font-medium tabular-nums",
                    // While the row carries a directional GROUND, the price
                    // must not also carry directional INK — `text-up` on
                    // `bg-up/15` measures ~2.66:1 in light mode. The ground is
                    // already saying "buy"; the numeral goes back to
                    // `--foreground` for the second and a half it is lit.
                    isFresh ? "text-foreground" : directionText(buy)
                  )}
                >
                  {fmtPrice(f.price)}
                </span>
                <span className="text-center font-mono text-xs tabular-nums text-foreground">
                  {fmtAmount(f.amount)}
                </span>
                <span className="text-center font-mono text-xs tabular-nums text-muted-foreground">
                  {fmtNotional(f.price * f.amount)}
                </span>
                {/* A tape without timestamps is a list of trades. hour12 is
                    pinned false so the column width can never jump. */}
                <span className="text-center font-mono text-xs tabular-nums text-muted-foreground">
                  {new Date(f.at).toLocaleTimeString(undefined, { hour12: false })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
