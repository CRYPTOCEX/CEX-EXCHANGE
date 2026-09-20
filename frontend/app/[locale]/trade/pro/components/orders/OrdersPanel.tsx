"use client";

import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles, Trash2, Bot } from "lucide-react";
import { cn } from "../../utils/cn";
import { AlgoBotsTab } from "../../../components/algo/AlgoBotsTab";
import { OpenOrdersTab } from "./OpenOrdersTab";
import { OrderHistoryTab } from "./OrderHistoryTab";
import { TradeHistoryTab, type Trade } from "./TradeHistoryTab";
import type { OrderFiltersState } from "./OrderFilters";
import type { Order } from "./OrderRow";
import { isOpenStatus, mergeOrders, toPanelOrder } from "./wire";
import { useCoalescedCallback } from "@/hooks/use-coalesced-callback";
import type { MarketType } from "../../types/common";
import { $fetch } from "@/lib/api";
import { SkeletonText } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { resolveFillFee } from "../../../components/orders/fill-fee";
import { useTranslations } from "next-intl";

// AI Investment type
interface AiInvestment {
  id: string;
  planId: string;
  amount: number;
  // Null while ACTIVE: the API withholds the outcome until the investment
  // settles, so this table's "-" placeholder is backed by the payload too.
  profit: number | null;
  result: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  plan?: {
    title: string;
    profitPercentage: number;
  };
}

// Module-level cache to persist across StrictMode remounts
const ordersPanelCache = {
  lastFetchTime: 0,
  fetchInProgress: false,
  data: null as { orders: Order[]; trades: Trade[] } | null,
  /**
   * WHICH market the cached rows belong to.
   *
   * `lastFetchedKeyRef` is per INSTANCE and starts empty, so a genuine remount —
   * the panel being toggled off and on, or the tablet breakpoint swapping
   * layouts — reads as a pair change and shows skeletons over rows this module
   * is still holding. The data survived the remount; the knowledge of what it
   * was did not.
   */
  key: "",
};

// AI investments cache
const aiInvestmentsCache = {
  lastFetchTime: 0,
  fetchInProgress: false,
  data: null as AiInvestment[] | null,
};

// Cooldown to prevent StrictMode double-fetch (2 seconds)
const FETCH_COOLDOWN_MS = 2000;

/**
 * Ceiling on how often a live market may make this panel re-request its
 * snapshot. See the `reconcile` callback for why a burst must still be followed
 * by one final run rather than simply being dropped.
 */
const ORDER_RECONCILE_INTERVAL_MS = 2000;

/**
 * Does this refusal mean the order is ALREADY GONE?
 *
 * Every cancel route answers 400 for a row that has since been cancelled or
 * filled — "Order is not open", "Order is no longer open (filled or already
 * cancelled)", "Order is fully filled; nothing to cancel". That is the ordinary
 * outcome of pressing X on an order the matcher has just retired, and it is NOT
 * a failure: what the user asked for is true.
 *
 * `$fetch` never throws, so such a refusal arrives as `{ error: "<message>" }`
 * and the caller's `if (error) return` treated it as one — nothing changed on
 * screen, no message, and pressing X again did the same thing for ever. The
 * standard panel had exactly this defect and it is what the owner reported.
 *
 * MESSAGE SHAPE IS THE ONLY GATE AVAILABLE HERE, SO IT HAS TO BE A TIGHT ONE.
 *
 * The retail panel reaches the same conclusion with a status gate — it calls
 * bare `fetch`, so it can require 400 before it reads the sentence. This one
 * cannot: `$fetch` returns `{ data, error }` and NOTHING else
 * (`frontend/lib/api.ts:39-52`); both `handleError` and
 * `handleBodyIndicatedError` collapse the response to `error: message` and drop
 * the status. Nor does the sentence itself carry one —
 * `ecosystem/order/[id]/index.del.ts:686` rewraps EVERY outcome, 400 and 500
 * alike, as `Failed to cancel order: ${error.message}`.
 *
 * So the phrases matched here are the whole refusal sentences the 400 doors
 * actually emit, and nothing looser:
 *   "Order is not open"                                    (eco :346, futures :115)
 *   "Order is no longer open (filled or already cancelled)."  (eco :437, :490)
 *   "Order is fully filled; nothing to cancel."               (eco :496)
 *   "Stop order is no longer open." / "…has already triggered…" (eco :186-187)
 *
 * WHAT THIS REPLACED, AND WHY IT MATTERED. The first draft matched a bare
 * `filled`, which is a substring of "unfilled", "partially filled" and "not
 * filled", and a bare `not open`. A 500 whose inner message happened to contain
 * either — and the eco route hands the inner message straight through — was
 * swallowed as "already gone": the row was struck from the list while the order
 * was still resting and still holding the user's funds. Silently dropping a
 * live order from the panel is strictly worse than leaving a dead one on it.
 *
 * The 5xx refusals of this same route say the opposite in plain words ("the
 * order is still open — please retry", "Please try again"), so they are
 * excluded explicitly rather than left to the absence of a match.
 */
const ORDER_ALREADY_GONE =
  /order is not open|no longer open|already cancell?ed|already closed|fully filled|already filled|nothing to cancel|already triggered/i;

/** A refusal that says the order is STILL RESTING is the opposite of gone. */
const ORDER_STILL_RESTING = /still open|please retry|please try again/i;

const isAlreadyGoneError = (error: unknown): boolean => {
  const text = String(error ?? "");
  if (!text || ORDER_STILL_RESTING.test(text)) return false;
  return ORDER_ALREADY_GONE.test(text);
};

interface MarketMetadata {
  precision?: {
    price?: number;
    amount?: number;
  };
}

interface OrdersPanelProps {
  symbol: string;
  marketType: MarketType;
  className?: string;
  compact?: boolean;
  metadata?: MarketMetadata;
}

type TabType = "open" | "history" | "trades" | "ai" | "bots";

export const OrdersPanel = memo(function OrdersPanel({
  symbol,
  marketType,
  className,
  compact = false,
  metadata,
}: OrdersPanelProps) {
  const tTrade = useTranslations("trade");
  // Get user authentication status
  const user = useUserStore((state) => state.user);
  const isAuthenticated = !!user;

  // Check if AI Investment extension is installed
  const extensions = useConfigStore((state) => state.extensions);
  const isAiInvestmentEnabled = extensions?.includes("ai_investment");
  const isAlgoEnabled = extensions?.includes("trading_bot");

  const [activeTab, setActiveTab] = useState<TabType>("open");
  const [orders, setOrders] = useState<Order[]>(ordersPanelCache.data?.orders || []);
  const [trades, setTrades] = useState<Trade[]>(ordersPanelCache.data?.trades || []);
  const [isLoading, setIsLoading] = useState(!ordersPanelCache.data);
  /**
   * The last open-order read failed, so this panel does not know what is open.
   *
   * Deliberately NOT cached alongside `orders`: it describes the freshness of
   * the answer, not the answer, and a remount must start out trusting the fetch
   * it is about to make.
   */
  const [openListFailed, setOpenListFailed] = useState(false);
  const [filters, setFilters] = useState<OrderFiltersState>({
    symbol: "",
    side: "",
    hideOther: true,
  });

  // AI Investments state
  const [aiInvestments, setAiInvestments] = useState<AiInvestment[]>(aiInvestmentsCache.data || []);
  const [isLoadingAiInvestments, setIsLoadingAiInvestments] = useState(!aiInvestmentsCache.data);

  // Refs to track state without causing re-renders
  const isMountedRef = useRef(true);
  const currentSymbolRef = useRef(symbol);
  const currentMarketTypeRef = useRef(marketType);
  // Remembers the last pair/market we fetched for, so a genuine pair switch
  // forces a fresh fetch while StrictMode's same-symbol double-mount is still
  // deduped by the cooldown.
  const lastFetchedKeyRef = useRef<string>("");

  /*
   * THE ORDERS, WHERE A CALLBACK CAN READ THEM WITHOUT DEPENDING ON THEM.
   *
   * `handleModify` and `handleCancelAll` need the current list, but only at the
   * moment they are INVOKED. Taking it as a `useCallback` dependency instead
   * gave both of them a new identity on every order update — and `onModify` is a
   * prop of the memoised `OpenOrdersTab` and of all 29 memoised `OrderRow`s, so
   * one changed order repainted the entire table anyway. That is the same
   * "everything redraws on every frame" the merge in ./wire exists to avoid,
   * reached through the props instead of through the data.
   */
  const ordersRef = useRef<Order[]>(orders);
  /** See the websocket listener: a frame may arrive after the session ends. */
  const isAuthenticatedRef = useRef(isAuthenticated);
  /** Which snapshot is the newest — see `fetchAllData`'s generation check. */
  const fetchGenerationRef = useRef(0);

  // Update refs when props change
  currentSymbolRef.current = symbol;
  currentMarketTypeRef.current = marketType;
  ordersRef.current = orders;
  isAuthenticatedRef.current = isAuthenticated;

  // Determine API endpoint based on market type
  const getApiEndpoint = useCallback((path: string, mType: MarketType) => {
    if (mType === "futures") return `/api/futures/${path}`;
    if (mType === "eco") return `/api/ecosystem/${path}`;
    return `/api/exchange/${path}`;
  }, []);

  // Fetch all order data - uses module-level cache to prevent StrictMode double-fetch
  //
  // `showLoading` IS OFF BY DEFAULT, AND THAT IS THE FLICKER FIX.
  //
  // `isLoading` does not mean "busy" to the tabs below — it means "replace every
  // row with skeletons" (OpenOrdersTab, OrderHistoryTab and TradeHistoryTab all
  // render placeholder rows on it). Setting it for a REFRESH therefore deletes
  // the table the customer is reading, for as long as two HTTP round trips take,
  // and a trading bot re-quoting its ladder made that happen dozens of times a
  // second. The rows we are holding are the best thing we have to show until the
  // new ones arrive, so a refresh keeps them.
  //
  // It stays available for the one case where the old rows are genuinely wrong:
  // a pair switch, where the panel is about to show a different market's orders
  // and the ones on screen belong to the market you just left.
  const fetchAllData = useCallback(async (force = false, options?: { showLoading?: boolean }) => {
    // Don't fetch orders if user is not authenticated
    if (!isAuthenticated) {
      setOrders([]);
      setTrades([]);
      setIsLoading(false);
      // THE CACHE IS MODULE-LEVEL AND OUTLIVES THE SESSION. Clearing only the
      // state leaves the previous account's rows sitting in it, and both this
      // panel's initial state and the cooldown branch below are seeded from it —
      // so the next mount would paint somebody else's orders.
      ordersPanelCache.data = null;
      ordersPanelCache.key = "";
      return;
    }

    const now = Date.now();
    const key = `${currentSymbolRef.current}|${currentMarketTypeRef.current}`;

    // Prevent duplicate fetches - check module-level cache unless forced
    if (!force && (ordersPanelCache.fetchInProgress || now - ordersPanelCache.lastFetchTime < FETCH_COOLDOWN_MS)) {
      // If we have cached data FOR THIS MARKET, use it. Without the key test
      // this branch paints the previous pair's rows under the new pair's header
      // whenever a mount lands inside the cooldown.
      if (ordersPanelCache.data && ordersPanelCache.key === key) {
        setOrders(ordersPanelCache.data.orders);
        setTrades(ordersPanelCache.data.trades);
        setIsLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) return;

    /*
     * WHICH SNAPSHOT IS THE CURRENT ONE.
     *
     * `force` deliberately bypasses `fetchInProgress`, so several snapshots can
     * be in flight at once and they do not resolve in the order they were sent.
     * The symbol/market test below catches a response for the WRONG PAIR but
     * not an OLDER response for the right one — and an older one committing last
     * silently reinstates orders that have since been cancelled.
     */
    const generation = ++fetchGenerationRef.current;
    ordersPanelCache.fetchInProgress = true;
    ordersPanelCache.lastFetchTime = now;
    if (options?.showLoading) setIsLoading(true);

    try {
      // Use current values from refs
      const sym = currentSymbolRef.current;
      const mType = currentMarketTypeRef.current;

      // Parse symbol for query params
      const [currency, pair] = sym.split("/");

      // Fetch open and closed orders in parallel
      const [openResult, closedResult] = await Promise.all([
        $fetch<any>({
          url: `${getApiEndpoint("order", mType)}?type=OPEN&currency=${currency}&pair=${pair}`,
          method: "GET",
          silent: true,
        }),
        $fetch<any>({
          url: `${getApiEndpoint("order", mType)}?type=CLOSED&currency=${currency}&pair=${pair}`,
          method: "GET",
          silent: true,
        }),
      ]);

      if (isMountedRef.current) {
        const allOrders: Order[] = [];

        // Process open orders
        const rawOpenOrders: any[] = [];
        if (!openResult.error && openResult.data) {
          const openOrders = Array.isArray(openResult.data) ? openResult.data : openResult.data.data || [];
          rawOpenOrders.push(...openOrders);
          // Normalised by the SAME function the websocket merge uses (see
          // ./wire). Two mappers for one shape is how a socket-fed row and a
          // fetched row come to differ in a field nobody notices until a
          // `.toFixed()` throws on one door and not the other.
          openOrders.forEach((o: any) => {
            allOrders.push(toPanelOrder(o));
          });
        }

        // Process closed orders (history)
        const closedOrders: any[] = [];
        if (!closedResult.error && closedResult.data) {
          const historyOrders = Array.isArray(closedResult.data) ? closedResult.data : closedResult.data.data || [];
          historyOrders.forEach((o: any) => {
            closedOrders.push(o);
            // Don't add duplicates to allOrders
            if (!allOrders.find((existing) => existing.id === (o.id || o.orderId))) {
              // FILLED as the fallback, not OPEN: this endpoint only returns
              // terminal orders, so a row that somehow arrives without a status
              // must not be filed under the Open tab.
              allOrders.push(toPanelOrder(o, "FILLED"));
            }
          });
        }

        // Build the Trades list from individual fills (executions), not order
        // status. Every match appends a fill to the order's `trades` JSON for
        // both sides, so a partial fill is recorded the moment it happens — even
        // while the order is still OPEN. Source from per-fill records across BOTH
        // open and closed orders so partial fills appear immediately (and eco
        // "CLOSED" orders, which aren't named "FILLED", are no longer dropped).
        // Fall back to a single aggregate row for orders without per-fill detail.
        const parseFills = (raw: any): any[] => {
          if (!raw) return [];
          try {
            let parsed = raw;
            if (typeof parsed === "string") {
              parsed = JSON.parse(parsed);
              if (typeof parsed === "string") parsed = JSON.parse(parsed);
            }
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };

        const formattedTrades: Trade[] = [...rawOpenOrders, ...closedOrders].flatMap(
          (o: any) => {
            const orderId = o.id || o.orderId;
            const fills = parseFills(o.trades);
            if (fills.length > 0) {
              return fills.map((f: any, i: number) => {
                const amt = Number(f.amount || 0);
                // Shared with the standard panel — see fill-fee.ts for why this
                // must NOT be split across "filled so far".
                const feeShare = resolveFillFee(f, o);
                return {
                  id: `${orderId}:${i}`,
                  orderId,
                  symbol: o.symbol,
                  side: (f.side || o.side)?.toUpperCase() || "BUY",
                  price: Number(f.price ?? o.average ?? o.price ?? 0),
                  amount: amt,
                  fee: feeShare,
                  feeCurrency: o.feeCurrency || o.fee_currency || "USDT",
                  timestamp: f.timestamp
                    ? new Date(Number(f.timestamp)).toISOString()
                    : o.updatedAt || o.updated_at || o.createdAt || new Date().toISOString(),
                } as Trade;
              });
            }
            // Fallback for orders without per-fill detail (e.g. non-eco markets):
            // preserve prior behavior (FILLED / PARTIALLY_FILLED only). Eco orders
            // carry per-fill detail and are handled by the per-fill path above.
            if (o.status === "FILLED" || o.status === "PARTIALLY_FILLED") {
              return [{
                id: orderId,
                orderId,
                symbol: o.symbol,
                side: o.side?.toUpperCase() || "BUY",
                price: o.price,
                amount: o.filled || o.amount,
                fee: o.fee || 0,
                feeCurrency: o.feeCurrency || o.fee_currency || "USDT",
                timestamp: o.updatedAt || o.updated_at || o.createdAt || new Date().toISOString(),
              } as Trade];
            }
            return [];
          }
        );

        // Only commit if the pair we fetched for is still the current pair.
        // force=true bypasses the fetchInProgress/cooldown guard, so a slow
        // response for a PREVIOUS pair could otherwise resolve last and
        // overwrite the new pair's rows (which hideOther then filters to empty,
        // reproducing the "orders disappear on pair change" symptom).
        //
        // ...and only if it is the NEWEST snapshot for that pair. Two reads of
        // the same market can be open at once and finish out of order; the older
        // one landing last reinstates orders that have since been cancelled.
        if (
          generation === fetchGenerationRef.current &&
          currentSymbolRef.current === sym &&
          currentMarketTypeRef.current === mType
        ) {
          // Whether the OPEN read succeeded is a separate fact from what it
          // returned, and it is the one the empty state and the Cancel All
          // button need. `openResult.error` covers a transport failure AND this
          // platform's HTTP-200-with-an-error-body envelope, both of which
          // $fetch folds into `error` rather than throwing.
          const openFailed = Boolean(openResult.error);
          if (openFailed) {
            // Both order reads are `silent: true` — deliberately, because
            // `reconcile` fires on a 2-second coalescing window and a toast would
            // spam. Silent to the customer is fine; silent to the console is not,
            // because this is the failure that used to render as "No open
            // orders".
            console.error(
              "[OrdersPanel] open-order read failed; showing the last known rows",
              openResult.error
            );
          }
          setOpenListFailed(openFailed);

          /*
           * A FAILED OPEN READ MUST NOT DELETE ROWS.
           *
           * This snapshot REPLACES the list — and it runs after every websocket
           * frame, on a 2-second coalescing window. So a single failed open read
           * used to erase every resting order the panel already knew about,
           * including ones the socket had just delivered, and the next frame's
           * reconcile would erase them again. The customer watches their open
           * orders disappear while nothing anywhere says a request failed.
           *
           * When the open read failed, `allOrders` holds ONLY history, so the
           * open rows already on screen are carried forward instead. They are
           * stale by definition — that is what the error state above says — but
           * a stale row a customer can cancel beats a row that silently is not
           * there. Rows are only ever REMOVED by a snapshot that succeeded.
           */
          // `ordersRef` rather than the `orders` state: this callback is
          // memoised on [getApiEndpoint, isAuthenticated], so the state it closes
          // over is whatever it was when the callback was created. The ref is
          // kept in step on every render and exists for exactly this — reading
          // the current list without depending on it.
          const held = openFailed ? ordersRef.current : [];
          const arriving = new Set(allOrders.map((o) => String(o.id)));
          const committed = openFailed
            ? [
                ...held.filter(
                  (o) => isOpenStatus(o.status) && !arriving.has(String(o.id))
                ),
                ...allOrders,
              ]
            : allOrders;

          // Update module-level cache
          ordersPanelCache.data = { orders: committed, trades: formattedTrades };
          ordersPanelCache.key = `${sym}|${mType}`;

          setOrders(committed);
          setTrades(formattedTrades);
        }
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      // Same reasoning as the `openResult.error` branch: a throw anywhere in the
      // fetch-and-normalise path leaves this panel with no idea what is open,
      // and it must say so rather than fall back to the empty state.
      if (isMountedRef.current) setOpenListFailed(true);
    } finally {
      ordersPanelCache.fetchInProgress = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getApiEndpoint, isAuthenticated]);

  // Fetch on mount AND whenever the pair / market type changes.
  // The orders endpoint is scoped by currency/pair, so a pair switch MUST
  // re-request the snapshot — otherwise the stale (old-pair) rows are filtered
  // out by hideOther and the panel stays empty until a manual page refresh.
  useEffect(() => {
    isMountedRef.current = true;

    const key = `${symbol}|${marketType}`;
    if (lastFetchedKeyRef.current !== key) {
      // Real pair/market change (or first mount): force past the cooldown, and
      // this IS the case that wants skeletons — the rows on screen belong to the
      // market the customer just left, and `hideOther` is about to filter them
      // all out anyway. Showing placeholders is honest; showing the old pair's
      // orders under the new pair's header is not.
      //
      // ...UNLESS THIS MODULE IS ALREADY HOLDING THAT MARKET'S ROWS. A remount
      // (the panel toggled off and on, the tablet breakpoint swapping layouts)
      // resets this per-instance ref to "" and so reads as a pair change, while
      // the rows themselves survived in the module cache. Blanking them there
      // would be flicker with no cause at all.
      const cacheIsForThisKey =
        ordersPanelCache.data !== null && ordersPanelCache.key === key;
      lastFetchedKeyRef.current = key;
      fetchAllData(true, { showLoading: !cacheIsForThisKey });
    } else {
      // Same key (e.g. StrictMode remount): let the cooldown dedupe.
      fetchAllData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [symbol, marketType, fetchAllData]);

  /*
   * THE RECONCILE, AND WHY IT IS RATE-LIMITED RATHER THAN PROMPT.
   *
   * Merging the websocket frame (below) keeps the Open tab exact, but two of
   * this panel's lists are DERIVED from fields a frame does not carry in full:
   * the Trades tab is built by parsing each order's `trades` fill JSON, and the
   * History tab needs the closed-orders endpoint. Those still want a snapshot.
   *
   * They do not want one per frame. `useCoalescedCallback` runs the first
   * request in a quiet period immediately — so a customer cancelling an order
   * sees the tabs settle at once — absorbs everything inside the window, and
   * guarantees one final run after the burst, which is the run that carries the
   * bot's last state. Two seconds matches the module-level FETCH_COOLDOWN_MS
   * this panel has always used to dedupe its own mounts.
   *
   * It is SILENT: no `showLoading`, so nothing on screen is replaced while it
   * runs. The rows update in place when it lands, or not at all if nothing
   * changed.
   */
  const reconcile = useCoalescedCallback(() => {
    fetchAllData(true);
  }, ORDER_RECONCILE_INTERVAL_MS);

  // Listen for order updates from WebSocket events
  useEffect(() => {
    const handleOrderUpdate = (event: Event) => {
      /*
       * APPLY THE ORDER WE WERE GIVEN, DO NOT GO AND ASK FOR ALL OF THEM.
       *
       * The orders socket sends the changed order itself, and the Pro layout now
       * forwards it as the event detail. Merging it is instant, costs no
       * request, touches only the row that changed (so `OrderRow`'s memo keeps
       * every other row from repainting), and — the point of the exercise —
       * never puts the table into a loading state.
       *
       * The detail is absent for the events this panel and the order form
       * dispatch after a user action (a cancel, a modify, a placement). Those
       * fall through to the reconcile, which is the only thing that can tell us
       * what the server actually did.
       */
      /*
       * NOT WHILE SIGNED OUT. `orders-ws` replays its last cached frame to a
       * late subscriber on a timer, so a frame can arrive after the session
       * ended — and merging it would put the previous session's rows back on a
       * panel that has just cleared them. Read through a ref so this listener
       * keeps its `[reconcile]` deps and is not torn down and re-registered
       * during hydration, which is a way to MISS frames.
       */
      if (!isAuthenticatedRef.current) return;

      const detail = (event as CustomEvent).detail;
      /*
       * ONE ORDER OR MANY. The socket sends an array; `useOrderSubmit` dispatches
       * the single order it just placed. Accepting both is what makes a
       * customer's own new order appear at once rather than on the reconcile.
       */
      const frame: any[] = Array.isArray(detail)
        ? detail
        : detail && typeof detail === "object" && (detail.id || detail.orderId)
          ? [detail]
          : [];

      if (frame.length > 0) {
        // NOT `.map(toPanelOrder)` — `map` passes the INDEX as the second
        // argument, which is this function's `fallbackStatus`.
        const incoming = frame
          .filter((raw: any) => raw && (raw.id || raw.orderId))
          .map((raw: any) => toPanelOrder(raw));
        if (incoming.length > 0) {
          const heldSymbol = currentSymbolRef.current;
          setOrders((prev) => {
            /*
             * APPENDS ARE SCOPED TO THIS MARKET; UPDATES ARE NOT.
             *
             * The orders stream is USER-scoped — every market the account
             * trades — while the snapshot behind this list is pair-scoped
             * (`?currency=&pair=`). So appending another market's order adds a
             * row the very next reconcile deletes, and `Cancel All (N)` counts
             * the whole unfiltered list: the button's number would tick up and
             * back down on every frame from a market the customer is not even
             * looking at. Flicker of a subtler kind, from the fix for flicker.
             *
             * An update to a row we ALREADY hold is always applied, whatever its
             * symbol — dropping it would leave a stale row on screen.
             */
            const held = new Set(prev.map((o) => String(o.id)));
            const applicable = incoming.filter(
              (o) => held.has(String(o.id)) || o.symbol === heldSymbol
            );
            const next = mergeOrders(prev, applicable);
            // Keep the module-level cache in step, or a StrictMode remount (or a
            // tab switch back to this panel) restores a list that predates every
            // frame merged since the last snapshot.
            if (next !== prev && ordersPanelCache.data) {
              ordersPanelCache.data = { ...ordersPanelCache.data, orders: next };
            }
            return next;
          });
        }
      }

      reconcile();
    };

    window.addEventListener("tp-order-updated", handleOrderUpdate);
    window.addEventListener("order-placed", handleOrderUpdate);

    return () => {
      window.removeEventListener("tp-order-updated", handleOrderUpdate);
      window.removeEventListener("order-placed", handleOrderUpdate);
    };
  }, [reconcile]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.hideOther && order.symbol !== symbol) return false;
      if (filters.symbol && !order.symbol.includes(filters.symbol.toUpperCase())) return false;
      if (filters.side && order.side !== filters.side) return false;
      return true;
    });
  }, [orders, filters, symbol]);

  const openOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED");
  }, [filteredOrders]);

  /*
   * EVERY open order, IGNORING the panel's filters — which is the set Cancel All
   * actually acts on.
   *
   * The button was rendered on `openOrders`, the FILTERED list, and that is wrong
   * in both directions. It disappeared whenever the current filters matched
   * nothing — so a customer whose only open orders are on another market (the
   * "hide other pairs" filter is on by default) had no bulk cancel at all, which
   * is the exact complaint that started this: an order they could not get rid of.
   * And when it WAS shown it understated its own scope, because the endpoint
   * cancels every market, so pressing it while looking at one pair silently
   * cancelled the others too.
   *
   * Showing it whenever anything is open, with the real count beside it, makes the
   * control both reachable and honest.
   */
  const allOpenOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED").length;
  }, [orders]);

  const orderHistory = useMemo(() => {
    return filteredOrders.filter((o) => o.status !== "OPEN" && o.status !== "PARTIALLY_FILLED");
  }, [filteredOrders]);

  // Individual executions (fills), including partial fills on still-OPEN orders.
  // Mirrors the order filters and shows newest first.
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        if (filters.hideOther && t.symbol !== symbol) return false;
        if (filters.symbol && !t.symbol.includes(filters.symbol.toUpperCase())) return false;
        if (filters.side && t.side !== filters.side) return false;
        return true;
      })
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [trades, filters, symbol]);

  // In-flight guards. Cancel requests move money server-side; if one is slow,
  // repeated clicks used to fire ADDITIONAL concurrent requests for the same
  // order/user — observed in production as 5-6 simultaneous DELETE
  // /order/all calls that convoyed on wallet row locks (50s "Lock wait
  // timeout" storms, 2½-minute requests). Refs (not state) so the guard is
  // synchronous and can't be raced by a re-render.
  const cancellingOrderIdsRef = useRef<Set<string>>(new Set());
  const cancelAllInFlightRef = useRef(false);

  // Cancel order
  const handleCancel = useCallback(async (orderId: string, createdAt: string) => {
    if (cancellingOrderIdsRef.current.has(orderId)) return;
    cancellingOrderIdsRef.current.add(orderId);
    try {
      const mType = currentMarketTypeRef.current;
      let endpoint = `${getApiEndpoint("order", mType)}/${orderId}`;

      // Ecosystem and futures require timestamp query parameter
      if (mType === "eco" || mType === "futures") {
        // Convert ISO date to timestamp if needed
        const timestamp = new Date(createdAt).getTime();
        endpoint += `?timestamp=${timestamp}`;
      }

      const { error } = await $fetch({
        url: endpoint,
        method: "DELETE",
        silent: true,
      });

      // An "already gone" refusal falls through to the same path a success
      // takes: the row is marked CANCELLED locally and the reconcile listener
      // below confirms it against the server. See isAlreadyGoneError.
      if (error && !isAlreadyGoneError(error)) {
        console.error("Failed to cancel order:", error);
        return;
      }

      // Update local state on success
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "CANCELLED" as const } : o
        )
      );

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("tp-order-updated"));
    } catch (err) {
      console.error("Failed to cancel order:", err);
    } finally {
      cancellingOrderIdsRef.current.delete(orderId);
    }
  }, [getApiEndpoint]);

  // Modify order — implemented as CANCEL + REPLACE.
  //
  // The ecosystem/exchange/futures engines have no in-place amend endpoint (there
  // is no *.put.ts route), and a resting order can't be safely mutated in the
  // matching queue anyway. So we cancel the existing order and place a fresh one
  // with the new price/amount. Only LIMIT orders are modifiable (MARKET fills
  // immediately; STOP types aren't supported by the eco engine).
  const handleModify = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      const mType = currentMarketTypeRef.current;
      const existing = ordersRef.current.find((o) => o.id === orderId);
      if (!existing) return;

      const isStop =
        existing.type === "STOP_LIMIT" || existing.type === "STOP_MARKET";
      if (existing.type !== "LIMIT" && !isStop) {
        console.error("Only LIMIT and STOP orders can be modified");
        return;
      }

      const hasLimitPrice = existing.type !== "STOP_MARKET";
      const newPrice = updates.price ?? existing.price;
      const newAmount = updates.amount ?? existing.amount;
      const newStopPrice = updates.stopPrice ?? existing.stopPrice;

      // Nothing actually changed — no-op.
      if (
        newPrice === existing.price &&
        newAmount === existing.amount &&
        newStopPrice === existing.stopPrice
      )
        return;

      if ((hasLimitPrice && !(newPrice > 0)) || !(newAmount > 0)) {
        console.error("Modify: price and amount must be greater than zero");
        return;
      }
      if (isStop && !((newStopPrice ?? 0) > 0)) {
        console.error("Modify: trigger (stop) price must be greater than zero");
        return;
      }
      // Can't shrink below what's already filled (stops always have filled 0).
      if (newAmount <= existing.filled) {
        console.error("New amount must exceed the already-filled amount");
        return;
      }

      try {
        // 1) Cancel the existing order (eco/futures require the createdAt
        //    timestamp; the eco endpoint routes stop ids to the stop-cancel
        //    path automatically and ignores the timestamp there).
        let cancelUrl = `${getApiEndpoint("order", mType)}/${orderId}`;
        if (mType === "eco" || mType === "futures") {
          cancelUrl += `?timestamp=${new Date(existing.createdAt).getTime()}`;
        }
        const { error: cancelErr } = await $fetch({
          url: cancelUrl,
          method: "DELETE",
        });
        if (cancelErr) {
          // A stop can fire between opening the edit form and saving — the
          // backend then rejects the cancel with "already triggered". That's
          // an expected race, not a failure: the stop is now a live order.
          // Either way the replacement must NOT be placed; refetch so the UI
          // shows the actual state.
          console.error("Modify failed while cancelling:", cancelErr);
          // The dispatch IS the refresh: this panel listens on the same window
          // and answers with a coalesced snapshot. Calling fetchAllData here too
          // ran a second, concurrent one — four GETs for one user action.
          window.dispatchEvent(new CustomEvent("tp-order-updated"));
          return;
        }

        // 2) Re-create with the new values. side/type are already UPPERCASE in
        //    panel state (fetchAllData uppercases them); the backend accepts
        //    either case. STOP_MARKET carries no limit price.
        const [currency, pair] = existing.symbol.split("/");
        const body: Record<string, any> = {
          currency,
          pair,
          type: existing.type,
          side: existing.side,
          amount: newAmount,
        };
        if (hasLimitPrice) body.price = newPrice;
        if (isStop) body.stopPrice = newStopPrice;
        const { error: createErr } = await $fetch({
          url: getApiEndpoint("order", mType),
          method: "POST",
          body,
        });
        if (createErr) {
          // Non-atomic gap: the old order is already cancelled (funds refunded)
          // but the replacement failed. Surface it clearly rather than silently.
          console.error(
            "Modify: order was cancelled but the replacement failed:",
            createErr
          );
        }

        // Notify other panels AND ourselves: the listener answers this with a
        // coalesced snapshot, so no direct fetch belongs here.
        window.dispatchEvent(new CustomEvent("tp-order-updated"));
      } catch (err) {
        console.error("Failed to modify order:", err);
      }
    },
    // NOT `orders` — read through `ordersRef` above, so this callback's identity
    // survives an order update and the memoised rows are not all repainted.
    [getApiEndpoint]
  );

  // Cancel all open orders
  const handleCancelAll = useCallback(async () => {
    if (cancelAllInFlightRef.current) return;

    const openOrders = ordersRef.current.filter(
      (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
    );

    if (openOrders.length === 0) return;

    cancelAllInFlightRef.current = true;
    try {
      const mType = currentMarketTypeRef.current;

      // Check if there's a bulk cancel endpoint
      if (mType === "eco") {
        // Ecosystem has a bulk cancel endpoint
        const { data, error } = await $fetch({
          url: "/api/ecosystem/order/all",
          method: "DELETE",
          silent: true,
        });

        if (error) {
          console.error("Failed to cancel all orders:", error);
          // The server's answer is the only thing that can say what is still
          // open now. Returning without asking left the rows exactly as they
          // were, so a bulk cancel that partly succeeded showed nothing at all.
          window.dispatchEvent(new CustomEvent("tp-order-updated"));
          return;
        }

        /*
         * A 200 DOES NOT MEAN EVERY ORDER WAS CANCELLED.
         *
         * The endpoint loops so one bad order cannot block the rest, and it
         * reports what it could not do as `failedCount`. Marking every row
         * CANCELLED below on the strength of the status code alone REMOVED a
         * still-open, still-funded order from the customer's list — while it went
         * on resting in the order book. That is the shape of the incident this
         * was found from: depth on the chart, nothing in Open Orders, and a
         * Cancel All that appeared to work.
         *
         * So when anything failed, do not touch local state — refetch, and let the
         * server say what is actually still open.
         */
        if (Number((data as any)?.failedCount) > 0) {
          console.warn(
            `Cancel all: ${(data as any).failedCount} order(s) could not be cancelled and are still open`
          );
          // Refetch via the shared listener rather than directly — see the note
          // on the modify path.
          window.dispatchEvent(new CustomEvent("tp-order-updated"));
          return;
        }
      } else if (mType === "futures") {
        // Futures has a bulk cancel endpoint
        const { data, error } = await $fetch({
          url: "/api/futures/order/all",
          method: "DELETE",
          silent: true,
        });

        if (error || data?.complete === false || Number(data?.failedCount) > 0) {
          console.error("Failed to cancel all orders:", error);
          // Same reasoning as the ecosystem branch above: refetch rather than
          // leave the panel showing a list nobody has re-read.
          window.dispatchEvent(new CustomEvent("tp-order-updated"));
          return;
        }
      } else {
        // For exchange, cancel one by one (no timestamp needed)
        await Promise.all(
          openOrders.map((order) =>
            $fetch({
              url: `${getApiEndpoint("order", mType)}/${order.id}`,
              method: "DELETE",
              silent: true,
            })
          )
        );
      }

      // Update local state on success
      setOrders((prev) =>
        prev.map((o) =>
          o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
            ? { ...o, status: "CANCELLED" as const }
            : o
        )
      );

      // Dispatch event to notify other components — and ourselves. Our own
      // listener confirms against the server rather than trusting the optimistic
      // update above: the local rewrite keeps the panel responsive, the
      // reconcile is what makes it TRUE, so an order the backend could not
      // cancel comes back into the list instead of vanishing from it.
      window.dispatchEvent(new CustomEvent("tp-order-updated"));
    } catch (err) {
      console.error("Failed to cancel all orders:", err);
    } finally {
      cancelAllInFlightRef.current = false;
    }
    // As with handleModify: the list is read through `ordersRef` at call time,
    // so this is not a dependency and the button's identity is stable.
  }, [getApiEndpoint]);

  // Fetch AI investments - uses module-level cache to prevent duplicate fetches
  const fetchAiInvestments = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setAiInvestments([]);
      return;
    }

    const now = Date.now();

    // Prevent duplicate fetches - check module-level cache unless forced
    if (!force && (aiInvestmentsCache.fetchInProgress || now - aiInvestmentsCache.lastFetchTime < FETCH_COOLDOWN_MS)) {
      // If we have cached data, use it
      if (aiInvestmentsCache.data) {
        setAiInvestments(aiInvestmentsCache.data);
        setIsLoadingAiInvestments(false);
      }
      return;
    }

    aiInvestmentsCache.fetchInProgress = true;
    aiInvestmentsCache.lastFetchTime = now;
    setIsLoadingAiInvestments(true);

    try {
      const { data, error } = await $fetch<any>({
        url: "/api/ai/investment/log",
        method: "GET",
        silent: true,
      });

      if (!error && data) {
        // The handler returns `{ items, pagination }`. This read `data.data`,
        // a key that does not exist, so the AI Investments tab was permanently
        // empty regardless of how many investments the user held.
        const investments = Array.isArray(data)
          ? data
          : data.items || data.data || [];
        aiInvestmentsCache.data = investments;
        setAiInvestments(investments);
      }
    } catch (err) {
      console.error("Failed to fetch AI investments:", err);
    } finally {
      aiInvestmentsCache.fetchInProgress = false;
      setIsLoadingAiInvestments(false);
    }
  }, [isAuthenticated]);

  // Cancel AI investment
  const handleCancelAiInvestment = useCallback(async (investmentId: string) => {
    try {
      const { error } = await $fetch({
        url: `/api/ai/investment/log/${investmentId}`,
        method: "DELETE",
        silent: true,
      });

      if (!error) {
        // Force refresh AI investments
        fetchAiInvestments(true);
      } else {
        console.error("Failed to cancel AI investment:", error);
      }
    } catch (err) {
      console.error("Failed to cancel AI investment:", err);
    }
  }, [fetchAiInvestments]);

  // Fetch AI investments when tab is selected (only if extension is enabled)
  useEffect(() => {
    if (isAiInvestmentEnabled && activeTab === "ai") {
      fetchAiInvestments();
    }
  }, [activeTab, fetchAiInvestments, isAiInvestmentEnabled]);

  // Listen for AI investment creation events
  useEffect(() => {
    const handleAiInvestmentCreated = () => {
      // Force refresh AI investments when a new one is created
      if (isAiInvestmentEnabled) {
        fetchAiInvestments(true);
      }
    };

    window.addEventListener("tp-ai-investment-created", handleAiInvestmentCreated);

    return () => {
      window.removeEventListener("tp-ai-investment-created", handleAiInvestmentCreated);
    };
  }, [fetchAiInvestments, isAiInvestmentEnabled]);

  return (
    <div className={cn("tp-orders-panel flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Compact header: Symbol + Side filter + Tabs + Actions */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--tp-border)]">
        {/* Symbol indicator */}
        <span className="text-[10px] font-medium text-[var(--tp-text-secondary)] bg-[var(--tp-bg-tertiary)] px-1.5 py-0.5 rounded">
          {symbol}
        </span>

        {/* Side filter dropdown */}
        <select
          value={filters.side}
          onChange={(e) => setFilters((prev) => ({ ...prev, side: e.target.value }))}
          className={cn(
            "px-1.5 py-0.5",
            "text-[10px]",
            "bg-[var(--tp-bg-tertiary)]",
            "border border-[var(--tp-border)]",
            "rounded",
            "text-[var(--tp-text-secondary)]",
            "outline-none focus:border-[var(--tp-blue)]",
            "cursor-pointer"
          )}
        >
          <option value="">All</option>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 flex-1">
          <TabButton
            active={activeTab === "open"}
            onClick={() => setActiveTab("open")}
            count={openOrders.length}
          >
            Open
          </TabButton>
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            History
          </TabButton>
          <TabButton
            active={activeTab === "trades"}
            onClick={() => setActiveTab("trades")}
            count={filteredTrades.length}
          >
            Trades
          </TabButton>
          {isAlgoEnabled && (
            <TabButton
              active={activeTab === "bots"}
              onClick={() => setActiveTab("bots")}
            >
              <span className="flex items-center gap-0.5">
                <Bot className="h-2.5 w-2.5" />
                Bots
              </span>
            </TabButton>
          )}
          {isAiInvestmentEnabled && (
            <TabButton
              active={activeTab === "ai"}
              onClick={() => setActiveTab("ai")}
              count={aiInvestments.filter((i) => i.status === "ACTIVE").length}
            >
              <span className="flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            </TabButton>
          )}
        </div>

        {/* Cancel All — shown for ALL open orders, not just the filtered view, and
            carrying the count so its scope is visible. See allOpenOrdersCount.

            ...AND shown when the list could not be read at all. This is the only
            bulk exit the product offers, its endpoint is account-wide and reads
            the ledger rather than this list, so gating it purely on the list's
            own contents put it out of reach in precisely the case it exists for:
            an order the panel cannot see. The count is dropped in that state
            because there is no honest number to print. */}
        {(allOpenOrdersCount > 0 || openListFailed) && (
          <button
            onClick={handleCancelAll}
            className="text-[10px] text-[var(--tp-red)] hover:text-[var(--tp-red)]/80 px-1.5 py-0.5 rounded hover:bg-[var(--tp-red)]/10"
          >
            {tTrade("cancel_all")}
            {allOpenOrdersCount > 0 ? ` (${allOpenOrdersCount})` : ""}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "open" && (
          <OpenOrdersTab
            orders={openOrders}
            isLoading={isLoading}
            loadFailed={openListFailed}
            onCancel={handleCancel}
            onModify={handleModify}
            showSymbol={!filters.hideOther}
            pricePrecision={metadata?.precision?.price}
            amountPrecision={metadata?.precision?.amount}
          />
        )}
        {activeTab === "history" && (
          <OrderHistoryTab
            orders={orderHistory}
            isLoading={isLoading}
            pricePrecision={metadata?.precision?.price}
            amountPrecision={metadata?.precision?.amount}
          />
        )}
        {activeTab === "trades" && (
          <TradeHistoryTab
            trades={filteredTrades}
            isLoading={isLoading}
            pricePrecision={metadata?.precision?.price}
            amountPrecision={metadata?.precision?.amount}
          />
        )}
        {isAlgoEnabled && activeTab === "bots" && (
          <AlgoBotsTab symbol={symbol} />
        )}
        {isAiInvestmentEnabled && activeTab === "ai" && (
          <AiInvestmentsTab
            investments={aiInvestments}
            isLoading={isLoadingAiInvestments}
            onCancel={handleCancelAiInvestment}
          />
        )}
      </div>
    </div>
  );
});

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}

function TabButton({ active, onClick, children, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-1.5 py-0.5",
        "text-[10px] font-medium",
        "rounded",
        "transition-colors",
        "inline-flex items-center gap-1",
        active
          ? "text-[var(--tp-text-primary)] bg-[var(--tp-bg-elevated)]"
          : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="px-1 text-[9px] bg-[var(--tp-blue)]/20 text-[var(--tp-blue)] rounded">
          {count}
        </span>
      )}
    </button>
  );
}

// AI Investments Tab Component
interface AiInvestmentsTabProps {
  investments: AiInvestment[];
  isLoading: boolean;
  onCancel: (id: string) => void;
}

function AiInvestmentsTab({ investments, isLoading, onCancel }: AiInvestmentsTabProps) {
  const t = useTranslations("trade_pro");
  // Format date helper
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString();
  };

  /**
   * The 20px spinner that used to stand in for this whole tab is gone.
   * ==========================================================================
   *
   * It returned a centred `animate-spin` div and nothing else, so the table's
   * six column headers — Plan, Amount, Profit, Status, Time, Action, all
   * literals — and its sticky header band did not exist until the fetch
   * landed, then appeared and pushed the first row down by 25px. Inside a
   * docked tab that is a shift with nothing above it to absorb the change.
   *
   * `investments.length === 0` keeps its own branch below and is now reached
   * only when the fetch is done, so "No AI Investments" is a statement about
   * the account rather than about the network.
   */
  if (!isLoading && investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-[var(--tp-text-muted)]">
        <Sparkles className="h-8 w-8 mb-2 opacity-30" />
        <p className="text-[11px] font-medium">{t("no_ai_investments")}</p>
        <p className="text-[10px] opacity-70">{t("your_ai_investments_will_appear_here")}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[10px]">
        <thead className="sticky top-0 bg-[var(--tp-bg-secondary)]">
          <tr className="border-b border-[var(--tp-border)]">
            <th className="text-left p-1.5 font-medium text-[var(--tp-text-muted)]">Plan</th>
            <th className="text-right p-1.5 font-medium text-[var(--tp-text-muted)]">Amount</th>
            <th className="text-right p-1.5 font-medium text-[var(--tp-text-muted)]">Profit</th>
            <th className="text-center p-1.5 font-medium text-[var(--tp-text-muted)]">Status</th>
            <th className="text-right p-1.5 font-medium text-[var(--tp-text-muted)]">Time</th>
            <th className="text-center p-1.5 font-medium text-[var(--tp-text-muted)]">Action</th>
          </tr>
        </thead>
        <tbody>
          {/* Three pending rows in the REAL table, so the column widths the
              browser computes while waiting are the ones it keeps. Amount and
              Profit are money and get placeholders rather than a `?? 0`
              fallback — a confident `0.0000` next to a green/red tint is a
              claim about the account. */}
          {isLoading &&
            [0, 1, 2].map((i) => (
              <tr
                key={`pending-ai-${i}`}
                className="border-b border-[var(--tp-border)]/50"
              >
                <td className="p-1.5">
                  <span className="text-[var(--tp-text-primary)] font-medium">
                    <SkeletonText placeholder={t("ai_plan")} />
                  </span>
                </td>
                <td className="p-1.5 text-right font-mono text-[var(--tp-text-secondary)]">
                  <SkeletonText placeholder="0.0000" />
                </td>
                <td className="p-1.5 text-right font-mono text-[var(--tp-text-muted)]">
                  <SkeletonText placeholder="0.0000" />
                </td>
                <td className="p-1.5 text-center">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--tp-text-muted)]/20 text-[var(--tp-text-muted)]">
                    <SkeletonText placeholder="ACTIVE" />
                  </span>
                </td>
                <td className="p-1.5 text-right text-[var(--tp-text-muted)]">
                  <SkeletonText placeholder="00m ago" />
                </td>
                <td className="p-1.5 text-center" />
              </tr>
            ))}
          {investments.map((investment) => (
            <tr
              key={investment.id}
              className="border-b border-[var(--tp-border)]/50 hover:bg-[var(--tp-bg-elevated)]/50 transition-colors"
            >
              <td className="p-1.5">
                <span className="text-[var(--tp-text-primary)] font-medium">
                  {investment.plan?.title || t("ai_plan")}
                </span>
              </td>
              <td className="p-1.5 text-right font-mono text-[var(--tp-text-secondary)]">
                {(investment.amount ?? 0).toFixed(4)}
              </td>
              <td className="p-1.5 text-right font-mono">
                {investment.status === "ACTIVE" ? (
                  <span className="text-[var(--tp-text-muted)]">-</span>
                ) : (
                  <span
                    className={cn(
                      investment.result === "WIN"
                        ? "text-[var(--tp-green)]"
                        : investment.result === "LOSS"
                          ? "text-[var(--tp-red)]"
                          : "text-[var(--tp-text-secondary)]"
                    )}
                  >
                    {investment.result === "WIN" ? "+" : investment.result === "LOSS" ? "-" : ""}
                    {(investment.profit ?? 0).toFixed(4)}
                  </span>
                )}
              </td>
              <td className="p-1.5 text-center">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium",
                    investment.status === "ACTIVE" &&
                      "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]",
                    investment.status === "COMPLETED" && investment.result === "WIN" &&
                      "bg-[var(--tp-green)]/20 text-[var(--tp-green)]",
                    investment.status === "COMPLETED" && investment.result === "LOSS" &&
                      "bg-[var(--tp-red)]/20 text-[var(--tp-red)]",
                    investment.status === "COMPLETED" && investment.result === "DRAW" &&
                      "bg-[var(--tp-yellow)]/20 text-[var(--tp-yellow)]",
                    investment.status === "CANCELLED" &&
                      "bg-[var(--tp-text-muted)]/20 text-[var(--tp-text-muted)]"
                  )}
                >
                  {investment.status === "COMPLETED" ? investment.result : investment.status}
                </span>
              </td>
              <td className="p-1.5 text-right text-[var(--tp-text-muted)]">
                {formatDate(investment.createdAt)}
              </td>
              <td className="p-1.5 text-center">
                {investment.status === "ACTIVE" && (
                  <button
                    onClick={() => onCancel(investment.id)}
                    className="p-1 rounded hover:bg-[var(--tp-red)]/10 text-[var(--tp-text-muted)] hover:text-[var(--tp-red)] transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrdersPanel;
