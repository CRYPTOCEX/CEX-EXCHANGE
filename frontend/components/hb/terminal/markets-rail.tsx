"use client";

/**
 * The left rail — one health row per market the bot is on.
 *
 * A maker running four pairs has four independent two-sided quotes, and the
 * question "which one went one-sided" should be a scan, not four clicks. Each
 * row therefore leads with the lamp pair (●● / ●○), which is pre-attentive:
 * the eye finds the hollow dot without reading anything.
 *
 * ROWS ARE ALPHABETICAL AND NEVER RE-SORT BY SEVERITY. A list that reorders
 * itself the moment something goes wrong moves the row out from under the
 * cursor exactly when the operator reaches for it.
 */

import { cn } from "@/lib/utils";
import { ConsoleSymbolView, TradingSnapshot, fmtAge, fmtPrice } from "./types";
import { edgeBps, atTouch, isBehind, oldestAge, STALE_REFERENCE_MS } from "./metrics";
import { useNow } from "./use-now";
import { useTranslations } from "next-intl";

/** The maker's binary job, as two pixels. Fill/hollow carries it, not colour. */
export function LampPair({
  bids,
  asks,
  className,
}: {
  bids: number;
  asks: number;
  className?: string;
}) {
  const t = useTranslations("components");
  const dot = (on: boolean, tone: string) =>
    cn("h-1.5 w-1.5 rounded-full", on ? tone : "border border-muted-foreground/40");
  return (
    <span
      className={cn("flex shrink-0 items-center gap-0.5", className)}
      title={
        bids && asks
          ? t("quoting_both_sides")
          : bids
            ? t("bid_only_accumulating_the_base_asset")
            : asks
              ? t("ask_only_accumulating_the_quote_currency")
              : t("not_quoting_this_market")
      }
    >
      <span className={dot(bids > 0, "bg-up")} />
      <span className={dot(asks > 0, "bg-down")} />
    </span>
  );
}

function MarketRow({
  view,
  selected,
  onSelect,
  driftMs,
  now,
}: {
  view: ConsoleSymbolView;
  selected: boolean;
  onSelect: () => void;
  driftMs: number;
  now: number;
}) {
  const t = useTranslations("components");
  const bidBps = edgeBps(view, "bid");
  const askBps = edgeBps(view, "ask");
  const worst =
    bidBps == null && askBps == null
      ? null
      : Math.max(bidBps ?? 0, askBps ?? 0);
  const behind = isBehind(view, "bid") || isBehind(view, "ask");
  const touching = atTouch(bidBps) || atTouch(askBps);

  const oldest = Math.max(
    oldestAge(view.bids, driftMs) ?? 0,
    oldestAge(view.asks, driftMs) ?? 0
  );
  const stale = oldest >= STALE_REFERENCE_MS * 3;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "flex w-full flex-col gap-1 border-l-2 px-2.5 py-1.5 text-left transition-colors",
        selected
          ? "border-l-primary bg-surface-3"
          : "border-l-transparent hover:bg-surface-3/60"
      )}
    >
      <span className="flex items-center gap-1.5">
        <LampPair bids={view.bids.length} asks={view.asks.length} />
        <span className="truncate text-[11px] font-medium text-foreground">
          {view.symbol}
        </span>
        <span className="ml-auto shrink-0 text-[9px] uppercase text-subtle-foreground">
          {view.market}
        </span>
      </span>

      <span className="flex items-baseline justify-between gap-2 font-mono text-[10px] tabular-nums">
        <span className="text-muted-foreground">{fmtPrice(view.mid)}</span>
        <span
          className={cn(
            behind ? "text-warning" : touching ? "text-primary-ink" : "text-muted-foreground"
          )}
          title={t("worst_of_the_two_sides_distance_from_the_touch")}
        >
          {worst == null ? "—" : touching && worst <= 0.05 ? "touch" : `${worst.toFixed(1)}bp`}
        </span>
      </span>

      {stale && (
        <span className="text-[9px] text-warning" title={t("nothing_has_been_re_quoted_in_a_while")}>
          stale {fmtAge(oldest)}
        </span>
      )}
    </button>
  );
}

export function HbMarketsRail({
  snapshot,
  activeKey,
  onSelect,
  driftMs,
  /** Admin only — process facts that do not exist for a self-hosted bot. */
  hostBlock,
}: {
  snapshot: TradingSnapshot | null;
  activeKey: string | null;
  onSelect: (key: string) => void;
  driftMs: number;
  hostBlock?: React.ReactNode;
}) {
  const t = useTranslations("components");
  // Only leaves that print an age consume the clock — see use-now.ts.
  const now = useNow(1000);
  const keyOf = (s: ConsoleSymbolView) => `${s.market}:${s.symbol}`;
  const markets = snapshot
    ? [...snapshot.symbols].sort((a, b) => a.symbol.localeCompare(b.symbol))
    : [];

  return (
    <div className="flex min-h-0 flex-col">
      {hostBlock}

      <div className="border-b border-border bg-surface-2 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide text-subtle-foreground">
        Markets
      </div>

      {markets.length === 0 ? (
        <p className="px-2.5 py-3 text-[10px] leading-relaxed text-muted-foreground">
          {t("no_markets_yet_a_row_appears")}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {markets.map((s) => (
            <MarketRow
              key={keyOf(s)}
              view={s}
              selected={keyOf(s) === activeKey}
              onSelect={() => onSelect(keyOf(s))}
              driftMs={driftMs}
              now={now}
            />
          ))}
        </div>
      )}

      {snapshot && (
        <div className="mt-auto flex items-center gap-3 border-t border-border px-2.5 py-1.5 text-[9px] text-muted-foreground">
          {/* snapshot.engines ships on every frame and nothing else renders it.
              "Perp off" explains a missing positions panel without a support
              ticket. */}
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                snapshot.engines.spot ? "bg-up" : "border border-muted-foreground/40"
              )}
            />
            spot
          </span>
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                snapshot.engines.perp ? "bg-up" : "border border-muted-foreground/40"
              )}
            />
            perp
          </span>
        </div>
      )}
    </div>
  );
}
