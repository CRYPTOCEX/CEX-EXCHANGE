"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildBook,
  EMPTY_BOOK,
  type BookSnapshot,
  type RawLevel,
} from "@/lib/orderbook";

/**
 * The order book's ingestion side: one render per animation frame.
 *
 * ---------------------------------------------------------------------------
 * WHY A FRAME, AND NOT A TIMER
 * ---------------------------------------------------------------------------
 *
 * Both panels used to call `setState` from inside the WebSocket callback, once
 * per message. A liquid market pushes a book far faster than a screen can show
 * one, so that is a re-render of a 50-row grid per message with no upper bound
 * — the panel's cost is set by the market's activity rather than by anything
 * the user can see.
 *
 * The retail panel did carry a hand-rolled `setTimeout` throttle for exactly
 * this, roughly a hundred lines of pending-buffer and last-update refs. It was
 * never wired up: the subscription callback it was written for was replaced by
 * an inline one that calls `setOrderbookData` directly, and the throttle was
 * left behind, defined, exported and reached by nothing.
 *
 * `requestAnimationFrame` is the right clock and a timer is not, for two
 * reasons a timer cannot reproduce:
 *
 *  - It is the rate the screen actually redraws. A 100ms timer either drops
 *    frames or wastes them; rAF cannot.
 *  - **A hidden tab stops calling it.** A background terminal with six markets
 *    open costs nothing until it is looked at, whereas six 100ms timers keep
 *    rebuilding books nobody is watching. Nothing is lost by the pause: each
 *    message carries a whole book, so the newest supersedes the rest.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO PER-LEVEL FLASH, AND IT IS NOT COMING BACK
 * ---------------------------------------------------------------------------
 *
 * This hook used to also compute a change set - which levels grew, which shrank
 * - so the panels could pulse a row when its size moved. Three rounds of tuning
 * did not make it readable, and the reason is structural rather than cosmetic:
 * this platform's books are quoted by its own market maker, which adjusts SIZE
 * at STABLE prices continuously. Genuine size changes therefore arrive on most
 * visible levels on most frames, so a per-level change flash is near-continuous
 * whatever its colour, its duration or its repeat cap. A signal that fires
 * constantly is not a signal.
 *
 * What survives is the motion that tracks a QUANTITY rather than an EVENT: the
 * depth bars ease to their new width, so the shape of the book moves smoothly
 * instead of jumping. `diffSide` and `sizeMap` went with the flash - see
 * `lib/orderbook.ts`.
 */

export interface OrderBookPayload {
  bids?: readonly RawLevel[] | null;
  asks?: readonly RawLevel[] | null;
  timestamp?: number;
}

export interface UseOrderBookOptions {
  /** Grouping increment. 0 leaves prices as they arrive. */
  tickSize?: number;
  /** Rows to keep per side. */
  depth?: number;
}

export interface UseOrderBookResult {
  book: BookSnapshot;
  /** True once a payload — even an empty one — has been committed. */
  hasData: boolean;
  /** Timestamp of the newest committed payload, or 0. */
  updatedAt: number;
  /** Feed a payload in. Safe to call from a WebSocket callback at any rate. */
  push: (payload: OrderBookPayload | null | undefined) => void;
  /** Drop everything. Call on a symbol change BEFORE the new subscription. */
  reset: () => void;
}

interface CommittedState {
  book: BookSnapshot;
  hasData: boolean;
  updatedAt: number;
}

const INITIAL: CommittedState = {
  book: EMPTY_BOOK,
  hasData: false,
  updatedAt: 0,
};

export function useOrderBook({
  tickSize = 0,
  depth = 0,
}: UseOrderBookOptions = {}): UseOrderBookResult {
  const [state, setState] = useState<CommittedState>(INITIAL);

  /* The newest payload that has not been drawn yet. Overwritten, never queued:
     each message is a whole book, so an undrawn one has no value once a newer
     one exists. */
  const pendingRef = useRef<OrderBookPayload | null>(null);
  /* The last payload that WAS drawn, so a grouping change can rebuild without
     waiting for the market to move — a thin book at 3am would otherwise leave
     the control looking broken for seconds. */
  const lastRef = useRef<OrderBookPayload | null>(null);
  const frameRef = useRef<number | null>(null);

  /* Read inside the frame callback, which is not a render, so they must not be
     captured by closure — a rAF scheduled before a grouping change would
     otherwise commit at the OLD tick size.

     Assigned in an EFFECT, not during render. A ref written during render is
     not a render output, and the React compiler is entitled to reorder around
     it; the same rule is why `hooks/use-coalesced-callback.ts` assigns its
     callback ref the same way. Declared before the rebuild effect below so it
     runs first — effects fire in declaration order, so the rebuild always sees
     the options it was scheduled for. */
  const optionsRef = useRef({ tickSize, depth });
  useEffect(() => {
    optionsRef.current = { tickSize, depth };
  }, [tickSize, depth]);

  const mountedRef = useRef(true);

  const commit = useCallback((payload: OrderBookPayload | null) => {
    if (!mountedRef.current) return;

    const { tickSize: tick, depth: rows } = optionsRef.current;

    const book = buildBook({
      bids: payload?.bids ?? null,
      asks: payload?.asks ?? null,
      tickSize: tick,
      depth: rows,
    });

    setState({
      book,
      hasData: true,
      updatedAt: payload?.timestamp ?? Date.now(),
    });
  }, []);

  const push = useCallback(
    (payload: OrderBookPayload | null | undefined) => {
      if (!mountedRef.current) return;

      const normalized: OrderBookPayload = {
        bids: payload?.bids ?? [],
        asks: payload?.asks ?? [],
        timestamp: payload?.timestamp,
      };

      pendingRef.current = normalized;
      lastRef.current = normalized;

      if (frameRef.current !== null) return;

      if (typeof requestAnimationFrame !== "function") {
        // Server render or a test environment without a frame clock. Commit
        // straight through rather than swallowing the payload.
        const next = pendingRef.current;
        pendingRef.current = null;
        commit(next);
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) commit(next);
      });
    },
    [commit]
  );

  const reset = useCallback(() => {
    pendingRef.current = null;
    lastRef.current = null;
    if (frameRef.current !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;
    if (mountedRef.current) setState(INITIAL);
  }, []);

  /* A grouping or depth change rebuilds from the payload already in hand. */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (lastRef.current) commit(lastRef.current);
  }, [tickSize, depth, commit]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      book: state.book,
      hasData: state.hasData,
      updatedAt: state.updatedAt,
      push,
      reset,
    }),
    [state, push, reset]
  );
}

/* ------------------------------------------------------------------ *
 * Last-price direction
 * ------------------------------------------------------------------ */

export type PriceDirection = "up" | "down" | null;

/**
 * Which way the last trade moved, held for `holdMs` and then cleared.
 *
 * Both panels grew their own copy of this, and both leaked: the direction timer
 * was started inside a WebSocket callback with a bare `setTimeout` that no
 * cleanup path could reach, so a symbol switch left a pending timer that
 * repainted the NEW market's price in the OLD market's direction colour.
 */
export function usePriceDirection(
  price: number | null | undefined,
  holdMs = 900
): PriceDirection {
  const [direction, setDirection] = useState<PriceDirection>(null);
  const previousRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (price === null || price === undefined || !Number.isFinite(price)) {
      previousRef.current = null;
      return;
    }

    const previous = previousRef.current;
    previousRef.current = price;
    if (previous === null || previous === price) return;

    setDirection(price > previous ? "up" : "down");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setDirection(null);
    }, holdMs);
  }, [price, holdMs]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    },
    []
  );

  return direction;
}
