"use client";

/**
 * The spread instrument — our quote bracket against the book's, on one axis.
 *
 * WHY THIS HAS NO EQUIVALENT ON /trade
 * A discretionary trader has one order and asks "what is the price". A market
 * maker has a two-sided quote with a WIDTH, and asks "how far behind the touch
 * am I, on each side, right now". That needs both brackets on one price axis.
 *
 * Reading it, as three shapes rather than three numbers:
 *   nested tightly   → we are at or near the touch, we will fill
 *   much wider       → we are behind the market and will not fill until it
 *                      widens to meet us
 *   one arm missing  → one-sided, inventory accumulating
 *
 * Note our bracket can never be NARROWER than the book's: our resting orders
 * are part of that book, so `bestBid >= ourBid` and `bestAsk <= ourAsk` are
 * identities. Equal brackets means we ARE the touch on both sides — the best
 * outcome the picture can show. Everything judged here is per-side edge in bps
 * (see metrics.ts), never a spread-vs-spread comparison.
 *
 * STALENESS is the other half. A strategy that silently stopped re-quoting
 * looks identical to a working one — same orders, same prices, same ladder —
 * until you read the clock on them.
 */

import { cn } from "@/lib/utils";
import { MetaChip } from "@/components/terminal";
import { ConsoleSymbolView, fmtPrice } from "./types";
import { atTouch, edgeBps, offScale, wedgeHalfRange } from "./metrics";
import { QuoteAgeHistogram } from "./quotes-table";
import { useTranslations } from "next-intl";

export function SpreadInstrument({
  view,
  driftMs = 0,
  className,
}: {
  view: ConsoleSymbolView;
  driftMs?: number;
  className?: string;
}) {
  const t = useTranslations("components");
  return (
    <div
      className={cn(
        "flex shrink-0 items-stretch divide-x divide-border border-b border-border bg-card",
        className
      )}
    >
      {/* Subject — the hero number. A terminal with no large anchor price reads
          as a report rather than an instrument. */}
      <div className="flex w-36 shrink-0 flex-col justify-center px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">
            {view.symbol}
          </span>
          <MetaChip className="h-4 text-[9px] leading-4">{view.market}</MetaChip>
        </span>
        <span className="mt-0.5 font-mono text-lg font-semibold leading-none tabular-nums text-foreground">
          {fmtPrice(view.mid)}
        </span>
      </div>

      <Wedge view={view} className="min-w-[180px] flex-1" />

      <div className="hidden w-28 shrink-0 flex-col justify-center gap-1 px-3 py-2 sm:flex">
        <Label>Edge</Label>
        <EdgeRow view={view} side="bid" />
        <EdgeRow view={view} side="ask" />
      </div>

      <div className="hidden w-28 shrink-0 flex-col justify-center gap-1 px-3 py-2 xl:flex">
        <Label>{t("quote_age")}</Label>
        <QuoteAgeHistogram view={view} driftMs={driftMs} className="h-8" />
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-medium uppercase tracking-wide text-subtle-foreground">
      {children}
    </span>
  );
}

/**
 * Distance from the touch, per side.
 *
 * `touch` rather than `0.0 bp` at the front of the queue: that is a state, not
 * a measurement, and it is what every maker is aiming for. Negative values are
 * rendered honestly — the book is cached a fraction of a tick while orders are
 * read fresh, so a quote placed inside the touch really does show a small
 * overhang for one frame.
 *
 * THREE STATES, NOT TWO. "Quoting" and "not quoting" are not exhaustive: an edge
 * is measured against the MID, and a market with only one side has no mid, so a
 * perfectly live quote can be unmeasurable. That case is common — one side of a
 * thin book getting cleared out is an ordinary event, and `readVerdict` has a
 * branch for it — and collapsing it into either of the other two lies in both
 * directions: "none" claims we are not quoting when we are, and a number claims
 * a distance from a touch that does not exist. It reads "—", like every other
 * unknown figure on the terminal.
 *
 * It borrows the WEDGE's sentence for the explanation rather than minting a new
 * one. The wedge sitting immediately to the left goes blank on the same
 * condition and already says why, so a second wording here would be two
 * explanations of one state — and a new string would put this fix behind a core
 * release, since the message catalogue is core's, not this addon's.
 */
function EdgeRow({ view, side }: { view: ConsoleSymbolView; side: "bid" | "ask" }) {
  const t = useTranslations("components");
  const bps = edgeBps(view, side);
  const present = (side === "bid" ? view.ourBid : view.ourAsk) != null;
  const touching = atTouch(bps);
  const off = offScale(view, side);
  const measurable = bps != null;

  return (
    <span className="flex items-baseline justify-between gap-2">
      <span
        className={cn("text-[10px] font-medium", side === "bid" ? "text-up" : "text-down")}
      >
        {side}
      </span>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums",
          !present || !measurable
            ? "text-muted-foreground/50"
            : touching
              ? "text-primary-ink"
              : "text-foreground"
        )}
        title={
          !present
            ? t("no_quoted_on_this_market", { side: String(side) })
            : !measurable
              ? t("no_mid_price_the_book_is")
              : touching
                ? t("your_is_at_the_touch_front_of_the_queue", { side: String(side) })
                : `Your ${side} sits this far behind the best ${side}, in basis points of the mid.`
        }
      >
        {!present
          ? "none"
          : !measurable
            ? "—"
            : touching
              ? "touch"
              : `${off ? "» " : ""}${bps.toFixed(1)} bp`}
      </span>
    </span>
  );
}

/**
 * The wedge: two brackets on one price axis.
 *
 * The axis is scaled to the book's own half-spread, not to our quotes — a
 * single order resting far from the mid would otherwise drag the scale until
 * the actual spread, the entire point of the picture, became a sub-pixel
 * smear. A quote beyond the clamp is pinned to the edge and flagged, rather
 * than allowed to flatten everything else.
 */
function Wedge({ view, className }: { view: ConsoleSymbolView; className?: string }) {
  const t = useTranslations("components");
  const { mid, bestBid, bestAsk, ourBid, ourAsk } = view;
  const half = wedgeHalfRange(view);

  if (!mid || half == null) {
    return (
      <div className={cn("flex items-center justify-center px-3 text-center", className)}>
        <span className="text-[10px] leading-relaxed text-muted-foreground">
          {t("no_mid_price_the_book_is")}
        </span>
      </div>
    );
  }

  // Pinned to the axis edge when beyond the clamp; `offScale` drives the marker.
  const x = (p: number) =>
    Math.max(1, Math.min(99, 50 + ((p - mid) / half) * 50));

  const bookSpan =
    bestBid != null && bestAsk != null ? { from: x(bestBid), to: x(bestAsk) } : null;
  const ourSpan =
    ourBid != null && ourAsk != null ? { from: x(ourBid), to: x(ourAsk) } : null;
  const offBid = offScale(view, "bid");
  const offAsk = offScale(view, "ask");

  return (
    <div className={cn("relative flex flex-col justify-center px-4 py-2", className)}>
      <div className="relative h-8">
        {/* The market's own spread, as the ground. */}
        {bookSpan && (
          <div
            className="absolute top-1 h-2 rounded-sm bg-muted-foreground/20"
            style={{ left: `${bookSpan.from}%`, width: `${Math.max(bookSpan.to - bookSpan.from, 0.5)}%` }}
            title={t("the_markets_spread_best_bid_to_best_ask")}
          />
        )}
        {/* Ours, directly beneath it so the two are comparable without moving
            the eye. Equal width means we are the touch on both sides. */}
        {ourSpan && (
          <div
            className="absolute top-5 h-2 rounded-sm bg-primary/70"
            style={{ left: `${ourSpan.from}%`, width: `${Math.max(ourSpan.to - ourSpan.from, 0.5)}%` }}
            title={t("your_quoted_spread_your_best_bid_to_your_best_ask")}
          />
        )}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />

        {/* Off-scale markers: an arrow at the edge is honest about a quote the
            axis could not reach. A silently squashed axis is not. */}
        {offBid && (
          <span className="absolute left-0 top-5 text-[9px] leading-none text-warning" title={t("your_bid_is_further_from_the")}>
            «
          </span>
        )}
        {offAsk && (
          <span className="absolute right-0 top-5 text-[9px] leading-none text-warning" title={t("your_ask_is_further_from_the")}>
            »
          </span>
        )}

        {!ourSpan && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
            {ourBid == null && ourAsk == null
              ? t("nothing_quoted")
              : `only the ${ourBid != null ? "bid" : "ask"} side is quoted`}
          </span>
        )}
      </div>

      <div className="mt-0.5 flex items-center justify-between font-mono text-[9px] tabular-nums text-muted-foreground">
        <span className="text-up">{fmtPrice(bestBid)}</span>
        <span className="text-subtle-foreground">
          book {view.spreadPct != null ? `${view.spreadPct.toFixed(3)}%` : "—"}
          {view.ourSpreadPct != null && (
            <span className="ml-1.5 text-primary-ink">
              you {view.ourSpreadPct.toFixed(3)}%
            </span>
          )}
        </span>
        <span className="text-down">{fmtPrice(bestAsk)}</span>
      </div>
    </div>
  );
}
