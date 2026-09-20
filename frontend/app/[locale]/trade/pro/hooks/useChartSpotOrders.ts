"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { $fetch } from "@/lib/api";
import type { MarketType } from "../types/common";

/**
 * THE OPEN ORDERS THE CHART DRAWS.
 * ============================================================================
 *
 * `spot-order-renderer.ts` in the chart engine is 520 lines of entry lines,
 * fill markers, TP/SL rails and hover tooltips, wired all the way down through
 * `ChartSwitcher` — and gated on `spotOrders.length > 0`, which was permanently
 * zero because no mount site had ever passed the prop. Binary orders are drawn
 * on the chart; spot and futures orders were not, on a page whose entire job is
 * placing them.
 *
 * WHY A SECOND FETCH RATHER THAN A SHARED STORE. The open-orders list already
 * exists in `OrdersPanel`, in that component's own state behind a module-level
 * cache — but the panel is a SIBLING of the chart, not an ancestor, and it is
 * unmounted whenever the trader collapses the bottom drawer. Reading its cache
 * would give the chart orders that vanish when a panel it does not control is
 * hidden. So this owns its own read of the same endpoint: one GET of the OPEN
 * list, refreshed on the same `tp-order-updated` event every other consumer on
 * this page listens to, and nothing at all when the drawer is open or shut.
 *
 * Only OPEN orders are fetched. A filled order is history the candles already
 * tell — the renderer's fill marker is for a partial fill on a still-live
 * order — and pulling the CLOSED list too would double the traffic to draw
 * markers nobody asked for.
 */

/** The chart engine's `SpotOrder`. Duplicated because the engine is an addon. */
export interface ChartSpotOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  amount: number;
  price: number;
  filledAmount?: number;
  filledPrice?: number;
  status:
    | "OPEN"
    | "FILLED"
    | "PARTIALLY_FILLED"
    | "CANCELLED"
    | "EXPIRED"
    | "REJECTED";
  createdAt: number;
  filledAt?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  isDemo?: boolean;
  fee?: number;
  total?: number;
}

const EMPTY: ChartSpotOrder[] = [];

/** Never hammer the endpoint, however many order events land at once. */
const REFRESH_COOLDOWN_MS = 1500;

function toNum(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `createdAt` arrives as an ISO string and the renderer needs epoch millis to
 * place the marker on the time axis. A row that somehow carries neither is
 * anchored to now rather than to 1970 — a marker at the far left of every
 * chart, on a bar that has nothing to do with the order, is the one failure
 * mode worth spending a branch on.
 */
function toEpoch(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toChartOrder(raw: any, now: number): ChartSpotOrder {
  const amount = toNum(raw?.amount);
  const filled = toNum(raw?.filled);
  const price = toNum(raw?.price);

  /*
    An order the engine can place. `status` decides the marker's fill and the
    tooltip's wording, and the backend has no PARTIALLY_FILLED state of its own
    — a part-filled order is still OPEN with a non-zero `filled` — so the
    distinction is derived here rather than trusted from the wire.
  */
  const status: ChartSpotOrder["status"] =
    filled > 0 && filled < amount ? "PARTIALLY_FILLED" : "OPEN";

  return {
    id: String(raw?.id ?? raw?.orderId ?? ""),
    symbol: String(raw?.symbol ?? ""),
    side: raw?.side?.toUpperCase?.() === "SELL" ? "SELL" : "BUY",
    type: (raw?.type?.toUpperCase?.() || "LIMIT") as ChartSpotOrder["type"],
    amount,
    price,
    filledAmount: filled > 0 ? filled : undefined,
    status,
    createdAt: toEpoch(raw?.createdAt ?? raw?.created_at, now),
    stopPrice:
      raw?.stopPrice !== undefined && raw?.stopPrice !== null
        ? toNum(raw.stopPrice)
        : undefined,
    isDemo: Boolean(raw?.isDemo),
    total: amount > 0 && price > 0 ? amount * price : undefined,
  };
}

function endpointFor(marketType: MarketType): string {
  if (marketType === "futures") return "/api/futures/order";
  if (marketType === "eco") return "/api/ecosystem/order";
  return "/api/exchange/order";
}

export function useChartSpotOrders(
  symbol: string,
  marketType: MarketType,
  enabled = true
): ChartSpotOrder[] {
  const [orders, setOrders] = useState<ChartSpotOrder[]>(EMPTY);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);
  /*
    Which read is the current one. Several can be outstanding — a cancel and a
    fill landing together fire two events — and they do not resolve in the order
    they were sent, so an older response committing last would put a cancelled
    order's line back on the chart.
  */
  const generationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (force: boolean) => {
      if (!enabled || !symbol) return;

      const now = Date.now();
      if (!force && (inFlightRef.current || now - lastFetchRef.current < REFRESH_COOLDOWN_MS)) {
        return;
      }

      const [currency, pair] = symbol.split("/");
      if (!currency || !pair) return;

      const generation = ++generationRef.current;
      inFlightRef.current = true;
      lastFetchRef.current = now;

      try {
        const result = await $fetch<any>({
          url: `${endpointFor(marketType)}?type=OPEN&currency=${currency}&pair=${pair}`,
          method: "GET",
          silent: true,
        });

        if (!mountedRef.current || generation !== generationRef.current) return;

        /*
          `$fetch` resolves with an envelope and never throws, so an error is a
          field on the result. Treated as "leave what we have" rather than as
          "no orders": clearing the chart because one poll failed would erase
          lines for orders that are still live.
        */
        if (result.error) return;

        const rows = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.data)
            ? result.data.data
            : [];

        const mapped = rows
          .map((row: any) => toChartOrder(row, now))
          .filter((order: ChartSpotOrder) => order.id && order.price > 0);

        setOrders(mapped.length > 0 ? mapped : EMPTY);
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, symbol, marketType]
  );

  // A pair or market change makes the held rows wrong, not stale: they belong to
  // a market that is no longer on screen. Drop them before the new read lands.
  useEffect(() => {
    setOrders(EMPTY);
    if (!enabled) return;
    void refresh(true);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onOrderUpdate = () => {
      void refresh(false);
    };
    window.addEventListener("tp-order-updated", onOrderUpdate);
    return () => {
      window.removeEventListener("tp-order-updated", onOrderUpdate);
    };
  }, [enabled, refresh]);

  // A stable identity while nothing changed, so the chart's dirty-flag render
  // gate is not tripped by a poll that found the same rows.
  return useMemo(() => orders, [orders]);
}
