"use client";

import React, { memo, useCallback } from "react";
import { cn } from "../../utils/cn";
import { useTranslations } from "next-intl";
import { depthPercent, type BookLevel, type BookSnapshot } from "@/lib/orderbook";
import { formatPrice, formatAmount, formatCompact } from "./OrderBookRow";
import { formatSpread, formatPercentage } from "./SpreadIndicator";

interface OrderBookHorizontalProps {
  book: BookSnapshot;
  showCumulative: boolean;
  pricePrecision: number;
  amountPrecision: number;
  lastPrice: number | null;
  priceDirection: "up" | "down" | "neutral";
  /** Base asset, e.g. `BTC` — the unit the cumulative column is counted in. */
  baseCurrency?: string;
  /** Quote asset, e.g. `USDT` — the unit `price x amount` is counted in. */
  quoteCurrency?: string;
  onSelect: (side: "bid" | "ask", level: BookLevel, withSize: boolean) => void;
}

/**
 * Rows this layout draws per side.
 *
 * Exported because the panel has to BUILD the book at this depth. It used to be
 * private and the ladders were sliced to it here, after `buildBook` had already
 * computed the depth denominators over 25 levels — so eight rows were scaled
 * against twenty-five levels' worth of maximum and, on the cumulative basis, no
 * bar in the compact book could exceed roughly a third of its row. The book read
 * as empty on both sides however much depth was really resting.
 */
export const MAX_ROWS_HORIZONTAL = 8;

/**
 * The short-panel layout: the two ladders side by side, prices meeting in the
 * middle.
 *
 * The cumulative column is genuinely rendered here now. It used to be computed
 * for every row, passed down as `cumulative` and `showCumulative`, and then
 * dropped on the floor — `HorizontalRow` destructured neither — so the header's
 * cumulative toggle, which stays visible in this layout, controlled nothing at
 * all.
 */
export const OrderBookHorizontal = memo(function OrderBookHorizontal({
  book,
  showCumulative,
  pricePrecision,
  amountPrecision,
  lastPrice,
  priceDirection,
  baseCurrency,
  quoteCurrency,
  onSelect,
}: OrderBookHorizontalProps) {
  const tCommon = useTranslations("common");

  /* Already cut to `MAX_ROWS_HORIZONTAL` by `buildBook`, which is what keeps the
     depth denominators in step with the rows. */
  const bids = book.bids;
  const asks = book.asks;
  const basis = showCumulative ? "cumulative" : "amount";

  /* "Total" is the running base size, "Value" is this row's price x amount —
     two quantities in two different units, so each says which. */
  const valueUnit = showCumulative ? baseCurrency : quoteCurrency;
  const valueName = showCumulative ? tCommon("total") : tCommon("value");
  const valueLabel = valueUnit ? `${valueName} (${valueUnit})` : valueName;

  return (
    <div className="h-full flex flex-col">
      {/* Column headers — two mirrored triples, prices toward the centre. */}
      <div className="grid grid-cols-2 shrink-0 border-b border-[var(--tp-border-subtle)]">
        <div className="grid grid-cols-3 gap-1 px-1.5 py-1 text-[9px] text-[var(--tp-text-muted)] uppercase tracking-wide border-r border-[var(--tp-border-subtle)]">
          <span className="text-left">{valueLabel}</span>
          <span className="text-right">{tCommon("amount")}</span>
          <span className="text-right">{tCommon("price")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1.5 py-1 text-[9px] text-[var(--tp-text-muted)] uppercase tracking-wide">
          <span className="text-left">{tCommon("price")}</span>
          <span className="text-left">{tCommon("amount")}</span>
          <span className="text-right">{valueLabel}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          <div className="flex flex-col overflow-y-auto scrollbar-none border-r border-[var(--tp-border-subtle)]">
            {bids.map((level) => (
              <HorizontalRow
                key={`bid-${level.price}`}
                level={level}
                side="bid"
                percentage={depthPercent(level, book, basis, "bid")}
                showCumulative={showCumulative}
                pricePrecision={pricePrecision}
                amountPrecision={amountPrecision}
                onSelect={onSelect}
              />
            ))}
          </div>

          <div className="flex flex-col overflow-y-auto scrollbar-none">
            {asks.map((level) => (
              <HorizontalRow
                key={`ask-${level.price}`}
                level={level}
                side="ask"
                percentage={depthPercent(level, book, basis, "ask")}
                showCumulative={showCumulative}
                pricePrecision={pricePrecision}
                amountPrecision={amountPrecision}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Spread and last price */}
      <div className="shrink-0 px-2 py-1.5 border-t border-[var(--tp-border-subtle)] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--tp-text-muted)]">{tCommon("spread")}:</span>
          <span
            className={cn(
              "font-mono tabular-nums",
              book.crossed
                ? "ob-crossed text-[var(--tp-red)]"
                : "text-[var(--tp-text-secondary)]"
            )}
          >
            {/* The same formatters the tall layout uses. This used to print the
                spread through the PRICE formatter — eight decimals for anything
                under 1 — and the percentage at a flat two, so a tight spread
                read as a wall of zeros next to a flat `0.00%`. */}
            {book.spread === null ? "—" : formatSpread(book.spread)}
            {book.spreadPercent !== null && ` (${formatPercentage(book.spreadPercent)})`}
          </span>
        </div>
        {lastPrice !== null && (
          <div className="flex items-center gap-1">
            <span className="text-[var(--tp-text-muted)]">{tCommon("last")}:</span>
            <span
              className={cn(
                "font-mono font-medium tabular-nums",
                priceDirection === "up" && "text-[var(--tp-green)]",
                priceDirection === "down" && "text-[var(--tp-red)]",
                priceDirection === "neutral" && "text-[var(--tp-text-primary)]"
              )}
            >
              {formatPrice(lastPrice, pricePrecision)}
            </span>
            {/* Reserved, so the price does not move when the arrow appears. */}
            <span
              aria-hidden
              className={cn(
                "inline-block w-[7px] text-[8px]",
                priceDirection === "up"
                  ? "text-[var(--tp-green)]"
                  : "text-[var(--tp-red)]"
              )}
            >
              {priceDirection === "up" ? "▲" : priceDirection === "down" ? "▼" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

interface HorizontalRowProps {
  level: BookLevel;
  side: "bid" | "ask";
  percentage: number;
  showCumulative: boolean;
  pricePrecision: number;
  amountPrecision: number;
  onSelect: (side: "bid" | "ask", level: BookLevel, withSize: boolean) => void;
}

const HorizontalRow = memo(function HorizontalRow({
  level,
  side,
  percentage,
  showCumulative,
  pricePrecision,
  amountPrecision,
  onSelect,
}: HorizontalRowProps) {
  const isBid = side === "bid";

  const handleClick = useCallback(
    (event: React.MouseEvent) =>
      onSelect(side, level, event.shiftKey || event.altKey),
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

  const value = showCumulative
    ? formatAmount(level.cumulative, amountPrecision)
    : formatCompact(level.total);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${side} ${formatPrice(level.price, pricePrecision)}, ${formatAmount(level.amount, amountPrecision)}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ "--ob-depth": `${percentage}%` } as React.CSSProperties}
      className={cn(
        "tp-orderbook-row ob-row",
        "grid grid-cols-3 gap-1 px-1.5 py-0.5",
        "text-[10px] font-mono",
        "cursor-pointer",
        "hover:bg-[var(--tp-bg-tertiary)]",
        "transition-colors"
      )}
    >
      {/* Each side's fill grows from the CENTRE of the panel outward, which is
          the right edge of the bid column and the left edge of the ask one. */}
      <div
        aria-hidden
        className={cn(
          "ob-depth",
          isBid ? "ob-depth-right ob-depth-bid" : "ob-depth-left ob-depth-ask"
        )}
      />

      {isBid ? (
        <>
          <span className="relative z-10 text-left text-[var(--tp-text-muted)] tabular-nums">
            {value}
          </span>
          <span className="relative z-10 text-right text-[var(--tp-text-secondary)] tabular-nums">
            {formatAmount(level.amount, amountPrecision)}
          </span>
          <span className="relative z-10 text-right text-[var(--tp-green)] tabular-nums">
            {formatPrice(level.price, pricePrecision)}
          </span>
        </>
      ) : (
        <>
          <span className="relative z-10 text-left text-[var(--tp-red)] tabular-nums">
            {formatPrice(level.price, pricePrecision)}
          </span>
          <span className="relative z-10 text-left text-[var(--tp-text-secondary)] tabular-nums">
            {formatAmount(level.amount, amountPrecision)}
          </span>
          <span className="relative z-10 text-right text-[var(--tp-text-muted)] tabular-nums">
            {value}
          </span>
        </>
      )}
    </div>
  );
});

export default OrderBookHorizontal;
