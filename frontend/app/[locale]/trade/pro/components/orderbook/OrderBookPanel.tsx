"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { OrderBookHeader } from "./OrderBookHeader";
import { OrderBookTable } from "./OrderBookTable";
import { SweepSummaryCard } from "./SweepSummaryCard";
import {
  OrderBookHorizontal,
  MAX_ROWS_HORIZONTAL,
} from "./OrderBookHorizontal";
import { DepthChart } from "./DepthChart";
import { TradesPanel } from "./TradesPanel";
import { SpreadIndicator } from "./SpreadIndicator";
/*
   THE APP-WIDE PRIMITIVE, and in this tree that choice is stronger than
   elsewhere, not weaker.

   This used to import `../shared/Skeleton` — a `tp-skeleton` div sized
   entirely by the CALLER (`h-3 w-14`). The workspace runs its own font-scale
   (`--tp-font-scale`, which rescales `text-[9px]`..`text-[13px]`), so a
   hardcoded pixel height here is wrong at every scale factor except the one
   it happened to be typed at. `SkeletonText` lays the placeholder out with the
   INHERITED font, so it tracks the scale automatically — the primitive is more
   correct in a workspace with a font-scale than in one without.
*/
import { SkeletonText } from "@/components/ui/skeleton";
import type { MarketType } from "../../types/common";
import {
  marketDataWs,
  type OrderbookData as WSOrderbookData,
  type TradeData as WSTradeData,
  type TickerData,
  type MarketType as WSMarketType,
} from "@/services/market-data-ws";
import { useTranslations } from "next-intl";
import { useExtensionStatus } from "../../providers/ExtensionStatusProvider";
import { toNum } from "@/lib/precision-utils";
import { tickSizeOptions, sweepSummary, type BookLevel } from "@/lib/orderbook";
import { useOrderBook, usePriceDirection } from "@/hooks/use-order-book";

import "../../../orderbook.css";

// Height threshold for switching to horizontal layout (in pixels)
const HORIZONTAL_LAYOUT_THRESHOLD = 350;

interface MarketMetadata {
  precision?: {
    price?: number;
    amount?: number;
  };
  limits?: {
    amount?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
  };
}

interface OrderBookPanelProps {
  symbol: string;
  marketType: MarketType;
  className?: string;
  /**
   * Docked in a short cell (mobile slot, tablet column). Drops the Depth tab,
   * which needs height to say anything, and trims the ladder.
   *
   * It used to be declared, defaulted, destructured — and never read. The only
   * `compact` in the markup was `compact={useHorizontalLayout}` being passed
   * DOWN to the header, so both call sites in `TradingProLayout` were setting a
   * prop that did nothing.
   */
  compact?: boolean;
  metadata?: MarketMetadata;
}

interface TradeData {
  id: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

type DisplayMode = "both" | "bids" | "asks";
type TabType = "orderbook" | "trades" | "depth";

const BOOK_DEPTH = 25;
const COMPACT_DEPTH = 12;
const MAX_TRADES = 50;

export const OrderBookPanel = memo(function OrderBookPanel({
  symbol,
  marketType,
  className,
  compact = false,
  metadata,
}: OrderBookPanelProps) {
  const tTradePro = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const tComponents = useTranslations("trade_components");

  const [activeTab, setActiveTab] = useState<TabType>("orderbook");
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [showCumulative, setShowCumulative] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [useHorizontalLayout, setUseHorizontalLayout] = useState(false);
  const [tickSize, setTickSize] = useState(0);
  const [hover, setHover] = useState<{
    side: "bid" | "ask";
    /* The row's distance from the touch of the book — NOT its price. A price is
       gone the moment the level is consumed, and everything keyed to it then
       has to guess; a slot is valid for as long as the ladder is that deep. */
    slot: number;
    /* The row's measured box. The ladder scrolls and the ask side is reversed,
       so a row's screen position cannot be derived from its index. */
    anchor: { top: number; bottom: number; left: number };
  } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  /*
     The depth the book is BUILT at — which has to be the number of rows the
     ACTIVE layout draws, because `buildBook` computes the depth-bar
     denominators after its cut and `@/lib/orderbook` measures depth over
     exactly what is rendered. The horizontal layout was missing from this
     expression: it drew eight rows and sliced them itself, so its bars were
     scaled against the 25-level maxima of a book it was not showing. */
  const depth = useHorizontalLayout
    ? MAX_ROWS_HORIZONTAL
    : compact
      ? COMPACT_DEPTH
      : BOOK_DEPTH;

  const {
    book,
    hasData,
    push: pushBook,
    reset: resetBook,
  } = useOrderBook({ tickSize, depth });

  const priceDirection = usePriceDirection(lastPrice) ?? "neutral";

  // Convert Trading Pro market type to WebSocket service market type
  const wsMarketType: WSMarketType = useMemo(() => {
    if (marketType === "futures") return "futures";
    if (marketType === "eco") return "eco";
    return "spot";
  }, [marketType]);

  /* ---------------------------------------------------------------- *
   * Precision
   * ---------------------------------------------------------------- */

  const pricePrecision = useMemo(() => {
    const declared = metadata?.precision?.price;
    if (typeof declared === "number" && declared >= 0) return Math.min(12, declared);
    const reference = lastPrice ?? book.mid ?? 0;
    if (reference >= 1000) return 2;
    if (reference >= 1) return 4;
    return 8;
  }, [metadata?.precision?.price, lastPrice, book.mid]);

  /* Declared in this component's own props interface since it was written, and
     read by nothing: `amountPrecision` was threaded through the table, the row,
     the horizontal layout and the trade tape, and the panel never supplied it,
     so every size in the Pro book rendered at the hardcoded default of 4. */
  const amountPrecision = useMemo(() => {
    const declared = metadata?.precision?.amount;
    if (typeof declared === "number" && declared >= 0) return Math.min(12, declared);
    return 4;
  }, [metadata?.precision?.amount]);

  const tickSizes = useMemo(
    () => tickSizeOptions(lastPrice ?? book.mid, pricePrecision),
    [lastPrice, book.mid, pricePrecision]
  );

  /* ---------------------------------------------------------------- *
   * The third column
   * ---------------------------------------------------------------- */

  /*
     One column, two quantities, and until now three names for them across the
     two order books in this app: this panel headed it "Total" / "Sum" while the
     retail panel headed the same column "Total" / "Value" and labelled its own
     toggle "Total" / "Size". Neither said what UNIT it was in, so pressing the
     toggle changed the column from base size to quote value — from 0.00120000 to
     8.00 — with nothing on screen to say the meaning had changed, and the ladder
     read as though it had re-sorted itself.

     Both books now say "Total" for the running base size and "Value" for this
     row's price x amount, each with its currency, the way the price and amount
     headers already carry theirs.
  */
  const [baseCurrency, quoteCurrency] = useMemo(() => {
    const [base, quote] = symbol.split("/");
    return [base || undefined, quote || undefined];
  }, [symbol]);

  const valueColumnLabel = useMemo(() => {
    const name = showCumulative ? tCommon("total") : tCommon("value");
    const unit = showCumulative ? baseCurrency : quoteCurrency;
    return unit ? `${name} (${unit})` : name;
  }, [showCumulative, baseCurrency, quoteCurrency, tCommon]);

  /*
    Everything that belongs to the OLD market, dropped during render rather than
    from an effect — an effect runs after the commit, so the panel would paint
    one frame of the previous market's ladder under the new market's name. A
    grouping increment belongs to the instrument it was chosen for.
  */
  const [market, setMarket] = useState(`${symbol}|${marketType}`);
  if (market !== `${symbol}|${marketType}`) {
    setMarket(`${symbol}|${marketType}`);
    setTickSize(0);
    setTrades([]);
    setLastPrice(null);
    setHover(null);
    resetBook();
  }

  /* ---------------------------------------------------------------- *
   * Trades
   * ---------------------------------------------------------------- */

  const pendingTradesRef = useRef<TradeData[] | null>(null);
  const tradesFrameRef = useRef<number | null>(null);

  const flushTrades = useCallback(() => {
    tradesFrameRef.current = null;
    const incoming = pendingTradesRef.current;
    pendingTradesRef.current = null;
    if (!incoming || !mountedRef.current) return;

    setTrades((previous) => {
      const seen = new Set<string>();
      const merged: TradeData[] = [];
      for (const trade of [...incoming, ...previous]) {
        const key = `${trade.timestamp}_${trade.price}_${trade.amount}_${trade.side}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(trade);
      }
      merged.sort((a, b) => b.timestamp - a.timestamp);
      return merged.slice(0, MAX_TRADES);
    });
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

  /* ---------------------------------------------------------------- *
   * Subscriptions
   * ---------------------------------------------------------------- */

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

  useEffect(() => {
    if (!symbol) return;

    marketDataWs.initialize();

    /* The state reset happens during render, above — this effect only owns the
       subscriptions. */
    pendingTradesRef.current = null;

    const unsubscribeTicker = marketDataWs.subscribe<TickerData>(
      { symbol, type: "ticker", marketType: wsMarketType },
      (data) => {
        if (!mountedRef.current) return;
        const next = toNum(data?.last);
        if (!Number.isFinite(next) || next <= 0) return;
        /* One state write, and it is the price. The previous version called
           `setPrevPrice((prev) => prev)` — a no-op write on every tick — and
           then called `setPrevPrice` again from INSIDE the `setLastPrice`
           updater, which makes the updater impure and is double-invoked under
           StrictMode. `usePriceDirection` keeps the previous value in a ref
           where it belongs. */
        setLastPrice(next);
      }
    );

    const unsubscribeOrderbook = marketDataWs.subscribe<WSOrderbookData>(
      { symbol, type: "orderbook", marketType: wsMarketType, limit: BOOK_DEPTH },
      (data) => {
        if (!mountedRef.current) return;
        if (data?.symbol && data.symbol !== symbol) return;
        pushBook(data);
      }
    );

    const unsubscribeTrades = marketDataWs.subscribe<WSTradeData[]>(
      { symbol, type: "trades", marketType: wsMarketType },
      (data) => {
        if (!mountedRef.current || !Array.isArray(data)) return;
        /* The "trades" stream carries BOTH full snapshots (the server poller,
           up to 50 entries) and per-match deltas (exactly the 2 sides of one
           fill, broadcast the moment it executes). Replacing state with the
           payload truncated the visible list to 2 rows on every real trade —
           merge instead. Delta rows also arrive with an uppercase side. */
        const incoming: TradeData[] = data
          .map((trade) => ({
            id: String(trade.id ?? ""),
            price: toNum(trade.price),
            amount: toNum(trade.amount),
            side: String(trade.side || "").toLowerCase() as TradeData["side"],
            timestamp: toNum(trade.timestamp),
          }))
          .filter(
            (trade) =>
              Number.isFinite(trade.price) &&
              Number.isFinite(trade.amount) &&
              Number.isFinite(trade.timestamp)
          );
        if (incoming.length === 0) return;
        pushTrades(incoming);
      }
    );

    return () => {
      unsubscribeTicker();
      unsubscribeOrderbook();
      unsubscribeTrades();
    };
  }, [symbol, wsMarketType, pushBook, pushTrades, resetBook]);

  /*
    The legacy `/trade` layout announces a market switch on this event. Pro does
    not dispatch it, so today this is inert — but if it ever fires, clearing the
    DATA is right and tearing down the SUBSCRIPTIONS is not: the effect above
    owns those, and the version this replaces called `cleanupSubscriptions()`
    with no path that would ever re-create them, leaving the panel permanently
    blank.
  */
  useEffect(() => {
    const handle = () => {
      resetBook();
      setTrades([]);
      setLastPrice(null);
      setHover(null);
      pendingTradesRef.current = null;
    };
    window.addEventListener("market-switching-cleanup", handle);
    return () => window.removeEventListener("market-switching-cleanup", handle);
  }, [resetBook]);

  /* ---------------------------------------------------------------- *
   * Interaction
   * ---------------------------------------------------------------- */

  const handleSelect = useCallback(
    (side: "bid" | "ask", level: BookLevel, withSize: boolean) => {
      window.dispatchEvent(
        new CustomEvent("tp-set-order-price", {
          detail: {
            price: level.price,
            /* Shift- or alt-click fills the size too. Clicking a level and
               then typing the number you were just looking at is the step this
               removes. */
            ...(withSize
              ? { amount: level.amount, cumulative: level.cumulative, side }
              : {}),
          },
        })
      );
    },
    []
  );

  const handleHover = useCallback(
    (side: "bid" | "ask", slot: number, rect: DOMRect) => {
      setHover({
        side,
        slot,
        anchor: { top: rect.top, bottom: rect.bottom, left: rect.left },
      });
    },
    []
  );

  const handleHoverEnd = useCallback(() => setHover(null), []);

  /* ---------------------------------------------------------------- *
   * Layout
   * ---------------------------------------------------------------- */

  useEffect(() => {
    if (!panelRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setUseHorizontalLayout(entry.contentRect.height < HORIZONTAL_LAYOUT_THRESHOLD);
      }
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  /*
    The operator's setting is read HERE, which is the first time anything has
    read it. `tradingProDepthChartEnabled` has been in the admin panel and
    resolved into `depthChartEnabled` by the workspace provider since both were
    written, and no component ever consumed it — so an operator who turned the
    depth chart off watched it carry on rendering.
  */
  const { settings: adminSettings } = useExtensionStatus();
  const depthTabAvailable =
    !useHorizontalLayout && !compact && adminSettings.depthChartEnabled !== false;

  /*
    DERIVED, not corrected after the fact.

    The Depth tab's BUTTON was hidden below the height threshold while
    `activeTab` kept pointing at it, and its content carried the same condition
    — so shrinking the panel with Depth open rendered an empty body, with no tab
    appearing selected and no way back except picking another tab the user could
    not see was needed. Deriving the tab that is actually SHOWN needs no effect
    and cannot paint an intermediate frame.
  */
  const shownTab: TabType =
    activeTab === "depth" && !depthTabAvailable ? "orderbook" : activeTab;

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  const isPending = !hasData;
  const isEmpty = hasData && book.bids.length === 0 && book.asks.length === 0;
  const showPendingBook =
    shownTab === "orderbook" && isPending && !useHorizontalLayout;

  const bidHover = hover?.side === "bid" ? hover.slot : null;
  const askHover = hover?.side === "ask" ? hover.slot : null;

  /* What the tint is worth. The SAME slot the ladder tints, read off the same
     best-first array, so the card and the highlight cannot disagree — including
     on the frame where the level the pointer arrived on has just been consumed.
     `sweepSummary` returns null once the ladder is shorter than the hovered
     slot, which is the one case where the pointer really is over nothing. */
  const sweep = hover
    ? sweepSummary(hover.side === "bid" ? book.bids : book.asks, hover.slot)
    : null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "tp-orderbook-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]",
        className
      )}
    >
      <OrderBookHeader
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        showCumulative={showCumulative}
        onShowCumulativeChange={setShowCumulative}
        tickSizes={tickSizes}
        tickSize={tickSize}
        onTickSizeChange={setTickSize}
        compact={useHorizontalLayout}
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--tp-border)]">
        <TabButton
          active={shownTab === "orderbook"}
          onClick={() => setActiveTab("orderbook")}
        >
          {tCommon("order_book")}
        </TabButton>
        <TabButton
          active={shownTab === "trades"}
          onClick={() => setActiveTab("trades")}
        >
          {tCommon("trades")}
        </TabButton>
        {depthTabAvailable && (
          <TabButton
            active={shownTab === "depth"}
            onClick={() => setActiveTab("depth")}
          >
            {tTradePro("depth")}
          </TabButton>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Pending book: the REAL column headers and the REAL row geometry
            (`grid-cols-3 gap-2 px-2 py-0.5 text-xs font-mono`), so the rows
            that replace these are the same height to the pixel. The depth bar
            is part of the row's shape, not decoration, so it is drawn too —
            at a fixed width rather than a random one. */}
        {showPendingBook && (
          <div className="h-full flex flex-col">
            <ColumnHeaderRow
              valueLabel={valueColumnLabel}
              priceLabel={tCommon("price")}
              amountLabel={tCommon("amount")}
            />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col-reverse">
              {PENDING_ROW_INDEXES.map((i) => (
                <PendingOrderBookRow key={`ask-${i}`} index={i} side="ask" />
              ))}
            </div>
            {displayMode === "both" && (
              /* The spread strip. Its box is held by the `py-1.5` and the two
                  hairlines, which render regardless; the two FIGURES are what
                  wait, and they are measured by the strip's own
                  `text-xs font-mono` rather than by an `h-4`/`h-3` pair that
                  disagreed with each other and with the 16px line box both sit
                  in. Character counts match `SpreadIndicator`'s real output:
                  the last price at this precision and `0.50 (0.01%)`. */
              <div className="flex items-center justify-center gap-3 py-1.5 px-2 border-y border-[var(--tp-border)] text-xs font-mono">
                <SkeletonText chars={9} />
                <SkeletonText chars={13} />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              {PENDING_ROW_INDEXES.map((i) => (
                <PendingOrderBookRow key={`bid-${i}`} index={i} side="bid" />
              ))}
            </div>
          </div>
        )}

        {/*
          An empty state, which this panel had none of. Once the feed answered
          with nothing the loading flag cleared and every branch was gated on
          `orderbook &&`, so a market with no resting orders — or one malformed
          frame — left the whole tab body rendering literally nothing, with no
          spinner, no message and no way to tell a dead market from a dead
          panel.
        */}
        {shownTab === "orderbook" && isEmpty && (
          <div className="h-full flex flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="text-xs text-[var(--tp-text-secondary)]">
              {tComponents("no_orderbook_data")}
            </span>
            <span className="text-[10px] text-[var(--tp-text-muted)]">
              {tComponents("waiting_for_market_data")}
            </span>
          </div>
        )}

        {shownTab === "orderbook" && hasData && !isEmpty && (
          useHorizontalLayout ? (
            <OrderBookHorizontal
              book={book}
              showCumulative={showCumulative}
              pricePrecision={pricePrecision}
              amountPrecision={amountPrecision}
              lastPrice={lastPrice}
              priceDirection={priceDirection}
              baseCurrency={baseCurrency}
              quoteCurrency={quoteCurrency}
              onSelect={handleSelect}
            />
          ) : (
            <div className="h-full flex flex-col">
              <ColumnHeaderRow
                valueLabel={valueColumnLabel}
                priceLabel={tCommon("price")}
                amountLabel={tCommon("amount")}
              />

              {/* Asks. `flex-col-reverse` puts the BEST ask at the bottom,
                  against the spread, while the array stays best-first — so the
                  depth cut and the running total both count outward from the
                  touch of the book. Reversing the ARRAY, which is what this
                  did before, moved the cut to the wrong end and hid the ten
                  levels nearest the spread. */}
              {(displayMode === "both" || displayMode === "asks") && (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse scrollbar-none">
                  <OrderBookTable
                    levels={book.asks}
                    snapshot={book}
                    side="ask"
                    showCumulative={showCumulative}
                    hoverSlot={askHover}
                    pricePrecision={pricePrecision}
                    amountPrecision={amountPrecision}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                  />
                </div>
              )}

              {/* The spread strip is also the only place this panel shows the
                  last traded price, so it is drawn in every display mode —
                  gating it on `both` took the last price away from anyone who
                  chose bids-only or asks-only. */}
              <SpreadIndicator
                spread={book.spread}
                percentage={book.spreadPercent}
                mid={book.mid}
                lastPrice={lastPrice}
                priceDirection={priceDirection}
                pricePrecision={pricePrecision}
                crossed={book.crossed}
              />

              {(displayMode === "both" || displayMode === "bids") && (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  <OrderBookTable
                    levels={book.bids}
                    snapshot={book}
                    side="bid"
                    showCumulative={showCumulative}
                    hoverSlot={bidHover}
                    pricePrecision={pricePrecision}
                    amountPrecision={amountPrecision}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                  />
                </div>
              )}
            </div>
          )
        )}

        {shownTab === "trades" && (
          <TradesPanel
            trades={trades}
            pricePrecision={pricePrecision}
            amountPrecision={amountPrecision}
          />
        )}

        {shownTab === "depth" && (
          <DepthChart book={book} pricePrecision={pricePrecision} />
        )}
      </div>

      {/* The sweep total. Only while a ladder row is hovered, and only on the
          order-book tab — the trades and depth views have no sweep. */}
      {sweep && hover && shownTab === "orderbook" && (
        <SweepSummaryCard
          summary={sweep}
          side={hover.side}
          anchor={hover.anchor}
          pricePrecision={pricePrecision}
          amountPrecision={amountPrecision}
        />
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ *
 * Small parts
 * ------------------------------------------------------------------ */

/**
 * The ladder's column headers, once.
 *
 * Written out twice before — in the pending book and in the real one — with
 * the English literals "Price" and "Amount" hardcoded in both while the third
 * column went through next-intl. Two copies of a header is also how they drift
 * apart.
 */
const ColumnHeaderRow = memo(function ColumnHeaderRow({
  valueLabel,
  priceLabel,
  amountLabel,
}: {
  /** Already resolved and already carrying its unit — see `valueColumnLabel`. */
  valueLabel: string;
  priceLabel: string;
  amountLabel: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] text-[var(--tp-text-muted)] uppercase tracking-wide border-b border-[var(--tp-border-subtle)] shrink-0">
      <span>{priceLabel}</span>
      <span className="text-right">{amountLabel}</span>
      <span className="text-right">{valueLabel}</span>
    </div>
  );
});

/**
 * Fixed depth-bar widths for the pending rows.
 *
 * A literal table, NOT `Math.random()`. Random widths re-roll on every render,
 * so the placeholder book visibly twitches while it waits, and the server and
 * client produce different markup for the same component. These descend the way
 * a real book's cumulative depth does, so the shape reads as an order book
 * rather than as noise.
 */
const PENDING_ROW_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const PENDING_DEPTHS = [78, 71, 64, 58, 52, 46, 40, 34, 29, 24, 19, 14];

/**
 * One pending book row, built from the REAL `OrderBookRow` geometry — same
 * grid, same `px-2 py-0.5`, same `text-xs font-mono`. The placeholders sit
 * INSIDE the three spans that will hold the figures, so the row height is
 * produced by the same text layout in both states; a hand-sized `h-3` box
 * would not track the workspace font-scale setting, which rescales
 * `text-[9px]`..`text-[13px]` under the user's control.
 */
function PendingOrderBookRow({
  index,
  side,
}: {
  index: number;
  side: "bid" | "ask";
}) {
  const isBid = side === "bid";
  return (
    <div className="relative grid grid-cols-3 gap-2 px-2 py-0.5 text-xs font-mono">
      <div
        className={cn(
          "absolute inset-y-0 right-0",
          isBid ? "bg-[var(--tp-green)]/10" : "bg-[var(--tp-red)]/10"
        )}
        style={{ width: `${PENDING_DEPTHS[index] ?? 20}%` }}
      />
      {/* MEASURED, not guessed. Under tabular mono the character counts below
          are the real values' widths to the pixel: a price is 8 glyphs at this
          precision, an amount 6, a running sum 5. */}
      <span className="relative z-10">
        <SkeletonText chars={8} />
      </span>
      <span className="relative z-10 flex justify-end">
        <SkeletonText chars={6} />
      </span>
      <span className="relative z-10 flex justify-end">
        <SkeletonText chars={5} />
      </span>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5",
        "text-xs font-medium",
        "transition-colors",
        "border-b-2 -mb-px",
        active
          ? "text-[var(--tp-text-primary)] border-[var(--tp-blue)]"
          : "text-[var(--tp-text-muted)] border-transparent hover:text-[var(--tp-text-secondary)]"
      )}
    >
      {children}
    </button>
  );
}

export default OrderBookPanel;
