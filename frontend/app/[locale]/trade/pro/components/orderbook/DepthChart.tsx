"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { withAlpha, themeColor } from "../../utils/canvas-color";
import { useTranslations } from "next-intl";
import type { BookSnapshot } from "@/lib/orderbook";

interface DepthChartProps {
  book: BookSnapshot;
  pricePrecision?: number;
  className?: string;
}

interface DepthPoint {
  price: number;
  cumulative: number;
}

/**
 * Cumulative depth either side of the mid.
 *
 * ---------------------------------------------------------------------------
 * THREE THINGS THAT WERE WRONG HERE, AND ALL THREE CAME FROM THE SAME PLACE
 * ---------------------------------------------------------------------------
 *
 * The previous version derived the market's mid from the CHART's price range —
 * `(minPrice + maxPrice) / 2`. That is the midpoint of the drawn axis, not the
 * midpoint of the book, and on any asymmetric book (which is every real book)
 * it is not the same number. From that one mistake:
 *
 *  1. The dashed "mid price" line was painted at exactly `width / 2`, always,
 *     whatever the spread was actually doing.
 *  2. The hover tooltip decided bid-vs-ask by comparing against that fake mid,
 *     so prices on the ask side of the real spread were reported as bids.
 *  3. `bidData.find(b => b.price <= price)` searched an ASCENDING array for the
 *     first element at or below the cursor, which is element 0 for every cursor
 *     position at or above the cheapest bid — i.e. always. The tooltip reported
 *     the TOTAL bid depth no matter where the pointer was.
 *
 * A one-sided book was a fourth: with no asks, `maxPrice` fell back to `0`, so
 * `priceRange` went NEGATIVE, sailed through the `=== 0` guard, and mirrored
 * the whole chart.
 *
 * The book now arrives already built, with its own `mid`, `bestBid` and
 * `bestAsk`, and the axis is derived from the data rather than the data being
 * inferred from the axis.
 */
export const DepthChart = memo(function DepthChart({
  book,
  pricePrecision = 2,
  className,
}: DepthChartProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("trade_components");
  /* Resolved during render, not inside the draw effect: `ctx.fillText` takes a
     string, and the previous version painted the English literal "No order book
     data" straight onto the canvas where no translation could reach it. */
  const emptyLabel = t("no_orderbook_data");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    price: number;
    volume: number;
    side: "bid" | "ask";
  } | null>(null);

  /**
   * The two curves, each ASCENDING in price.
   *
   * The bid curve runs from the cheapest bid up to the best bid, and its
   * cumulative therefore DESCENDS along it — "how much size sits at or above
   * this price". That relationship is what the hover lookup depends on, so it
   * is stated here rather than rediscovered at the point of use.
   */
  const depth = useMemo(() => {
    const bidCurve: DepthPoint[] = book.bids
      .map((level) => ({ price: level.price, cumulative: level.cumulative }))
      .reverse();
    const askCurve: DepthPoint[] = book.asks.map((level) => ({
      price: level.price,
      cumulative: level.cumulative,
    }));

    const prices: number[] = [];
    if (bidCurve.length) prices.push(bidCurve[0].price, bidCurve[bidCurve.length - 1].price);
    if (askCurve.length) prices.push(askCurve[0].price, askCurve[askCurve.length - 1].price);

    if (prices.length === 0) {
      return { bidCurve, askCurve, minPrice: 0, maxPrice: 0, maxCumulative: 0, mid: null };
    }

    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);

    /* A one-sided book has no span of its own. Give it a symmetric one around
       the only price it has, so the curve is drawn against a real axis instead
       of a negative range. */
    if (!(maxPrice > minPrice)) {
      const pad = Math.max(Math.abs(maxPrice) * 0.001, Number.EPSILON);
      minPrice -= pad;
      maxPrice += pad;
    }

    return {
      bidCurve,
      askCurve,
      minPrice,
      maxPrice,
      maxCumulative: book.maxCumulative,
      /* The market's own mid, from the book — never the axis midpoint. Falls
         back to the axis centre only when there is no spread to speak of. */
      mid: book.mid ?? (minPrice + maxPrice) / 2,
    };
  }, [book]);

  /* Measured, not assumed. There was no observer at all before: the canvas was
     only ever resized on the frames a new book happened to arrive, so a panel
     the user dragged wider stayed at its old backing-store size until the
     market moved. */
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize((previous) =>
          Math.abs(previous.width - width) < 0.5 &&
          Math.abs(previous.height - height) < 0.5
            ? previous
            : { width, height }
        );
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = size;
    if (width <= 0 || height <= 0) return;

    /* The backing store is only reallocated when the SIZE changes. Assigning
       `canvas.width` discards the buffer and forces a layout, and the previous
       version did it on every order-book frame — several times a second, for a
       canvas whose dimensions almost never change. */
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    /* setTransform, not scale: `scale` COMPOUNDS, and it only happened to be
       harmless before because every draw reassigned `canvas.width` first,
       which resets the matrix. Now that the buffer is reused, an accumulating
       scale would zoom the chart a little more on every frame. */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mutedColor = themeColor("--tp-text-muted", "--subtle-foreground");
    const gridColor = themeColor("--tp-border-subtle", "--border");
    const axisColor = themeColor("--tp-border", "--border");
    const greenColor = themeColor("--tp-green", "--up");
    const redColor = themeColor("--tp-red", "--down");

    const monoStack =
      getComputedStyle(canvas).getPropertyValue("--font-jetbrains-mono").trim() ||
      "monospace";

    const { bidCurve, askCurve, minPrice, maxPrice, maxCumulative, mid } = depth;

    if (!bidCurve.length && !askCurve.length) {
      ctx.fillStyle = mutedColor;
      ctx.font = `12px ${monoStack}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emptyLabel, width / 2, height / 2);
      return;
    }

    const priceRange = maxPrice - minPrice;
    if (!(priceRange > 0)) return;

    const priceToX = (price: number) => ((price - minPrice) / priceRange) * width;
    const cumulativeToY = (cumulative: number) => {
      if (!(maxCumulative > 0)) return height;
      return height - (cumulative / maxCumulative) * height * 0.85 - 10;
    };

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // The market's mid, wherever it actually falls on the axis.
    if (mid !== null) {
      const midX = priceToX(mid);
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, height);
      ctx.strokeStyle = axisColor;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /*
      THE FILL IS THE AREA UNDER THE CURVE, and it is the same shape on both
      sides — which is exactly what the version this replaces got wrong.

      It started the ask path at the bottom-RIGHT corner and then drew straight
      to the best ask, which sits at the far left of the ask region and low on
      the chart. That diagonal is not part of the curve at all: it swept a huge
      triangle across the whole right-hand side of the panel and filled it, so
      the ask side read as a solid block of colour with a hard 45-degree edge
      instead of a depth profile.

      Down to the baseline, along the curve, back down to the baseline. No
      corners, no anchor, nothing that depends on which side is being drawn.
    */
    const drawSide = (curve: DepthPoint[], color: string) => {
      if (curve.length === 0) return;

      const firstX = priceToX(curve[0].price);
      const lastX = priceToX(curve[curve.length - 1].price);

      ctx.beginPath();
      ctx.moveTo(firstX, height);
      for (const point of curve) {
        ctx.lineTo(priceToX(point.price), cumulativeToY(point.cumulative));
      }
      ctx.lineTo(lastX, height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, withAlpha(ctx, color, 0.4));
      gradient.addColorStop(1, withAlpha(ctx, color, 0.05));
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      curve.forEach((point, index) => {
        const x = priceToX(point.price);
        const y = cumulativeToY(point.cumulative);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawSide(bidCurve, greenColor);
    drawSide(askCurve, redColor);

    ctx.font = `10px ${monoStack}, monospace`;
    ctx.fillStyle = mutedColor;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(minPrice.toFixed(pricePrecision), 4, height - 4);
    ctx.textAlign = "right";
    ctx.fillText(maxPrice.toFixed(pricePrecision), width - 4, height - 4);
    if (mid !== null) {
      ctx.textAlign = "center";
      ctx.fillText(mid.toFixed(pricePrecision), width / 2, height - 4);
    }
  }, [depth, size, pricePrecision, emptyLabel]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const { bidCurve, askCurve, minPrice, maxPrice, mid } = depth;
      if (!bidCurve.length && !askCurve.length) return;

      const priceRange = maxPrice - minPrice;
      if (!(priceRange > 0)) return;

      const x = event.clientX - rect.left;
      const price = minPrice + (x / rect.width) * priceRange;
      const pivot = mid ?? (minPrice + maxPrice) / 2;
      const side: "bid" | "ask" = price < pivot ? "bid" : "ask";

      /*
        "How much size is resting between the cursor and the touch of the
        book." Both searches walk their curve in the direction the cumulative
        GROWS, which for bids is downward in price and for asks upward — the
        previous `find(b => b.price <= price)` matched element 0 of an ascending
        array for every cursor position and so reported a constant.
      */
      let volume = 0;
      if (side === "bid") {
        for (let i = bidCurve.length - 1; i >= 0; i--) {
          if (bidCurve[i].price >= price) volume = bidCurve[i].cumulative;
          else break;
        }
      } else {
        for (let i = 0; i < askCurve.length; i++) {
          if (askCurve[i].price <= price) volume = askCurve[i].cumulative;
          else break;
        }
      }

      setTooltip({
        x,
        y: event.clientY - rect.top,
        price,
        volume,
        side,
      });
    },
    [depth]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const tooltipLeft = Math.max(
    0,
    Math.min(tooltip ? tooltip.x + 10 : 0, Math.max(0, size.width - 110))
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "tp-depth-chart relative w-full h-full bg-[var(--tp-bg-primary)]",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {tooltip && (
        <div
          className={cn(
            "absolute z-10 px-2 py-1",
            "bg-[var(--tp-bg-secondary)] border border-[var(--tp-border)]",
            "rounded shadow-lg text-[10px] font-mono tabular-nums",
            "pointer-events-none"
          )}
          style={{ left: tooltipLeft, top: Math.max(tooltip.y - 40, 0) }}
        >
          <div
            className={cn(
              tooltip.side === "bid"
                ? "text-[var(--tp-green)]"
                : "text-[var(--tp-red)]"
            )}
          >
            {tooltip.price.toFixed(pricePrecision)}
          </div>
          <div className="text-[var(--tp-text-muted)]">
            {tCommon("vol")}: {formatVolume(tooltip.volume)}
          </div>
        </div>
      )}
    </div>
  );
});

function formatVolume(volume: number): string {
  if (!Number.isFinite(volume)) return "—";
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`;
  return volume.toFixed(4);
}

export default DepthChart;
