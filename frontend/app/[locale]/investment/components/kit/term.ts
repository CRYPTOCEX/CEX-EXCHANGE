"use client";

/**
 * The term, and the clock running against it.
 *
 * TWO THINGS THIS FIXES
 * ---------------------
 * 1. A term used to be rendered by appending an English "s" to a lowercased
 *    backend enum — `${duration.duration} ${duration.timeframe.toLowerCase()}${
 *    duration.duration > 1 ? "s" : ""}` — which produces "3 days" in English,
 *    "3 day" for a count of 1, and "3 days" in all 89 other locales too. The
 *    plural rule is a property of the language, not of a `> 1` test: Polish has
 *    three plural forms and Arabic six. `termParts` hands the count and the
 *    unit to the caller so the sentence is built by ICU in the message bundle.
 *
 * 2. The dashboard printed the literal string "Investment Duration" in the slot
 *    where the term belongs, on every row, even though `duration` is on every
 *    row of the payload.
 *
 * THE PROGRESS SEMANTICS ARE THE FOREX ONES, NOT THE STAKING ONES
 * ---------------------------------------------------------------
 * Staking's equivalent helper returns **100** when its end date is absent,
 * because a staking position with no `lockPeriodEnd` is genuinely unlocked. A
 * general investment with no `endDate` is not matured — it is a legacy row
 * whose maturity the settlement cron recomputes from `createdAt` — so copying
 * staking's helper across would have drawn every such row as a full bar with
 * "matured" beside it. Absent here means UNKNOWN, and an unknown clock renders
 * no bar at all.
 */

import { useEffect, useState } from "react";

/* ---------------------------------------------------------------------------
   Term
   ------------------------------------------------------------------------- */

export type Timeframe = "HOUR" | "DAY" | "WEEK" | "MONTH";

const TIMEFRAMES: Record<string, Timeframe> = {
  HOUR: "HOUR",
  DAY: "DAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
};

export interface TermParts {
  count: number;
  unit: Timeframe;
}

/**
 * A duration row reduced to the two values an ICU message needs.
 *
 * Returns `null` for a missing or unrecognised timeframe rather than guessing a
 * unit — a term stated in the wrong unit is worse than one left unstated, since
 * "3" beside a maturity date the reader can also see is merely incomplete,
 * while "3 months" against a 3-day position is false.
 */
export function termParts(
  duration: { duration?: number; timeframe?: string } | null | undefined
): TermParts | null {
  if (!duration) return null;
  const count = Number(duration.duration);
  if (!Number.isFinite(count)) return null;
  const unit = TIMEFRAMES[String(duration.timeframe ?? "").toUpperCase()];
  if (!unit) return null;
  return { count, unit };
}

/* ---------------------------------------------------------------------------
   Clock
   ------------------------------------------------------------------------- */

export interface MaturityClock {
  /** Milliseconds until maturity. Negative once it has passed. */
  remainingMs: number;
  /** 0-100, or `null` when the term's bounds are not both known. */
  progress: number | null;
  /** Maturity is in the past. */
  matured: boolean;
  /** Both ends of the term are known, so a bar can honestly be drawn. */
  known: boolean;
  endDate: Date | null;
}

/**
 * Where a position stands between its start and its maturity, read against one
 * supplied instant.
 *
 * `now` is a PARAMETER rather than a `Date.now()` call inside the function, so
 * this stays pure and — more importantly — so every countdown rendered in one
 * pass reads the same instant. Twenty rows each calling `Date.now()`
 * independently produce twenty slightly different "now"s, and the row that
 * happens to cross maturity mid-render disagrees with the one beside it.
 */
export function maturityClock(
  investment: {
    createdAt?: string | Date | null;
    endDate?: string | Date | null;
    status?: string;
  } | null
    | undefined,
  now: number
): MaturityClock {
  const endRaw = investment?.endDate;
  const startRaw = investment?.createdAt;

  const end = endRaw ? new Date(endRaw) : null;
  const start = startRaw ? new Date(startRaw) : null;
  const endValid = end && !Number.isNaN(end.getTime()) ? end : null;
  const startValid = start && !Number.isNaN(start.getTime()) ? start : null;

  if (!endValid) {
    return {
      remainingMs: 0,
      progress: null,
      matured: false,
      known: false,
      endDate: null,
    };
  }

  const endMs = endValid.getTime();
  const remainingMs = endMs - now;

  /*
    A settled position is finished regardless of what its dates say. The cron
    can run minutes after `endDate`, and an admin can settle one early; in both
    cases a bar drawn from the dates would sit at 97% under the word
    "Completed". Status wins over arithmetic here.
  */
  const settled = String(investment?.status ?? "").toUpperCase() !== "ACTIVE";

  if (!startValid) {
    // We know when it ends but not when it began, so there is no span to
    // measure against — the countdown is real, the bar is not.
    return {
      remainingMs,
      progress: null,
      matured: settled || remainingMs <= 0,
      known: false,
      endDate: endValid,
    };
  }

  const startMs = startValid.getTime();
  const span = endMs - startMs;

  const progress =
    settled || remainingMs <= 0
      ? 100
      : span <= 0
        ? 100
        : Math.max(0, Math.min(100, ((now - startMs) / span) * 100));

  return {
    remainingMs,
    progress,
    matured: settled || remainingMs <= 0,
    known: true,
    endDate: endValid,
  };
}

/* ---------------------------------------------------------------------------
   One clock per page
   ------------------------------------------------------------------------- */

/**
 * ONE INTERVAL FOR THE WHOLE SCREEN.
 *
 * A portfolio can hold twenty running positions. Twenty cards each owning a
 * `setInterval` is twenty timers firing at twenty different offsets, so the
 * page re-renders continuously and no two countdowns agree on the instant. This
 * hook is called ONCE, by the screen, and the value it returns is threaded down
 * into `maturityClock` for every row.
 *
 * It ticks once a minute, not once a second: nothing here is a payment window.
 * The shortest term the backend offers is measured in HOURS, so a second-hand
 * would redraw the page sixty times to move a bar by a pixel it cannot render.
 *
 * `active` stops the timer entirely when nothing is running — a portfolio of
 * settled positions has no clock, and an interval left spinning behind it is a
 * background wake-up on a phone for a screen that will never change.
 */
export function usePageClock(active: boolean, intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);

    /*
      A BACKGROUNDED TAB DOES NOT RUN ITS INTERVAL.

      Browsers throttle and eventually freeze timers in hidden tabs, so a
      portfolio left open overnight comes back showing last night's countdown
      and keeps showing it until the next tick fires. Reading the clock on
      `visibilitychange` corrects it on the frame the tab becomes visible,
      which is the one moment somebody is looking at it.

      This is also why the correction is a LISTENER rather than a `setNow` in
      the effect body: the effect only re-runs when `active` or `intervalMs`
      changes, so a body statement would never have fired on a tab restore
      anyway — and calling setState synchronously in an effect body triggers a
      cascading render for a value the interval was about to supply.
    */
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, intervalMs]);

  return now;
}
