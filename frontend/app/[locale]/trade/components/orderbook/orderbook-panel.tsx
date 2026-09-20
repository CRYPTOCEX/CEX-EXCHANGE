"use client";

import type React from "react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  BarChart2,
  Clock,
  Columns2,
  Rows3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsList, TabTrigger, TabContent } from "../ui/custom-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ColumnHeader,
  EmptyState,
  Spinner,
  directionText,
} from "../ui/terminal";
import { cn } from "@/lib/utils";
import { toNum } from "@/lib/precision-utils";
import {
  depthPercent,
  formatTickSize,
  sweepSummary,
  tickSizeOptions,
  type BookLevel,
  type BookSnapshot,
} from "@/lib/orderbook";
import { useOrderBook, usePriceDirection } from "@/hooks/use-order-book";
import type { Symbol } from "@/store/trade/use-binary-store";
import {
  marketDataWs,
  type OrderbookData,
  type TradeData,
  type TickerData,
  type MarketType,
} from "@/services/market-data-ws";
import { ConnectionStatus } from "@/services/ws-manager";
import { useTranslations } from "next-intl";

import {
  ORDERBOOK_SELECT_EVENT,
  type OrderbookSelectDetail,
} from "./selection-event";

import "../../orderbook.css";

/**
 * The retail order book.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE NO LONGER DOES
 * ---------------------------------------------------------------------------
 *
 * It used to carry its own copy of every order-book decision, and several of
 * the copies were wrong in ways only a live market shows:
 *
 *  - **A throttle layer that nothing called.** `updateOrderbookData`,
 *    `updateTradesData`, `updateLastPrice` and `subscribeToMarketData` were
 *    ~150 lines of pending-buffer and last-update refs with zero call sites;
 *    the live subscription called `setOrderbookData` directly. So the book
 *    re-rendered once per WebSocket message, and the `MAX_ORDERBOOK_ITEMS` cut
 *    those functions applied never ran either. Ingestion now lives in
 *    `useOrderBook`, which commits at most once per animation frame.
 *  - **Both sides grouped DOWNWARD.** An ask at 100.4 and a bid at 100.2 both
 *    landed on 100 at a tick of 1, and the panel drew a book whose best bid
 *    equalled its best ask. `buildBook` floors bids and ceils asks.
 *  - **React keys with the array index in them**, so inserting one level at the
 *    top remounted every row beneath it. That is also why no level could ever
 *    flash: the element the animation would run on was replaced on the frame
 *    the animation was supposed to start.
 *  - **`memo` on the row defeated by inline closures** — every row received a
 *    fresh `onMouseEnter` per parent render, so the comparison never held and
 *    all hundred rows re-rendered on every tick.
 *  - **A `cursor-pointer` on a row with no click handler.** The affordance was
 *    a lie; clicking a level now fills the order form.
 *
 * ---------------------------------------------------------------------------
 * THE PIECES THAT ARE DELIBERATELY NOT LOCAL
 * ---------------------------------------------------------------------------
 *
 * `@/lib/orderbook` owns the maths and `@/hooks/use-order-book` owns
 * ingestion, because the Pro terminal's book had independently grown its own
 * versions of both and they had already drifted apart. A rule that lives in
 * one place cannot disagree with itself.
 */

interface OrderBookPanelProps {
  symbol?: Symbol;
  marketType?: MarketType;
  currency?: string;
  pair?: string;
  /** ccxt-shaped market metadata; supplies the real price/amount precision. */
  metadata?: {
    precision?: { price?: number; amount?: number };
  };
}

/** Rows kept per side. The subscription asks for the same number. */
const BOOK_DEPTH = 50;

/** Rows drawn per side in the stacked (narrow) layout. */
const STACKED_ROWS = 14;

const MAX_TRADES = 30;

/**
 * Panel width below which the two ladders stack instead of sitting side by
 * side. Measured on the PANEL, not the window: this is a docked cell in a
 * resizable grid, and a narrow book on a wide monitor was previously drawn in
 * the two-column layout because `window.innerWidth` said "desktop".
 */
const SIDE_BY_SIDE_MIN_WIDTH = 380;

/** What the depth bar measures. */
type DepthBasis = "amount" | "cumulative";

/** Which ladders are drawn. */
type DisplayMode = "both" | "bids" | "asks";

/*
  The click-to-fill event lives in `./selection-event`, not here: an order ticket
  needs the event name and its detail shape and nothing else, and importing them
  from this file would pull the whole panel — this stylesheet, the feed hook, the
  book maths — into every chunk that renders a form.
*/
export { ORDERBOOK_SELECT_EVENT } from "./selection-event";
export type { OrderbookSelectDetail } from "./selection-event";

/* ------------------------------------------------------------------ *
 * Row
 * ------------------------------------------------------------------ */

interface BookRowProps {
  level: BookLevel;
  side: "bid" | "ask";
  /** Distance from the touch of the book. The hover is addressed by this. */
  slot: number;
  depth: number;
  /** Inside the hovered sweep, i.e. between the best price and the pointer. */
  inSweep: boolean;
  /** The hovered row itself — carries the sweep's lower rule. */
  sweepEdge: boolean;
  showCumulative: boolean;
  /** Which edge the depth bar grows from. */
  anchor: "left" | "right";
  /** Stacked layout spreads the columns to the panel edges. */
  split: boolean;
  dense: boolean;
  formatPrice: (value: number) => string;
  formatAmount: (value: number) => string;
  formatTotal: (value: number) => string;
  onHover: (side: "bid" | "ask", slot: number) => void;
  onHoverEnd: () => void;
  onSelect: (
    side: "bid" | "ask",
    level: BookLevel,
    withSize: boolean
  ) => void;
}

/**
 * One level.
 *
 * Every callback it receives is stable and every value it receives is a
 * primitive or the level object itself, so the default `memo` comparison is
 * meaningful: on a frame where only three levels moved, three rows re-render.
 * The previous version took four inline arrow functions per row and re-rendered
 * all of them, every frame, forever.
 */
const BookRow = memo(function BookRow({
  level,
  side,
  slot,
  depth,
  inSweep,
  sweepEdge,
  showCumulative,
  anchor,
  split,
  dense,
  formatPrice,
  formatAmount,
  formatTotal,
  onHover,
  onHoverEnd,
  onSelect,
}: BookRowProps) {
  const isBid = side === "bid";

  const handleEnter = useCallback(
    () => onHover(side, slot),
    [onHover, side, slot]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent) => onSelect(side, level, event.shiftKey || event.altKey),
    [onSelect, side, level]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(side, level, event.shiftKey || event.altKey);
    },
    [onSelect, side, level]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      /* Read out as a whole rather than three loose numbers: a screen reader
         landing on a book row needs "bid 68,412.50, size 0.42" in one string,
         not a tour of the grid cells. */
      aria-label={`${side === "bid" ? "bid" : "ask"} ${formatPrice(level.price)}, ${formatAmount(level.amount)}`}
      className={cn(
        "ob-row grid grid-cols-3 border-b border-border/60",
        "cursor-pointer transition-colors hover:bg-surface-3/60",
        dense ? "py-1 px-1 text-[10px]" : "py-1.5 px-2 text-xs",
        inSweep && "ob-in-sweep",
        sweepEdge && "ob-sweep-edge"
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={onHoverEnd}
      onFocus={handleEnter}
      onBlur={onHoverEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ "--ob-depth": `${depth}%` } as React.CSSProperties}
    >
      <div
        aria-hidden
        className={cn(
          "ob-depth",
          isBid ? "ob-depth-bid" : "ob-depth-ask",
          anchor === "right" ? "ob-depth-right" : "ob-depth-left"
        )}
      />
      <div
        className={cn(
          "font-medium relative z-10 tabular-nums",
          directionText(isBid),
          split ? "text-left" : "text-center"
        )}
      >
        {formatPrice(level.price)}
      </div>
      <div className="text-foreground relative z-10 text-center tabular-nums">
        {formatAmount(level.amount)}
      </div>
      <div
        className={cn(
          "text-foreground relative z-10 tabular-nums",
          split ? "text-right" : "text-center"
        )}
      >
        {showCumulative
          ? formatAmount(level.cumulative)
          : formatTotal(level.total)}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Spread strip
 * ------------------------------------------------------------------ */

/**
 * Last price, spread and mid, between the two ladders.
 *
 * The desktop layout had none of this: `LastPriceBanner` was invoked only from
 * the mobile branch and no spread was computed anywhere in the file, so the
 * side-by-side book showed neither the last trade nor the gap between the two
 * sides it was drawing.
 */
const SpreadStrip = memo(function SpreadStrip({
  book,
  lastPrice,
  direction,
  formatPrice,
  labels,
}: {
  book: BookSnapshot;
  lastPrice: number | null;
  direction: "up" | "down" | null;
  formatPrice: (value: number) => string;
  labels: { spread: string; mid: string; crossed: string };
}) {
  const hasLast = typeof lastPrice === "number" && Number.isFinite(lastPrice);

  return (
    <div
      /*
        THE STRIP DOES NOT CHANGE COLOUR ON A TICK.

        It used to swap its whole background and border between `bg-up/10`,
        `bg-down/10` and `bg-surface-2` on every price direction — with a 300ms
        transition, and `usePriceDirection` clearing it again a second later. On
        an active market that is a wide block of colour breathing green/red/grey
        without pause, several times louder than the per-level flashes it sits
        between, and it drowns them out. A tick is a small event and gets a small
        signal: the numeral and its glyph.

        A CROSSED book keeps the full treatment, because that is a STATE rather
        than a tick — it persists, and it is worth being loud about.
      */
      className={cn(
        "flex-shrink-0 border-y px-2 py-1.5",
        book.crossed
          ? "border-destructive bg-destructive/10"
          : "border-border bg-surface-2"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/*
            A RESERVED BOX, always present, whatever is inside it.

            The glyph used to be `null` when there was no direction, so it took
            no width — and it appears and disappears about once a second as
            prices tick, shoving the price 20px sideways each time. A slot that
            is always in the layout cannot do that; only its CONTENTS change.
          */}
          <span
            aria-hidden
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
          >
            {book.crossed ? (
              <AlertTriangle className="ob-crossed h-3.5 w-3.5 text-destructive" />
            ) : direction === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-up" />
            ) : direction === "down" ? (
              <TrendingDown className="h-3.5 w-3.5 text-down" />
            ) : null}
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums truncate transition-colors duration-300",
              /* The last traded price IS its direction, which is the case the
                 design system keeps the direction token for. */
              direction === "up"
                ? directionText(true)
                : direction === "down"
                  ? directionText(false)
                  : "text-foreground"
            )}
          >
            {hasLast ? formatPrice(lastPrice as number) : "—"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
          {book.crossed ? (
            <span className="text-foreground font-medium">{labels.crossed}</span>
          ) : (
            <>
              <span className="tabular-nums">
                {labels.spread}{" "}
                <span className="text-foreground">
                  {book.spread === null ? "—" : formatPrice(book.spread)}
                </span>
                {book.spreadPercent !== null && (
                  <span className="text-foreground">
                    {" "}
                    ({formatSpreadPercent(book.spreadPercent)})
                  </span>
                )}
              </span>
              <span className="tabular-nums hidden sm:inline">
                {labels.mid}{" "}
                <span className="text-foreground">
                  {book.mid === null ? "—" : formatPrice(book.mid)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * A spread percentage that stays informative when it is tiny.
 *
 * The Pro terminal's version has no branch for a negative value at all, so it
 * prints a CROSSED book as `<0.01bp` — the tightest possible spread, for the
 * one condition a trader most needs to see. This one keeps the sign.
 */
function formatSpreadPercent(percentage: number): string {
  const magnitude = Math.abs(percentage);
  if (magnitude >= 1) return `${percentage.toFixed(2)}%`;
  if (magnitude >= 0.01) return `${percentage.toFixed(3)}%`;
  const basisPoints = percentage * 100;
  if (Math.abs(basisPoints) >= 0.01) return `${basisPoints.toFixed(2)}bp`;
  return percentage === 0 ? "0bp" : "<0.01bp";
}

/* ------------------------------------------------------------------ *
 * Imbalance
 * ------------------------------------------------------------------ */

/**
 * Bid share of the displayed depth, as a two-tone bar plus both percentages.
 *
 * Reads at a glance the way no column of numbers does: which side of this book
 * is actually carrying size. The bar is measured over exactly the levels drawn
 * above it, so it never disagrees with what is on screen.
 */
const ImbalanceBar = memo(function ImbalanceBar({
  book,
  formatAmount,
}: {
  book: BookSnapshot;
  formatAmount: (value: number) => string;
}) {
  if (book.imbalance === null) return null;
  const bidShare = Math.round(book.imbalance * 1000) / 10;

  return (
    <div className="flex h-[30px] flex-col justify-center px-2">
      <div className="flex items-center justify-between text-[10px] leading-tight tabular-nums">
        <span className={directionText(true)}>{bidShare.toFixed(1)}%</span>
        <span className="text-muted-foreground truncate px-1">
          {formatAmount(book.bidVolume)} / {formatAmount(book.askVolume)}
        </span>
        <span className={directionText(false)}>
          {(100 - bidShare).toFixed(1)}%
        </span>
      </div>
      <div
        className="mt-1 flex h-1 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={`${bidShare.toFixed(0)}% bids`}
      >
        <div
          className="ob-imbalance-fill bg-up"
          style={{ width: `${bidShare}%` }}
        />
        <div className="ob-imbalance-fill bg-down flex-1" />
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Panel
 * ------------------------------------------------------------------ */

export default function OrderBookPanel({
  symbol = "BTCUSDT",
  marketType = "spot",
  currency,
  pair,
  metadata,
}: OrderBookPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");

  const [tickSize, setTickSize] = useState(0);
  const [depthBasis, setDepthBasis] = useState<DepthBasis>("amount");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  /*
     Addressed by SLOT — the row's distance from the touch of the book — not by
     price. A book is live: the level under the pointer gets consumed and on the
     next frame that price is not in the array. Keyed by price, the summary's
     `find` then returned nothing and the card vanished while the ladder's tint,
     which compared a RANGE, still matched — and degraded far worse, because
     once the hovered price fell outside the book's span EVERY remaining bid
     satisfied `price >= hover.price` and the whole buy side lit up as swept.
     Slot N is valid for as long as the ladder is N levels deep. The Pro
     terminal was fixed this way; this is the same fix in the retail panel. */
  const [hover, setHover] = useState<{ side: "bid" | "ask"; slot: number } | null>(
    null
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const [tradesData, setTradesData] = useState<TradeData[]>([]);
  const [tradesReady, setTradesReady] = useState(false);
  const [sideBySide, setSideBySide] = useState(true);
  /**
   * Share of displayed depth written by the venue's market maker, or null for "not known".
   *
   * Null on every market with no maker and on frames that carry no provenance, so the
   * notice below appears only where there is genuinely something to disclose.
   */
  const [aiDepthShare, setAiDepthShare] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  /*
     How many rows this layout actually draws — and therefore the depth the book
     is BUILT at, not a slice taken afterwards.

     `@/lib/orderbook` states the rule it exists to enforce: depth is measured
     over exactly what is rendered, so `maxAmount` / `maxCumulative` are computed
     after the cut. Slicing `book.bids` after `buildBook` broke it here — the
     stacked layout drew 14 rows and scaled every depth bar against maxima taken
     over 50 levels, so on the cumulative basis the widest bar could only reach
     the 14-of-50 fraction and the whole ladder rendered as a column of stubs.
     With `depth` passed in, `use-order-book` rebuilds from the last payload on a
     resize across `SIDE_BY_SIDE_MIN_WIDTH`, so the change lands without waiting
     for the market to move. The SUBSCRIPTION still asks for `BOOK_DEPTH` — the
     frame stays 50 deep, `buildBook` makes the cut. */
  const rowsPerSide = sideBySide ? BOOK_DEPTH : STACKED_ROWS;

  const {
    book,
    hasData: bookReady,
    push: pushBook,
    reset: resetBook,
  } = useOrderBook({ tickSize, depth: rowsPerSide });

  const direction = usePriceDirection(lastPrice);

  /* ---------------------------------------------------------------- *
   * Precision and formatters
   * ---------------------------------------------------------------- */

  const pricePrecision = useMemo(() => {
    const declared = metadata?.precision?.price;
    if (typeof declared === "number" && declared >= 0) return Math.min(12, declared);
    // No metadata: infer from the price rather than printing ten decimals on a
    // $100,000 asset, which is what the old magnitude ladder did.
    const reference = lastPrice ?? book.mid ?? 0;
    if (reference >= 1000) return 2;
    if (reference >= 1) return 4;
    if (reference >= 0.01) return 6;
    return 8;
  }, [metadata?.precision?.price, lastPrice, book.mid]);

  const amountPrecision = useMemo(() => {
    const declared = metadata?.precision?.amount;
    if (typeof declared === "number" && declared >= 0) return Math.min(12, declared);
    return 6;
  }, [metadata?.precision?.amount]);

  /* Fixed decimals, not trimmed ones. A ladder is read by scanning a column of
     digits, and `0.5` sitting above `0.51234567` breaks the scan — which is
     what the old `toFixed(8).replace(/\.?0+$/, "")` produced on every row. */
  const formatPrice = useCallback(
    (value: number): string =>
      Number.isFinite(value) ? value.toFixed(pricePrecision) : "—",
    [pricePrecision]
  );

  const formatAmount = useCallback(
    (value: number): string =>
      Number.isFinite(value) ? value.toFixed(amountPrecision) : "—",
    [amountPrecision]
  );

  const formatTotal = useCallback(
    (value: number): string =>
      Number.isFinite(value) ? value.toFixed(Math.min(pricePrecision, 4)) : "—",
    [pricePrecision]
  );

  /* ---------------------------------------------------------------- *
   * Grouping ladder
   * ---------------------------------------------------------------- */

  const groupingOptions = useMemo(
    () => tickSizeOptions(lastPrice ?? book.mid, pricePrecision),
    [lastPrice, book.mid, pricePrecision]
  );

  /*
    Everything that belongs to the OLD market, dropped during render.

    React's documented way to adjust state when a prop changes, and here it is
    also the only correct one: an effect runs after the commit, so the panel
    would paint one frame with the previous market's book, spread and last price
    sitting under the new market's name. The grouping has to go with them — a
    tick of 0.01 carried over to a market priced at 0.00003 folds its entire
    book into a single row.
  */
  const [market, setMarket] = useState(`${symbol}|${marketType}`);
  if (market !== `${symbol}|${marketType}`) {
    setMarket(`${symbol}|${marketType}`);
    setTickSize(0);
    setLastPrice(null);
    setTradesData([]);
    setTradesReady(false);
    setHover(null);
    // Cleared with the book. Carrying the previous market's figure across a switch would
    // put a disclosure on a market it is not true of, which is worse than showing none.
    setAiDepthShare(null);
    resetBook();
  }

  const groupingValue = tickSize > 0 ? String(tickSize) : "0";

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  /* Measured on the panel. `window.innerWidth` was the previous trigger, which
     is wrong for a cell inside a resizable grid: a 300px-wide book on a 4K
     monitor was drawn in the two-column layout and every number in it clipped. */
  useEffect(() => {
    const node = panelRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSideBySide(entry.contentRect.width >= SIDE_BY_SIDE_MIN_WIDTH);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------------- *
   * Interaction
   * ---------------------------------------------------------------- */

  const handleHover = useCallback((side: "bid" | "ask", slot: number) => {
    setHover({ side, slot });
  }, []);

  const handleHoverEnd = useCallback(() => setHover(null), []);

  const handleSelect = useCallback(
    (side: "bid" | "ask", level: BookLevel, withSize: boolean) => {
      const detail: OrderbookSelectDetail = {
        price: level.price,
        amount: level.amount,
        cumulative: level.cumulative,
        side,
        withSize,
      };
      window.dispatchEvent(
        new CustomEvent<OrderbookSelectDetail>(ORDERBOOK_SELECT_EVENT, { detail })
      );
    },
    []
  );

  /* ---------------------------------------------------------------- *
   * Subscriptions
   * ---------------------------------------------------------------- */

  /* Trades arrive as whole snapshots from the 2-second server poller AND as
     two-row deltas the moment a fill executes, so they are merged rather than
     replaced — replacing truncated the tape to two rows on every real trade.
     Coalesced onto a frame for the same reason the book is: a sweep through a
     ladder fires one delta per level touched. */
  const pendingTradesRef = useRef<TradeData[] | null>(null);
  const tradesFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const flushTrades = useCallback(() => {
    tradesFrameRef.current = null;
    const incoming = pendingTradesRef.current;
    pendingTradesRef.current = null;
    if (!incoming || !mountedRef.current) return;

    setTradesData((previous) => {
      const seen = new Set<string>();
      const merged: TradeData[] = [];
      for (const trade of [...incoming, ...previous]) {
        if (!trade) continue;
        const price = toNum(trade.price);
        const amount = toNum(trade.amount);
        if (!Number.isFinite(price) || !Number.isFinite(amount)) continue;
        /* Keyed by the trade's own facts, not by `id`: a partial fill delta
           carries the ORDER id, so several rows of one sweep share it. */
        const key = `${trade.timestamp}|${price}|${amount}|${trade.side}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(trade);
      }
      merged.sort((a, b) => toNum(b.timestamp) - toNum(a.timestamp));
      return merged.slice(0, MAX_TRADES);
    });
    setTradesReady(true);
  }, []);

  const pushTrades = useCallback(
    (incoming: TradeData[]) => {
      pendingTradesRef.current = incoming;
      if (tradesFrameRef.current !== null) return;
      if (typeof requestAnimationFrame !== "function") {
        flushTrades();
        return;
      }
      tradesFrameRef.current = requestAnimationFrame(flushTrades);
    },
    [flushTrades]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (tradesFrameRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(tradesFrameRef.current);
      }
      tradesFrameRef.current = null;
    };
  }, []);

  /* Connection status is keyed on the market type AND the symbol. It used to be
     keyed on the market type alone while `cleanupSubscriptions` tore it down on
     every symbol change, so switching pairs within spot killed the indicator
     permanently for the life of the panel. */
  useEffect(() => {
    const unsubscribe = marketDataWs.subscribeToConnectionStatus(
      (status) => {
        if (mountedRef.current) setConnectionStatus(status);
      },
      marketType
    );
    /* Read back through the same setter the listener uses, so the first paint
       after a market change is not stuck on the previous socket's status. The
       call is what `subscribeToConnectionStatus` cannot do for us: it reports
       CHANGES, and the status may already be settled. */
    if (mountedRef.current) {
      setConnectionStatus(marketDataWs.getConnectionStatus(marketType));
    }
    return unsubscribe;
  }, [marketType, symbol]);

  useEffect(() => {
    if (!symbol) return;

    marketDataWs.initialize();

    /* The state reset happens during render, above — this effect only owns the
       subscriptions. */
    pendingTradesRef.current = null;

    const unsubscribeTicker = marketDataWs.subscribe<TickerData>(
      { symbol, type: "ticker", marketType },
      (data) => {
        if (!mountedRef.current) return;
        const next = toNum(data?.last);
        if (!Number.isFinite(next) || next <= 0) return;
        setLastPrice(next);
      }
    );

    const unsubscribeOrderbook = marketDataWs.subscribe<OrderbookData>(
      { symbol, type: "orderbook", marketType, limit: BOOK_DEPTH },
      (data) => {
        if (!mountedRef.current) return;
        /* A payload that names a DIFFERENT market is dropped rather than drawn.
           The transport routes on a stream key that does not contain the
           symbol, so the tail of the previous market's feed can arrive after a
           switch — and a book from the wrong instrument is worse than none. */
        if (data?.symbol && data.symbol !== symbol) return;
        pushBook(data);

        /*
          HOW MUCH OF THIS DEPTH IS THE VENUE'S OWN MARKET MAKER.

          Read straight off the frame rather than threaded through `useOrderBook`,
          because the grouping the hook performs is exactly what would make this
          number wrong: levels are merged into tick buckets, so a bucket can hold
          both customer and maker depth and no per-row boolean survives the merge
          honestly. The SHARE of displayed size is a statement that stays true
          through any grouping.

          `undefined` and `0` are different answers and are kept different. The
          matching engine's push path carries no provenance, so an absent `ai` is
          "not known" — the notice hides rather than claiming the book is all real.
        */
        const ai = data?.ai;
        if (!ai) {
          setAiDepthShare(null);
          return;
        }
        const sum = (levels?: Array<[number, number]>) =>
          Array.isArray(levels)
            ? levels.reduce((total, level) => total + (toNum(level?.[1]) || 0), 0)
            : 0;
        const total = sum(data.bids) + sum(data.asks);
        const synthetic = sum(ai.bids) + sum(ai.asks);
        setAiDepthShare(total > 0 ? synthetic / total : null);
      }
    );

    const unsubscribeTrades = marketDataWs.subscribe<TradeData[]>(
      { symbol, type: "trades", marketType },
      (data) => {
        if (!mountedRef.current) return;
        if (!Array.isArray(data)) return;
        if (data.length === 0) {
          setTradesReady(true);
          return;
        }
        pushTrades(data);
      }
    );

    return () => {
      unsubscribeTicker();
      unsubscribeOrderbook();
      unsubscribeTrades();
    };
  }, [symbol, marketType, pushBook, pushTrades, resetBook]);

  /* The legacy layout announces a market switch on this event before the props
     change. Clearing here stops the previous market's book being drawn under
     the new market's header for the commit in between. */
  useEffect(() => {
    const handle = () => {
      resetBook();
      setLastPrice(null);
      setTradesData([]);
      setTradesReady(false);
      setHover(null);
      pendingTradesRef.current = null;
    };
    window.addEventListener("market-switching-cleanup", handle);
    return () => window.removeEventListener("market-switching-cleanup", handle);
  }, [resetBook]);

  /* ---------------------------------------------------------------- *
   * Derived view state
   * ---------------------------------------------------------------- */

  /* The book is already cut to `rowsPerSide` by `buildBook`, so these are the
     rendered ladders as-is. Slicing again here is what put the depth
     denominators out of step with the rows. */
  const bids = book.bids;
  const asks = book.asks;

  /**
   * The sweep readout: everything between the touch of the book and the
   * pointer, which is the question "what would it cost me to take this out".
   *
   * `sweepSummary` reads the hovered level's own running totals, so it is the
   * same arithmetic the rows above it are already showing rather than a second,
   * separately-derived number that can disagree — and it addresses the level by
   * slot, so a price being consumed mid-hover is not an event it has to survive.
   */
  const sweep = useMemo(() => {
    if (!hover) return null;
    const summary = sweepSummary(hover.side === "bid" ? bids : asks, hover.slot);
    if (!summary) return null;
    return {
      side: hover.side,
      price: summary.price,
      size: summary.amount,
      value: summary.value,
      average: summary.avgPrice,
    };
  }, [hover, bids, asks]);

  /* Slot-ordered, so the tint covers exactly the levels the summary counted:
     everything from the touch of the book down to the pointer, and nothing once
     the ladder is shorter than the hovered slot. */
  const inSweep = useCallback(
    (side: "bid" | "ask", slot: number): boolean =>
      hover?.side === side && slot <= hover.slot,
    [hover]
  );

  /*
     Third column: the running base size on the cumulative basis, this row's
     price x amount on the other — two different quantities in two different
     UNITS, which is why each carries its own currency the way price and amount
     already do. Without it the column silently changes meaning and magnitude
     when the toggle is pressed, and reads as though the book re-sorted itself.
     The Pro terminal names these the same two things. */
  const bookColumns = useMemo(() => {
    const totalLabel =
      depthBasis === "cumulative" ? tCommon("total") : tCommon("value");
    const totalUnit = depthBasis === "cumulative" ? currency : pair;
    return [
      pair ? `${tCommon("price")} (${pair})` : tCommon("price"),
      currency ? `${tCommon("amount")} (${currency})` : tCommon("amount"),
      totalUnit ? `${totalLabel} (${totalUnit})` : totalLabel,
    ];
  }, [pair, currency, depthBasis, tCommon]);

  const spreadLabels = useMemo(
    () => ({
      spread: tCommon("spread"),
      mid: tTrade("mid"),
      crossed: tTrade("crossed_book"),
    }),
    /* The translators this actually calls. It listed `t`, which it does not
       use, and omitted `tTrade`, which it does — so a locale switch could hand
       the spread strip the previous language's labels. */
    [tCommon, tTrade]
  );

  const isEmpty = book.bids.length === 0 && book.asks.length === 0;
  const showBids = displayMode !== "asks";
  const showAsks = displayMode !== "bids";

  /* ---------------------------------------------------------------- *
   * Ladder renderers
   * ---------------------------------------------------------------- */

  const renderLevels = useCallback(
    (
      levels: BookLevel[],
      side: "bid" | "ask",
      options: { anchor: "left" | "right"; split: boolean; dense: boolean }
    ) =>
      levels.map((level, slot) => (
        <BookRow
          /* Keyed by PRICE and side alone. With the array index in the key —
             which is what this file used to do — inserting one level at the top
             of the book changed the key of every row beneath it, React
             discarded and rebuilt the whole ladder, and no CSS animation on a
             row could ever survive to a second frame. The slot below is a
             VALUE, not a key: it is how far this row sits from the touch of the
             book, which is what a sweep is measured in. */
          key={`${side}-${level.price}`}
          level={level}
          side={side}
          slot={slot}
          depth={depthPercent(level, book, depthBasis, side)}
          inSweep={inSweep(side, slot)}
          sweepEdge={hover?.side === side && hover.slot === slot}
          showCumulative={depthBasis === "cumulative"}
          anchor={options.anchor}
          split={options.split}
          dense={options.dense}
          formatPrice={formatPrice}
          formatAmount={formatAmount}
          formatTotal={formatTotal}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
          onSelect={handleSelect}
        />
      )),
    [
      book,
      depthBasis,
      inSweep,
      hover,
      formatPrice,
      formatAmount,
      formatTotal,
      handleHover,
      handleHoverEnd,
      handleSelect,
    ]
  );

  return (
    <div ref={panelRef} className="flex flex-col h-full">
      <Tabs defaultValue="orderbook" className="flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-2 flex-shrink-0">
          <TabTrigger value="orderbook" icon={<BarChart2 className="h-3 w-3" />}>
            {tCommon("order_book")}
          </TabTrigger>
          <TabTrigger value="trades" icon={<Clock className="h-3 w-3" />}>
            {tCommon("recent_trades")}
          </TabTrigger>
        </TabsList>

        <TabContent
          value="orderbook"
          className="flex flex-col flex-grow overflow-hidden"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-1 px-1 py-0.5 border-b border-border bg-surface-2 flex-shrink-0">
            <div
              role="group"
              aria-label={tTrade("book_display_mode")}
              className="flex items-center gap-0.5"
            >
              <DisplayModeButton
                active={displayMode === "both"}
                onClick={() => setDisplayMode("both")}
                label={tTrade("bids_and_asks")}
              >
                <Rows3 className="h-3 w-3" />
              </DisplayModeButton>
              <DisplayModeButton
                active={displayMode === "bids"}
                onClick={() => setDisplayMode("bids")}
                label={tTrade("bids_only")}
              >
                <span className={cn("text-[9px] font-bold", directionText(true))}>
                  B
                </span>
              </DisplayModeButton>
              <DisplayModeButton
                active={displayMode === "asks"}
                onClick={() => setDisplayMode("asks")}
                label={tTrade("asks_only")}
              >
                <span className={cn("text-[9px] font-bold", directionText(false))}>
                  A
                </span>
              </DisplayModeButton>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setDepthBasis((mode) =>
                    mode === "amount" ? "cumulative" : "amount"
                  )
                }
                aria-pressed={depthBasis === "cumulative"}
                title={
                  depthBasis === "cumulative"
                    ? t("depth_shows_running_total")
                    : t("depth_shows_level_size")
                }
                className="flex items-center rounded p-0.5 text-[10px] text-muted-foreground hover:text-primary"
              >
                <Columns2 className="mr-0.5 h-3 w-3" />
                {/* The same two words the third column's own header uses. This
                    button said "Total" / "Size" for a column headed
                    "Total" / "Value", so one quantity carried three names in a
                    panel eight rows tall. */}
                {depthBasis === "cumulative" ? tCommon("total") : tCommon("value")}
              </button>

              <span className="text-[10px] text-muted-foreground">
                {tCommon("group")}
              </span>
              <Select
                value={groupingValue}
                onValueChange={(value) => setTickSize(Number(value))}
              >
                <SelectTrigger
                  aria-label={tCommon("group")}
                  className="h-auto gap-1 rounded border-border bg-surface-3 px-1 py-0 text-[10px] leading-none shadow-none [&_svg]:size-3"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* "0" is the market's own tick — every price exactly as it
                      rests. The old ladder had no such option and defaulted to
                      0.000001, which is the same thing for most instruments but
                      says something false about the ones it is not. */}
                  <SelectItem value="0" className="text-[10px]">
                    {tCommon("no_grouping")}
                  </SelectItem>
                  {groupingOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={String(option)}
                      className="text-[10px]"
                    >
                      {formatTickSize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {connectionStatus === ConnectionStatus.DISCONNECTED && bookReady && (
            <div className="flex-shrink-0 border-b border-warning/40 bg-warning/10 px-2 py-1 text-[10px] text-foreground">
              {tCommon("reconnecting")}…
            </div>
          )}

          {/*
            WHOSE DEPTH THIS IS.

            The venue's own market maker writes levels into this book, and until
            now nothing said so: a customer sizing an order against the ladder
            could not tell order-backed liquidity from a synthetic one. The
            platform's public market-data endpoint already draws that distinction
            for aggregators; showing the same thing to the people actually
            trading on it is the point of this line.

            Shown only when there IS maker depth in the frame — `aiDepthShare` is
            null on every market without one, and on frames whose producer does
            not know. Rounded up to a whole percent so a book that is 0.4% maker
            still says 1% rather than "0%", which would read as a denial.
          */}
          {aiDepthShare !== null && aiDepthShare > 0 && bookReady ? (
            <div className="flex-shrink-0 border-b border-border bg-surface-2 px-2 py-1 text-[10px] text-muted-foreground">
              {t("market_maker_depth_notice", {
                percent: Math.max(1, Math.round(aiDepthShare * 100)),
              })}
            </div>
          ) : null}

          {!bookReady ? (
            <div className="flex items-center justify-center flex-grow">
              <Spinner />
            </div>
          ) : isEmpty ? (
            <div className="flex items-center justify-center flex-grow">
              <EmptyState
                icon={<BarChart2 className="h-8 w-8" />}
                title={t("no_orderbook_data")}
                hint={t("waiting_for_market_data")}
              />
            </div>
          ) : sideBySide ? (
            /* Two ladders, best prices at the top of each. */
            <div className="flex flex-col flex-grow overflow-hidden">
              <div className="grid grid-cols-2 flex-grow overflow-hidden">
                {showBids && (
                  <div
                    className={cn(
                      "flex flex-col h-full overflow-hidden",
                      showAsks && "border-r border-border"
                    )}
                  >
                    <ColumnHeader labels={bookColumns} />
                    <div className="overflow-y-auto flex-grow scrollbar-none">
                      {renderLevels(bids, "bid", {
                        anchor: "right",
                        split: false,
                        dense: true,
                      })}
                    </div>
                  </div>
                )}
                {showAsks && (
                  <div className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader labels={bookColumns} />
                    <div className="overflow-y-auto flex-grow scrollbar-none">
                      {renderLevels(asks, "ask", {
                        anchor: "left",
                        split: false,
                        dense: true,
                      })}
                    </div>
                  </div>
                )}
              </div>
              <SpreadStrip
                book={book}
                lastPrice={lastPrice}
                direction={direction}
                formatPrice={formatPrice}
                labels={spreadLabels}
              />
            </div>
          ) : (
            /* One ladder: asks descending into the spread, bids below it. */
            <div className="flex flex-col flex-grow overflow-hidden min-h-0">
              <ColumnHeader labels={bookColumns} align="spread" size="text-[10px]" />
              {showAsks && (
                <div className="flex-1 overflow-y-auto scrollbar-none min-h-0 flex flex-col-reverse">
                  {/* `flex-col-reverse` puts the BEST ask at the bottom, next
                      to the spread, while the array stays best-first — so the
                      cumulative still runs outward from the touch of the book,
                      which is what the column means. Reversing the array
                      instead is how the Pro terminal ended up accumulating
                      from its worst displayed ask. */}
                  {renderLevels(asks, "ask", {
                    anchor: "right",
                    split: true,
                    dense: false,
                  })}
                </div>
              )}
              <SpreadStrip
                book={book}
                lastPrice={lastPrice}
                direction={direction}
                formatPrice={formatPrice}
                labels={spreadLabels}
              />
              {showBids && (
                <div className="flex-1 overflow-y-auto scrollbar-none min-h-0">
                  {renderLevels(bids, "bid", {
                    anchor: "right",
                    split: true,
                    dense: false,
                  })}
                </div>
              )}
            </div>
          )}

          {/*
            ONE BOX, FIXED HEIGHT, two things that can occupy it.

            These were two siblings of different heights swapped on hover, so
            moving the pointer over the book resized the footer and the ladders
            above it jumped. Whatever is inside, the box is the same 30px.
          */}
          {bookReady && !isEmpty && (
            <div
              className={cn(
                "flex-shrink-0 border-t border-border",
                sweep ? "bg-surface-3" : "bg-surface-2"
              )}
            >
              {sweep ? (
                <div className="flex h-[30px] flex-col justify-center px-2 text-[10px] leading-tight tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <span className={directionText(sweep.side === "bid")}>
                      {t("sweep_to")} {formatPrice(sweep.price)}
                    </span>
                    <span className="text-foreground truncate">
                      {formatAmount(sweep.size)}
                      {currency ? ` ${currency}` : ""} ·{" "}
                      {formatTotal(sweep.value)}
                      {pair ? ` ${pair}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{tCommon("average_price")}</span>
                    <span className="text-foreground">
                      {formatPrice(sweep.average)}
                    </span>
                  </div>
                </div>
              ) : (
                <ImbalanceBar book={book} formatAmount={formatAmount} />
              )}
            </div>
          )}
        </TabContent>

        <TabContent
          value="trades"
          className="flex flex-col flex-grow overflow-hidden"
        >
          <ColumnHeader
            labels={[
              pair ? `${tCommon("price")} (${pair})` : tCommon("price"),
              tCommon("amount"),
              tCommon("time"),
            ]}
          />
          <div className="overflow-y-auto flex-grow scrollbar-none">
            {!tradesReady ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-5 w-5" />
              </div>
            ) : tradesData.length === 0 ? (
              <EmptyState
                compact
                icon={<Clock className="h-5 w-5" />}
                title={tCommon("no_recent_trades")}
              />
            ) : (
              tradesData.map((trade, index) => (
                <TradeTapeRow
                  key={`${trade.timestamp}-${toNum(trade.price)}-${toNum(trade.amount)}-${trade.side}-${index}`}
                  trade={trade}
                  formatPrice={formatPrice}
                  formatAmount={formatAmount}
                />
              ))
            )}
          </div>
        </TabContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Small parts
 * ------------------------------------------------------------------ */

function DisplayModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-4 w-5 items-center justify-center rounded transition-colors",
        active
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-3/60"
      )}
    >
      {children}
    </button>
  );
}

/**
 * One row of the tape.
 *
 * Times go through the browser's own locale rather than a hardcoded `en-US`,
 * which is what the Pro terminal's tape does and what makes a translated panel
 * print an untranslated clock.
 */
const TradeTapeRow = memo(function TradeTapeRow({
  trade,
  formatPrice,
  formatAmount,
}: {
  trade: TradeData;
  formatPrice: (value: number) => string;
  formatAmount: (value: number) => string;
}) {
  // Its own hook rather than a prop: this row is `memo`'d and rendered fifty at a time, so
  // threading a formatter down would add a prop that changes identity on every locale read
  // and defeat the memo it is passed through.
  const t = useTranslations("trade_components");
  const isBuy = String(trade.side || "").toLowerCase() === "buy";
  const stamp = toNum(trade.timestamp);
  const time = Number.isFinite(stamp) && stamp > 0
    ? new Date(stamp).toLocaleTimeString()
    : "—";

  /*
   * A BOT PRINT IS MARKED AS ONE.
   *
   * `isAiTrade` has always been on the wire and nothing read it, while the platform's own
   * public market-data endpoint already filters these rows OUT — so aggregators saw a tape
   * without them and the venue's own customers saw one with them, unlabelled. Whatever is
   * decided about keeping synthetic prints at all, the two audiences must at least be
   * shown the same thing.
   *
   * A dot rather than a badge: the tape is a dense three-column grid read at a glance, and
   * a text chip on every other row would cost more legibility than the disclosure is
   * worth. The title carries the words for anyone who asks.
   */
  const isBot = trade.isAiTrade === true;

  return (
    <div className="ob-row-enter grid grid-cols-3 py-1.5 px-2 hover:bg-surface-3/60 border-b border-border transition-colors">
      <div
        className={cn(
          "text-xs font-medium text-center tabular-nums",
          directionText(isBuy)
        )}
      >
        {formatPrice(toNum(trade.price))}
      </div>
      <div className="text-xs text-foreground text-center tabular-nums">
        {formatAmount(toNum(trade.amount))}
      </div>
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground tabular-nums">
        <span>{time}</span>
        {isBot ? (
          <span
            aria-label={t("market_maker_trade")}
            title={t("market_maker_trade")}
            className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/70"
          />
        ) : null}
      </div>
    </div>
  );
});
