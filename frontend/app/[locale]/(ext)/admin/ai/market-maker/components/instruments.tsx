"use client";

/**
 * THE TWO METERS THAT SAY WHETHER ONE MARKET IS HEALTHY.
 * ===========================================================================
 *
 * Both are GATES, not decoration. `MarketInstance.passesTradeGates()` stops a
 * market dead when its daily volume budget is spent, and `PriceProcess`
 * progressively leashes price once it reaches the outer fifth of the configured
 * range — at which point the next move's direction becomes predictable, which is
 * an exploitable edge rather than a cosmetic concern.
 *
 * So these two continuous quantities are the market's instrument panel, and they
 * live in the page masthead where they are visible from every tab. The console
 * (`dashboard-client.tsx`) answers "how many of my markets are quoting"; these
 * answer the same question for the one market in front of you, in the same
 * words and off the same server-side reading.
 *
 * NEITHER DRAWS A NUMBER IT COMPUTED ITSELF. `band`, `position` and
 * `targetPosition` all arrive from `utils/assessment.ts`, because the mapping is
 * logarithmic — a range of [1, 100] has its geometric centre at 10, not 50.5 —
 * and a second implementation in the browser is how the drill-down starts
 * disagreeing with the console it was reached from.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";

export type BandState = "in" | "edge" | "out" | "unknown";

/** Where the leash engages, as a share of the half-width. Mirrors the server. */
const SOFT_EDGE = 0.8;

/** `-1 … +1` mapped onto the track, clamped so an escaped price stays drawable. */
function toPercent(position: number): number {
  const clamped = Math.max(-1, Math.min(1, position));
  return ((clamped + 1) / 2) * 100;
}

interface MeterFrameProps {
  label: React.ReactNode;
  /** The verdict, in words. Colour never carries it alone. */
  verdict: React.ReactNode;
  verdictClassName?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * The shared chrome: eyebrow, verdict, track, foot.
 *
 * Written once because two meters side by side that disagree about their label
 * size or their gap read as two components borrowed from different pages — which
 * is precisely what the rest of this addon's detail page used to look like.
 */
function MeterFrame({
  label,
  verdict,
  verdictClassName,
  children,
  footer,
}: MeterFrameProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
          {label}
        </p>
        <p className={cn("text-xs font-medium", verdictClassName)}>{verdict}</p>
      </div>
      {children}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {footer}
      </div>
    </div>
  );
}

export interface PriceBandMeterProps {
  band: BandState;
  /** Live price position, `-1 … +1`. `null` until the engine has ticked. */
  position: number | null;
  /** The anchor's position on the same scale — NOT assumed to be the centre. */
  targetPosition: number | null;
  low: number;
  high: number;
  target: number;
  last: number | null;
  /** Quote asset code. Rendered beside the prices, never as a "$". */
  quote?: string;
  loading?: boolean;
  /** Localised strings, so this file holds no copy. */
  labels: {
    title: string;
    inBand: string;
    atEdge: string;
    outside: string;
    unpriced: string;
    target: string;
    last: string;
  };
}

/**
 * Where this market's price sits inside the range the operator configured.
 *
 * The outer fifths are drawn because they are real: inside them the price
 * process is being pulled back, and an operator who can see the marker entering
 * that zone can widen the range before the leash starts shaping prices.
 */
export function PriceBandMeter({
  band,
  position,
  targetPosition,
  low,
  high,
  target,
  last,
  quote = "",
  loading,
  labels,
}: PriceBandMeterProps) {
  const verdict =
    band === "in"
      ? labels.inBand
      : band === "edge"
        ? labels.atEdge
        : band === "out"
          ? labels.outside
          : labels.unpriced;

  const verdictClassName =
    band === "in"
      ? "text-success-ink"
      : band === "edge"
        ? "text-warning-ink"
        : band === "out"
          ? "text-destructive-ink"
          : "text-muted-foreground";

  const price = fmt(low, high);

  return (
    <MeterFrame
      label={labels.title}
      verdict={verdict}
      verdictClassName={verdictClassName}
      footer={
        <>
          <span className="font-mono tabular-nums">{price(low)}</span>
          <span className="truncate text-center">
            {labels.target}{" "}
            <span className="font-mono tabular-nums text-foreground">
              {price(target)}
            </span>
            {last !== null && last > 0 ? (
              <>
                <span aria-hidden className="mx-1.5 text-border">
                  ·
                </span>
                {labels.last}{" "}
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    band === "out"
                      ? "text-destructive-ink"
                      : band === "edge"
                        ? "text-warning-ink"
                        : "text-foreground"
                  )}
                >
                  {price(last)}
                </span>
              </>
            ) : null}
          </span>
          <span className="font-mono tabular-nums">
            {price(high)} {quote}
          </span>
        </>
      }
    >
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={`${labels.title}: ${verdict}`}
      >
        {/* The leash zones. `SOFT_EDGE` 0.8 of the half-width is the outer 10%
            of the whole track on each side. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-warning/25"
          style={{ width: `${((1 - SOFT_EDGE) / 2) * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 right-0 bg-warning/25"
          style={{ width: `${((1 - SOFT_EDGE) / 2) * 100}%` }}
        />

        {/* The anchor. A hairline, because it is a reference and not a reading. */}
        {targetPosition !== null ? (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-border-strong"
            style={{ left: `${toPercent(targetPosition)}%` }}
          />
        ) : null}

        {/* The reading. Withheld entirely while pending or unpriced — a marker
            parked at the centre is a claim that the price is at its anchor. */}
        {!loading && position !== null ? (
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
              band === "out"
                ? "bg-destructive"
                : band === "edge"
                  ? "bg-warning"
                  : "bg-success"
            )}
            style={{ left: `${toPercent(position)}%` }}
          />
        ) : null}
      </div>
    </MeterFrame>
  );
}

/**
 * Price formatting that keeps two markets legible against each other.
 *
 * A pair quoted at 0.00004312 and one quoted at 41,200 cannot share a fixed
 * `toFixed(6)`: the first renders as 0.000043 and the second grows a tail of
 * meaningless zeros. The band's own width decides the precision, so the three
 * numbers under one meter always agree with each other.
 */
function fmt(low: number, high: number): (value: number) => string {
  const span = Math.abs(high - low) || Math.abs(high) || 1;
  const digits =
    span >= 100 ? 2 : span >= 1 ? 4 : span >= 0.01 ? 6 : span >= 0.0001 ? 8 : 10;
  return (value: number) =>
    Number.isFinite(value)
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: Math.min(digits, 2),
          maximumFractionDigits: digits,
        })
      : "—";
}

export interface BudgetMeterProps {
  used: number;
  budget: number;
  quote?: string;
  loading?: boolean;
  labels: {
    title: string;
    /** `{pct}` — how much of the budget is spent. */
    percentOfBudget: (pct: string) => string;
    noBudget: string;
    spent: string;
  };
}

/**
 * Volume traded today against the budget that will silence the market.
 *
 * Labelled "today", never "24h": `currentDailyVolume` is a counter zeroed at the
 * daily reset, not a rolling window, so a read at 00:05 legitimately reports
 * almost nothing.
 */
export function BudgetMeter({
  used,
  budget,
  quote = "",
  loading,
  labels,
}: BudgetMeterProps) {
  const hasBudget = budget > 0;
  const pct = hasBudget ? (used / budget) * 100 : 0;
  const spent = hasBudget && used >= budget;

  const fill = spent
    ? "bg-destructive"
    : pct > 80
      ? "bg-warning"
      : "bg-success";

  return (
    <MeterFrame
      label={labels.title}
      verdict={
        loading ? (
          <Loadable loading placeholder="00% of budget">
            {null}
          </Loadable>
        ) : hasBudget ? (
          spent ? (
            labels.spent
          ) : (
            labels.percentOfBudget(pct.toFixed(pct < 10 ? 1 : 0))
          )
        ) : (
          labels.noBudget
        )
      }
      verdictClassName={
        spent
          ? "text-destructive-ink"
          : hasBudget && pct > 80
            ? "text-warning-ink"
            : "text-muted-foreground"
      }
      footer={
        <>
          <span className="font-mono tabular-nums text-foreground">
            <Loadable loading={Boolean(loading)} placeholder="000,000">
              {used.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Loadable>
          </span>
          <span className="font-mono tabular-nums">
            {hasBudget
              ? `${budget.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quote}`
              : quote}
          </span>
        </>
      }
    >
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={labels.title}
      >
        {/* No fill at all without a budget: a full track would read as "budget
            exhausted" and an empty one as "nothing traded", and neither is what
            an unset limit means. */}
        {hasBudget && !loading ? (
          <span
            aria-hidden
            className={cn("absolute inset-y-0 left-0 rounded-full", fill)}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        ) : null}
      </div>
    </MeterFrame>
  );
}
