"use client";

/**
 * The bot's ladder — our quotes drawn as a layer ON the public book.
 *
 * This is the one picture that answers "is the strategy working". A market
 * maker's whole job is to sit on both sides of the mid at a controlled
 * distance, so two walls hugging the spread means it is working; one wall means
 * it is one-sided and taking on inventory; nothing next to the mid means it is
 * quoting too wide to ever trade.
 *
 * WHAT MAKES THIS DIFFERENT FROM THE /trade ORDERBOOK
 * A trader's orderbook shows the market. This shows the market AND the operator's
 * position within it, which is a different question and needs a third column:
 * `Yours` is the size we have at that price, and the depth bar carries a
 * brighter inner segment for our share of it. Our resting orders ARE part of
 * that depth — they are not additional to it — so showing them as a separate
 * quantity would double-count the wall.
 *
 * Chrome follows `app/[locale]/trade/components/orderbook/orderbook-panel.tsx`
 * exactly: `grid-cols-3`, `border-b border-border/60`, `hover:bg-surface-3/60`,
 * the direction tint as an absolutely-positioned bar behind the row, and
 * `directionText` on the price because in a book the value IS the direction.
 * Sizes ride `--foreground`, not `--muted-foreground` — that is a measured
 * decision in the orderbook (15.5:1 light / 15.05:1 dark over the tint), not a
 * stylistic one.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ColumnHeader, EmptyState, directionText, directionTint } from "@/components/terminal";
import { BookX } from "lucide-react";
import { ConsoleSymbolView, fmtAmount, fmtPrice, fmtAge } from "./types";
import { isBehind } from "./metrics";
import { useTranslations } from "next-intl";

interface Row {
  price: number;
  bookSize: number;
  ourSize: number;
  /** Oldest of our quotes at this price — the staleness read. */
  ageMs: number | null;
}

function buildRows(
  book: [number, number][],
  quotes: ConsoleSymbolView["bids"],
  side: "bid" | "ask",
  levels: number
): Row[] {
  const byPrice = new Map<number, Row>();
  for (const [price, size] of book) {
    byPrice.set(price, { price, bookSize: size, ourSize: 0, ageMs: null });
  }
  for (const q of quotes) {
    const remaining = Math.max(q.amount - q.filled, 0);
    if (remaining <= 0) continue;
    const row = byPrice.get(q.price);
    if (row) {
      row.ourSize += remaining;
      row.ageMs = row.ageMs == null ? q.ageMs : Math.max(row.ageMs, q.ageMs);
    } else {
      // Our quote sits outside the depth window the book returned. It is still
      // ours and still resting, so it belongs on the ladder — the book column
      // simply has nothing else to say at that price.
      byPrice.set(q.price, {
        price: q.price,
        bookSize: remaining,
        ourSize: remaining,
        ageMs: q.ageMs,
      });
    }
  }
  const rows = Array.from(byPrice.values());
  // Nearest the touch first, then trim: the levels beside the mid are the ones
  // that matter, and one far-away quote must not push them off screen.
  rows.sort((a, b) => (side === "bid" ? b.price - a.price : a.price - b.price));
  return rows.slice(0, levels);
}

export function QuoteLadder({
  view,
  /** Age of the snapshot, so quote ages keep counting between pushed frames. */
  driftMs = 0,
  levels = 10,
  className,
}: {
  view: ConsoleSymbolView;
  driftMs?: number;
  levels?: number;
  className?: string;
}) {
  const t = useTranslations("components");
  const { bidRows, askRows, maxSize } = useMemo(() => {
    const bidRows = buildRows(view.book.bids, view.bids, "bid", levels);
    const askRows = buildRows(view.book.asks, view.asks, "ask", levels);
    return {
      bidRows,
      askRows,
      maxSize: Math.max(
        1e-12,
        ...bidRows.map((r) => r.bookSize),
        ...askRows.map((r) => r.bookSize)
      ),
    };
  }, [view, levels]);

  if (!bidRows.length && !askRows.length) {
    /*
      AN UNREADABLE BOOK IS NOT AN EMPTY ONE.

      `metrics.ts` judges `bookKnown === false` first and for exactly this
      reason — the ladder is empty when the read FAILED too, and calling that
      "no liquidity" sends the operator to seed a market that may be perfectly
      healthy, for a fault that is ours. The verdict block rendered beside this
      one already said so, while this panel sat next to it asserting the
      opposite. `!== false` because an older backend sends no such field, and
      absent must not mean unreadable.
    */
    const unreadable = view.bookKnown === false;
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <ColumnHeader labels={["Yours", "Price", "Book"]} />
        <EmptyState
          icon={<BookX className="h-6 w-6" />}
          title={
            unreadable ? t("book_could_not_be_read") : t("no_book_and_nothing_resting")
          }
          hint={
            unreadable
              ? t("this_is_a_fault_on_our_side")
              : t("a_maker_quotes_around_a_mid")
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ColumnHeader labels={["Yours", "Price", "Book"]} />

      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto scrollbar-none">
        {/* Asks descend toward the mid so the touch sits against the spread
            band — the conventional reading order, and the same trick the
            orderbook uses to avoid imperative scroll management. */}
        <div className="flex flex-col-reverse">
          {askRows.map((r) => (
            <LadderRow key={`a${r.price}`} row={r} maxSize={maxSize} side="ask" driftMs={driftMs} />
          ))}
        </div>

        <SpreadBand view={view} />

        {bidRows.map((r) => (
          <LadderRow key={`b${r.price}`} row={r} maxSize={maxSize} side="bid" driftMs={driftMs} />
        ))}
      </div>
    </div>
  );
}

/**
 * The mid band, carrying both spreads.
 *
 * The warning is driven by PER-SIDE edge in basis points, not by comparing the
 * two spreads. Our resting orders are part of the book being read, so
 * `bestBid >= ourBid` and `bestAsk <= ourAsk` are identities and `ourSpread >=
 * bookSpread` is therefore always true — a spread comparison would flag every
 * healthy bot that is not simultaneously at the touch on both sides.
 */
function SpreadBand({ view }: { view: ConsoleSymbolView }) {
  const t = useTranslations("components");
  const behind = isBehind(view, "bid") || isBehind(view, "ask");

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-y border-border bg-surface-2 px-2 py-1">
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
        {fmtPrice(view.mid)}
      </span>
      <span className="flex items-center gap-2 text-[10px] tabular-nums">
        <span className="text-muted-foreground">
          book {view.spreadPct != null ? `${view.spreadPct.toFixed(3)}%` : "—"}
        </span>
        <span
          className={cn(
            "rounded px-1",
            behind
              ? "bg-warning/10 text-foreground"
              : view.ourSpreadPct != null
                ? "bg-primary/10 text-primary-ink"
                : "text-muted-foreground"
          )}
          title={
            behind
              ? t("you_are_quoting_wider_than_the")
              : t("your_own_quoted_spread")
          }
        >
          you {view.ourSpreadPct != null ? `${view.ourSpreadPct.toFixed(3)}%` : "—"}
        </span>
      </span>
    </div>
  );
}

function LadderRow({
  row,
  maxSize,
  side,
  driftMs,
}: {
  row: Row;
  maxSize: number;
  side: "bid" | "ask";
  driftMs: number;
}) {
  const t = useTranslations("components");
  const isBid = side === "bid";
  const depth = Math.min(100, (row.bookSize / maxSize) * 100);
  const ourShare = row.bookSize > 0 ? Math.min(100, (row.ourSize / row.bookSize) * 100) : 0;
  const mine = row.ourSize > 0;

  return (
    <div
      className={cn(
        "relative grid grid-cols-3 border-b border-border/60 px-1 py-1 text-[10px] transition-colors hover:bg-surface-3/60",
        // A hairline in the accent marks the rows that are ours, so the bot's
        // footprint is findable without reading a single number.
        mine && "border-l-2 border-l-primary"
      )}
    >
      <div
        className={cn("absolute inset-y-0 right-0", directionTint(isBid))}
        style={{ width: `${depth}%` }}
      />
      {/* Our share of that wall, anchored to the LEFT — the side the `Yours`
          column is on. Drawn from the right it sat under the Book column while
          describing the number in the opposite corner, so the highlight was
          spatially divorced from its own label. */}
      {mine && (
        <div
          className="absolute inset-y-0 left-0 bg-primary/20"
          style={{ width: `${(depth * ourShare) / 100}%` }}
        />
      )}

      <span
        className={cn(
          "relative z-10 font-mono tabular-nums",
          mine ? "font-semibold text-primary" : "text-subtle-foreground"
        )}
      >
        {mine ? fmtAmount(row.ourSize) : "·"}
      </span>

      <span
        className={cn(
          "relative z-10 text-center font-mono font-medium tabular-nums",
          directionText(isBid)
        )}
      >
        {fmtPrice(row.price)}
      </span>

      <span className="relative z-10 flex items-center justify-end gap-1 font-mono tabular-nums text-foreground">
        {mine && row.ageMs != null && (
          <span
            // `-ink` and not the raw token: `text-primary` on `bg-primary/10`
            // fails AA in light mode. The derived ink is the system's fix.
            className="rounded bg-primary/10 px-1 text-[9px] text-primary-ink"
            title={t("how_long_your_oldest_quote_at")}
          >
            {fmtAge(row.ageMs + driftMs)}
          </span>
        )}
        {fmtAmount(row.bookSize)}
      </span>
    </div>
  );
}
