"use client";

/**
 * WHO — the operator who owns the synthetic markets. Every price on these pairs
 *       is produced by this addon, and the pool behind each one is the
 *       platform's own capital, so a market that misbehaves is the platform's
 *       loss and a market that goes silent is the platform's dead orderbook.
 * WHAT — decides whether each ACTIVE market is actually making a market right
 *       now: is it quoting at all, is its price still inside the range the
 *       operator configured, and how far has its pool inventory been pushed to
 *       one side.
 * CLICK — through a market to fix the specific gate that is closed (fund the
 *       pool, activate bots, widen the range, raise the daily budget), or the
 *       emergency stop to halt every market at once.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED
 *
 * A `HeroSection` with two gradient orbs and six floating particles, over four
 * counters, then a three-bar Progress readout of ACTIVE/PAUSED/STOPPED, a grid
 * of market cards with a hover lift, and a five-tile "Quick Actions" panel whose
 * entries were New Market, All Markets, Analytics, Settings and Guide — the
 * addon's entire nav, repeated as buttons directly under the nav that already
 * lists them. Nine `motion` blocks with staggered `delay`, so the page rebuilt
 * itself section by section on every 30-second poll.
 *
 * WHAT WAS DEAD
 *
 *  - The **System Alerts** card read `data.alerts`. The overview endpoint has
 *    never returned an `alerts` key, so that card could not render, ever. It is
 *    gone rather than wired up: there is no alerts source to wire it to.
 *  - `handleEmergencyStop` used `window.confirm` and `window.alert`. R6 requires
 *    a confirmation naming the object and the count, a required reason, a POST
 *    of that reason, and a toast — and the endpoint has ALWAYS accepted a
 *    `reason` in its body, which nothing was sending. The history rows this
 *    writes for every market therefore all read the handler's fallback string.
 *
 * DECISIONS THAT ARE DECISIONS, NOT TASTE
 *
 *  - **"Quoting" is the engine's own definition, not a status column.**
 *    `MarketInstance.passesTradeGates()` refuses to trade a market with fewer
 *    than two ACTIVE bots, with real liquidity enabled but an unfunded pool, or
 *    with its daily volume budget spent. A market failing any of those still
 *    carries status ACTIVE and still rendered a green badge on the old page. The
 *    masthead meter and the State column now report the gate, not the badge.
 *    The fourth gate — the volatility guard — is NOT reported, because it is
 *    evaluated from in-process price history no query can reach, and asserting
 *    a market passes a gate we cannot see is the failure this rework exists to
 *    remove.
 *  - **The band is read in LOG space.** `PriceProcess.leashDrift()` engages in
 *    the outer 20% of `[priceRangeLow, priceRangeHigh]` measured in logs, and it
 *    is the point at which the next price move becomes progressively
 *    predictable — an exploitable edge, not a cosmetic threshold. So "at the
 *    edge" is its own state, reported before price actually leaves the range,
 *    while the operator can still fix it by widening the range.
 *  - **Inventory skew values both sides at the CURRENT price.** The question is
 *    "has the pool been pushed to one side of the book", not "did the pool make
 *    money" — that is P&L and it is reported separately. Valuing the funded mix
 *    at the funding price would fold the market's own price move into the
 *    figure and make a pool that never traded look skewed.
 *  - **No currency symbol unless the whole addon agrees on one.** TVL, P&L and
 *    volume are plain sums over each pool's own quote asset. The old page
 *    printed `$` in front of that sum unconditionally. The backend now sends
 *    `quoteCurrency: null` the moment two markets quote in different assets, and
 *    the unit disappears with it.
 *
 *    THAT RULE ONLY EVER FIXED THE LABEL. The numbers were still being ADDED
 *    across denominations — 0.5 BTC and 12,000 NGN summed to "12000.5", and
 *    dropping the "$" merely declined to say what it was 12000.5 OF. The
 *    endpoint now prices each denomination into USD before it sums, so the
 *    portfolio TILES are USD and carry the "$". `quoteCurrency` survives for the
 *    per-market TABLE, whose pool figures are still native to each market — and
 *    anything with no USD rate is named in `unpriced`, which puts a "lower
 *    bound" note in the masthead rather than being folded in as zero.
 *  - **"Today", not "24h".** `currentDailyVolume` is a counter zeroed at the
 *    daily reset, not a rolling window, so a poll at 00:05 legitimately reports
 *    almost nothing. It is labelled for what it is, and shown against the
 *    budget that will silence the market when it runs out.
 *  - **A table, not a card grid.** R4 makes the table the default; the card grid
 *    it replaces had a token icon as its "visual primary", which reads perfectly
 *    at row height. Not a `DataTable` either: this is an already-ranked
 *    aggregate with no row model to page, filter or sort server-side, and it
 *    links INTO `/market`, which is the table that does own these rows.
 *  - **One entrance animation.** `StatsCard` staggers itself off `index`.
 *    Nothing else on this page animates in.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  ChevronRight,
  Coins,
  Gauge,
  OctagonAlert,
  Plus,
  RefreshCw,
  Store,
  TrendingUp,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatMoney, isIntlCurrencyCode } from "@/utils/currency";
import { MoneyFigure } from "@/components/ui/money-figure";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loadable, Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { moneyFormat } from "./components/format";

// ---------------------------------------------------------------------------
// Payload — `GET /api/admin/ai/market-maker/analytics/overview`
//
// Every field below is a TOTAL. `totalMarkets`, `totalBots`, the `quoting`
// partition, the `blockers` census and the money sums all cover every row —
// they are computed over the whole set on the server, whatever the wire carries.
// `recentTradeCount` is a server-side `COUNT` over the history table, not a
// length.
//
// `markets` IS THE ONE EXCEPTION AND IT IS CAPPED ON THE SERVER, at
// `marketsCap`. It used to arrive complete, which is why this page could get
// away with deriving the blocker breakdown from it; that derivation is gone,
// because a breakdown computed over ten rows underneath a headline counted over
// forty is a subtraction the reader performs and gets wrong. The row count the
// table declares is `markets.length` of `totalMarkets`, never of `markets`.
// ---------------------------------------------------------------------------

/** Where a market's price sits inside its configured range. See the docblock. */
type BandState = "in" | "edge" | "out" | "unknown";

/** The engine's database-derived trade gates, in the order they are checked. */
type Blocker = "bots" | "pool" | "budget";

interface MarketRow {
  id: string;
  status: string;
  targetPrice: number;
  lastKnownPrice: number | null;
  priceRangeLow: number;
  priceRangeHigh: number;
  band: BandState;
  /** -1 at the range floor, 0 at its geometric centre, +1 at its ceiling. */
  bandPosition: number | null;
  quoting: boolean;
  blockers: Blocker[];
  inventory: {
    baseShare: number;
    fundedBaseShare: number;
    /** Percentage POINTS of base share gained or lost against the funded mix. */
    skew: number;
  } | null;
  currentDailyVolume: number;
  maxDailyVolume: number;
  realLiquidityPercent: number;
  activeBots: number;
  totalBots: number;
  lastTradeAt: string | null;
  updatedAt: string | null;
  pool: {
    totalValueLocked: number;
    realizedPnL: number;
    unrealizedPnL: number;
    baseCurrencyBalance: number;
    quoteCurrencyBalance: number;
  } | null;
  market: {
    id: string;
    symbol: string;
    currency: string;
    pair: string;
  } | null;
}

interface OverviewData {
  totalMarkets: number;
  activeMarkets: number;
  totalBots: number;
  activeBots: number;
  /** The unit of every money total below. Always "USD". */
  currency?: string;
  /**
   * Denominations the addon holds that have no USD rate, plus `"UNKNOWN"` for a
   * market whose ecosystem row has been deleted. While this is non-empty every
   * total is a LOWER BOUND — the amounts are omitted, never counted as zero —
   * and the masthead says so.
   */
  unpriced?: string[];
  totalTVL: number;
  /**
   * DELIBERATELY NOT RENDERED. It sums `currentDailyVolume` over ACTIVE markets
   * only, so pausing a market mid-day silently removes the volume it already
   * traded from the total. It stays on the wire because `analytics/page.tsx`
   * still reads it; this page uses `volumeToday`, which covers every market.
   */
  total24hVolume: number;
  volumeToday: number;
  volumeBudgetToday: number;
  totalPnL: number;
  /** Null when there is no pool capital to measure against — NOT 0, which would claim "flat". */
  pnlPercent: number | null;
  recentTradeCount: number;
  /**
   * The one quote asset every market shares, or null when they disagree.
   *
   * It describes the per-market rows in `markets[]` and nothing else: their pool
   * figures are still native to each market. The totals above are USD.
   */
  quoteCurrency: string | null;
  marketsByStatus: {
    active: number;
    paused: number;
    stopped: number;
  };
  /** ACTIVE markets partitioned by quoting state. The five counts sum to `active`. */
  quoting: {
    active: number;
    inBand: number;
    atEdge: number;
    outsideBand: number;
    unpriced: number;
    notQuoting: number;
  };
  /**
   * Why the silent markets are silent, counted over EVERY market by the server.
   *
   * These do NOT sum to `quoting.notQuoting`: one market can fail several gates
   * at once, which is why the breakdown is read as a list of remedies and never
   * as a partition.
   */
  blockers?: {
    bots: number;
    pool: number;
    budget: number;
  };
  lastUpdated: string;
  /** Ranked worst-first and CAPPED at `marketsCap`. Not the population — that is `totalMarkets`. */
  markets?: MarketRow[];
  marketsCap?: number;
  /**
   * Engine status for the process that served this request.
   *
   * `leaderArbitratedBy: "none"` means neither Redis nor the database lease row
   * could be reached, so nothing is stopping a second backend process from also
   * believing it leads — which advances the price twice and races two writers
   * onto the 1-minute candle binary options settle on.
   */
  engine?: {
    status?: string;
    isLeader?: boolean;
    instanceId?: string;
    leaderArbitratedBy?: "redis" | "database" | "none";
    activeMarkets?: number;
    errorCount?: number;
  } | null;
}

const REFRESH_MS = 30_000;

/*
 * THE ROW CAP IS THE SERVER'S NOW.
 *
 * This file used to hold `TABLE_ROWS = 10` and slice the list itself, which was
 * a cap on what was DRAWN over a payload that carried every market maker on the
 * platform — twenty-odd scalars, a pool and a market each, on a thirty-second
 * poll, so a browser could render ten of them. The endpoint caps the ranked list
 * and declares `marketsCap` beside `totalMarkets`; the table draws what it is
 * sent and states the count against the population, not against the page.
 */

/**
 * The quoting meter's fills, keyed by the segment id.
 *
 * `notQuoting` is `destructive` and `outsideBand` is `warning`, and that order
 * is deliberate: a market that has stopped quoting is producing nothing at all,
 * while one outside its range is still making a market — badly. Both also carry
 * a word in the legend, because `warning` and `destructive` are not separable
 * for every reader and neither is a shape a meter can convey on its own.
 *
 * `unpriced` gets a muted fill rather than a status token because it is not a
 * verdict: it is the absence of one. The engine persists `lastKnownPrice` on a
 * 120-second throttle, so a market that has only just started has genuinely not
 * told us where it is yet.
 */
const QUOTE_SEGMENT_FILL: Record<string, string> = {
  inBand: "bg-success",
  atEdge: "bg-info",
  outsideBand: "bg-warning",
  unpriced: "bg-muted-foreground/40",
  notQuoting: "bg-destructive",
};

/** Segment order, worst last so the eye lands on the problem end of the bar. */
const QUOTE_SEGMENT_ORDER = [
  "inBand",
  "atEdge",
  "unpriced",
  "outsideBand",
  "notQuoting",
] as const;

type QuoteSegmentId = (typeof QUOTE_SEGMENT_ORDER)[number];

/**
 * The narrowest a non-empty meter segment may be drawn, in percent.
 *
 * Below this a band rounds away to nothing, and the bands most likely to be tiny
 * are `outsideBand` and `notQuoting` — the only two whose disappearance would be
 * a lie.
 */
const MIN_SEGMENT_PCT = 3;

/**
 * The ticker beside a 24px figure, set down to body size.
 *
 * A four-letter quote code at the figure's own weight reads as part of the
 * number — "1.2M USDT" comes out looking like a seven-character amount.
 */
const UNIT_CLASS = "text-base font-normal text-muted-foreground";

/**
 * Where the containment leash starts, as a share of the drawn track.
 *
 * `bandPosition` runs -1..+1 across the range, so the soft edge at |0.8| lands
 * 10% in from each end. Restated as a width rather than derived, because the
 * backend constant it mirrors (`BAND_SOFT_EDGE`) is not on the wire.
 */
const BAND_EDGE_ZONE_PCT = 10;

export const DashboardClient: React.FC = () => {
  /* Dashed, not `ext_admin_ai_market_maker`. The namespace mirrors the route
     folder (`ai/market-maker`) with `/` -> `_`, so the dash in the folder name
     survives — every sibling follows it, `ext_admin_ai_binary-engine` and
     `ext_admin_copy-trading` included, and the dashed namespace already exists
     in en.json. Underscoring it silently forks the addon's translations into a
     second namespace that the translation manager then propagates separately. */
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * `true` means "it failed and said nothing useful".
   *
   * Not a hardcoded English fallback string: `fetchOverview` is a `useCallback`
   * with empty deps — that is what stops the 30-second interval being torn down
   * and rebuilt on every render — so it cannot close over `t`. Storing the
   * SHAPE of the failure and translating it at render keeps both properties.
   */
  const [error, setError] = useState<string | true | null>(null);

  const [stopOpen, setStopOpen] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [stopping, setStopping] = useState(false);

  const fetchOverview = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    const { data: payload, error: failure } = await $fetch({
      url: "/api/admin/ai/market-maker/analytics/overview",
      silent: true,
    });

    /* `$fetch` resolves an envelope and never throws, so the try/catch the
       previous version wrapped this in could not fire. Surface the failure here
       instead of falling through to an empty dashboard. */
    if (failure) {
      setError(typeof failure === "string" ? failure : true);
    } else if (payload) {
      setData(payload as OverviewData);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    /* Polling a hidden tab scans the market and bot tables for nobody. Every
       operator leaves this page open in a background tab; the previous version
       kept a 30-second full-table poll running in each one for as long as the
       browser lived. */
    const tick = () => {
      if (document.visibilityState === "visible") fetchOverview(true);
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const quote = data?.quoteCurrency ?? null;

  // -------------------------------------------------------------------------
  // Formatting. TWO scales, because there are two kinds of figure on this page.
  //
  // Every figure is denominated in its own market's QUOTE asset, so a unit is
  // only printed when the whole addon agrees on one — the backend sends
  // `quoteCurrency` as null the moment two different quotes exist, because
  // adding a BTC-quoted TVL to a USDT-quoted one and printing a "$" on the
  // result is a lie with two decimal places on it.
  //
  // These six helpers used to be declared here. They moved to
  // `components/format.ts` when the analytics page turned out to be printing
  // that same "$" over the same sums — one rule, one implementation, two pages.
  //
  // WHAT THE `quoteCurrency` RULE NEVER FIXED was the addition itself: the sum
  // still ran across denominations and the rule only suppressed the label. The
  // endpoint now prices each denomination before it adds, so the four PORTFOLIO
  // tiles are USD and say so, while the per-market TABLE stays in each market's
  // own asset — the number an operator reconciles against the pool page. Hence
  // two formatters: `usdMoney`/`usdSignedMoney` for totals, the rest for rows.
  // -------------------------------------------------------------------------

  const { amount, signed, price, quoteSuffix } = moneyFormat(quote);
  const { money: usdMoney, signedMoney: usdSignedMoney } = moneyFormat(
    data?.currency ?? "USD"
  );

  /**
   * The totals are a LOWER BOUND, and this is the list of holes in them.
   *
   * A denomination with no USD rate is omitted from every total rather than
   * counted as zero, which is the only honest choice but an invisible one — so
   * it is named. `"UNKNOWN"` in here is a market whose ecosystem row was
   * deleted: its pool still holds a balance that nothing can say the unit of.
   */
  const unpriced = data?.unpriced ?? [];

  /**
   * Row counts, pinned to one locale like every other number on this page.
   *
   * A bare `toLocaleString()` takes the grouping separator from the RUNTIME
   * default — Node's ICU on the server, the viewer's locale in the browser — so
   * the same figure is "50,000" on one and "50.000" on the other. That is a
   * hydration mismatch, and the old market card shipped one (`toLocaleString()`
   * on TVL, `toLocaleDateString()` on the update stamp).
   */
  const count = useCallback(
    (value: number) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
    []
  );

  /**
   * The "last updated" clock, in the VIEWER's zone.
   *
   * The zone is genuinely right here — an operator wants the time on their own
   * wall — so it is the LOCALE that gets pinned, and the value never reaches the
   * server pass because `lastUpdated` only exists after a client fetch.
   */
  const clock = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(new Date(iso)),
    []
  );

  /**
   * The last-print stamp, with its DATE.
   *
   * A bare time would read as "a few minutes ago" for a market whose last trade
   * was in March, which is the exact misreading this column exists to prevent.
   * No age threshold is applied and none is implied: bot cadence is configurable
   * per market, so "stale" is not a judgement this page is entitled to make.
   */
  const stamp = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso)),
    []
  );

  const quoting = data?.quoting;

  /**
   * The masthead meter: of the markets whose status says ACTIVE, how many are
   * actually making a market, and where their prices sit.
   *
   * THREE STATES, NOT TWO. "No market is active" and "we have not been told yet"
   * are different claims, and the difference has to be visible: without the
   * `pending` case the masthead asserts "No active market" for the whole of the
   * first load, on a console whose entire job is to be believed. It is a named
   * state rather than a `!loading &&` gate because the layout-stability scanner
   * counts the latter as content withheld while loading.
   *
   * The floor-and-borrow is not cosmetic. One silent market out of forty rounds
   * to a sub-pixel segment and disappears — the one segment that must never
   * disappear. It is widened to a visible minimum and the difference is taken
   * back from the WIDEST segment, so the widths still sum to 100.
   */
  const quoteMeter = useMemo(() => {
    const counts = quoting;
    const active = counts?.active ?? 0;

    const state: "pending" | "empty" | "ready" = !data
      ? "pending"
      : active > 0
        ? "ready"
        : "empty";

    if (state !== "ready" || !counts) {
      /* The segment shells still render, so the legend holds its shape and its
         width across all three states and nothing below it moves. */
      return {
        state,
        active,
        segments: QUOTE_SEGMENT_ORDER.map((id) => ({
          id,
          value: 0,
          width: 0,
        })),
      };
    }

    const segments = QUOTE_SEGMENT_ORDER.map((id) => {
      const value = counts[id] ?? 0;
      return { id, value, width: (value / active) * 100 };
    });

    let borrowed = 0;
    for (const segment of segments) {
      if (segment.width > 0 && segment.width < MIN_SEGMENT_PCT) {
        borrowed += MIN_SEGMENT_PCT - segment.width;
        segment.width = MIN_SEGMENT_PCT;
      }
    }
    if (borrowed > 0) {
      const widest = segments.reduce(
        (largest, segment) => (segment.width > largest.width ? segment : largest),
        segments[0]
      );
      widest.width = Math.max(MIN_SEGMENT_PCT, widest.width - borrowed);
    }

    return { state: "ready" as const, active, segments };
  }, [data, quoting]);

  const segmentLabel = useCallback(
    (id: QuoteSegmentId) => {
      if (id === "inBand") return tExtAdmin("in_range");
      if (id === "atEdge") return t("at_range_edge");
      if (id === "outsideBand") return t("outside_range");
      if (id === "unpriced") return t("no_price_yet");
      return t("not_quoting");
    },
    [t]
  );

  const blockerLabel = useCallback(
    (blocker: Blocker) => {
      if (blocker === "bots") return t("needs_two_active_bots");
      if (blocker === "pool") return t("pool_unfunded");
      return t("daily_budget_spent");
    },
    [t]
  );

  const bandLabel = useCallback(
    (band: BandState) => {
      if (band === "out") return t("outside_range");
      if (band === "edge") return t("at_range_edge");
      if (band === "unknown") return t("no_price_yet");
      return tExtAdmin("in_range");
    },
    [t]
  );

  /**
   * What the live dot is allowed to claim.
   *
   * A green pulse beside a clock that stopped advancing is a lie, and it is the
   * easy one to ship: `error` is set while `data` stays on screen, so without
   * this the dot would still read "Live" directly above the refresh-failed
   * notice.
   */
  const feedState: "live" | "updating" | "stale" = error
    ? "stale"
    : refreshing
      ? "updating"
      : "live";

  const engine = data?.engine ?? null;

  /* Only worth telling an operator about when the engine is actually running:
     a stopped engine that nothing arbitrates is not driving anything. */
  const engineUnarbitrated =
    engine?.status === "RUNNING" && engine?.leaderArbitratedBy === "none";

  /**
   * The engine on THIS process is driving fewer markets than the database says
   * are ACTIVE.
   *
   * `MarketManager` loads exactly the ACTIVE rows, so on a healthy leader the
   * two numbers agree and a shortfall means markets failed to initialise. Gated
   * on `isLeader` because a follower process legitimately drives nothing, and
   * the API request can land on either one — comparing without that check would
   * fire this on every multi-process install.
   */
  const engineShortfall =
    engine?.status === "RUNNING" &&
    engine?.isLeader === true &&
    typeof engine?.activeMarkets === "number" &&
    (data?.activeMarkets ?? 0) > engine.activeMarkets
      ? { driving: engine.activeMarkets, active: data?.activeMarkets ?? 0 }
      : null;

  const silentMarkets = quoting?.notQuoting ?? 0;

  /**
   * Why the silent markets are silent, as a count per closed gate.
   *
   * SERVED, NOT DERIVED. This was a loop over `data.markets`, which was correct
   * only for as long as that array carried every market maker on the platform.
   * It no longer does — the ranked list is capped on the server — and a
   * breakdown counted over ten rows sitting under a headline counted over forty
   * invites the reader to subtract, and to be wrong. The endpoint counts the
   * same population the headline does.
   */
  const blockerCounts: Record<Blocker, number> = data?.blockers ?? {
    bots: 0,
    pool: 0,
    budget: 0,
  };

  /**
   * Volume spent against volume budgeted.
   *
   * Both sides are now USD, which is what makes the ratio mean anything at all:
   * before, it divided a sum of BASE-asset quantities by another sum of
   * BASE-asset quantities across markets that do not share a base, so a platform
   * running MO and BTC was dividing apples by (apples + oranges). Still null and
   * never 0 when there is no budget to divide by. While `unpriced` is non-empty
   * both sides are lower bounds, which is the state the masthead declares once
   * for the whole page rather than five times per figure.
   */
  const budgetUsedPct =
    data && data.volumeBudgetToday > 0
      ? Math.min(100, (data.volumeToday / data.volumeBudgetToday) * 100)
      : null;

  /**
   * What an emergency stop would actually halt.
   *
   * `emergency/stop.post.ts` selects `status != STOPPED` — ACTIVE **and**
   * PAUSED — and writes an EMERGENCY_STOP history row for each. The
   * confirmation names that population, not the ACTIVE subset.
   */
  const stoppableMarkets =
    (data?.marketsByStatus?.active ?? 0) + (data?.marketsByStatus?.paused ?? 0);

  /* Already ranked worst-first AND already capped by the endpoint — no slice
     here, or the page would be applying a second, undeclared cap on top of a
     declared one. */
  const rows = data?.markets ?? [];

  /**
   * Where the "Active bots" counter drills to.
   *
   * There is no bot registry to link at: bots are created and started per
   * market, on `/market/[id]?tab=bots`, and nothing in this addon lists them
   * across markets. So the tile leads to the market whose bots are the actual
   * problem — `markets` arrives ranked worst-first, so the first row carrying
   * the `bots` gate is the one an operator would open — and falls back to the
   * market registry when no market is short of bots, which is also the state
   * during the first load.
   *
   * `blockers` is optional-chained rather than indexed: a backend that predates
   * the field omits it, and a tile's destination must not be able to take the
   * page down.
   *
   * It searches the CAPPED list, and that is a deliberate downgrade rather than
   * an oversight. A bots-blocked market is never quoting, and a market that is
   * not quoting sorts to severity 0 — the very top — so it is only invisible
   * here when more than a full page of markets are silent for other reasons, and
   * in that state the registry the fallback opens is the better destination
   * anyway. `blockers.bots` still counts the whole platform, so the alert above
   * cannot disagree with itself.
   */
  const botsHref = useMemo(() => {
    const blocked = (data?.markets ?? []).find((row) =>
      row.blockers?.includes("bots")
    );
    return blocked
      ? `/admin/ai/market-maker/market/${blocked.id}?tab=bots`
      : "/admin/ai/market-maker/market";
  }, [data?.markets]);

  const fatal = Boolean(error && !data);
  const errorText = error === true ? t("could_not_read_the_overview") : error;

  // -------------------------------------------------------------------------
  // Emergency stop — R6: confirm naming the count, a required reason, a POST of
  // that reason, and a toast either way.
  //
  // The endpoint has always accepted `reason` and has always written it onto an
  // EMERGENCY_STOP history row for every market it halts. Nothing was sending
  // one, so every one of those rows recorded the handler's fallback string
  // instead of the operator's actual justification.
  // -------------------------------------------------------------------------

  const confirmEmergencyStop = useCallback(async () => {
    const reason = stopReason.trim();
    if (!reason) return;
    setStopping(true);
    const { data: result, error: failure } = await $fetch({
      url: "/api/admin/ai/market-maker/emergency/stop",
      method: "POST",
      body: { reason, cancelOpenOrders: true },
      silent: true,
    });
    setStopping(false);

    if (failure) {
      toast.error(
        typeof failure === "string" ? failure : t("emergency_stop_failed")
      );
      return;
    }

    setStopOpen(false);
    setStopReason("");
    toast.success(
      t("emergency_stop_executed", {
        markets: (result as any)?.marketsStopped ?? 0,
        bots: (result as any)?.botsStopped ?? 0,
      })
    );
    fetchOverview(true);
  }, [fetchOverview, stopReason, t]);

  const pageHeader = (
    <PageHeader
      className="py-5"
      title={tCommon("ai_market_maker")}
      description={tCommon("monitor_and_manage_ai_powered_market_makers")}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => fetchOverview(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {tCommon("refresh")}
          </Button>
          <Button onClick={() => router.push("/admin/ai/market-maker/market/create")}>
            <Plus className="h-4 w-4" />
            {tCommon("new_market_maker")}
          </Button>
          {/*
            NOT a `variant="destructive"` button that fires on click — R6's lint
            check flags exactly that. This opens a dialog; the dialog does the
            POST. It stays in the header rather than being demoted, because the
            one control an operator must be able to find without reading the page
            is the one that stops everything.
          */}
          <Button variant="outline" tone="destructive" onClick={() => setStopOpen(true)}>
            <OctagonAlert className="h-4 w-4" />
            {tCommon("emergency_stop")}
          </Button>
        </>
      }
    />
  );

  /**
   * The console masthead — a full-bleed instrument band, not a hero.
   * =========================================================================
   *
   * Passed to `PageShell`'s `header` slot, which means it OWNS the top
   * clearance: supplying `header` flips the container below to plain `py-8`, so
   * `pt-header-clear` here is the only thing keeping the page out from under the
   * fixed site header, and the band supplies its own `pb-8`. The inner wrapper
   * repeats PageShell's own `wide` container string verbatim because
   * `containerVariants` is not exported — get it wrong and the title sits wider
   * than every card beneath it.
   *
   * Three tiers, separated by hairlines and nothing else:
   *
   *   1. PROVENANCE — whether the feed is live, when it was read, and which
   *      engine process produced the numbers. Engine state is provenance here,
   *      not a metric: if no leader is running, everything below is a snapshot
   *      of a market that is not moving.
   *   2. IDENTITY — `PageHeader`, so there is still exactly one `<h1>` and it is
   *      still not hand-written (R1).
   *   3. STATE — the quoting meter. Of the markets whose badge says ACTIVE, how
   *      many are actually making a market and where their prices sit. That is
   *      the question this console exists to answer, and the old page could not
   *      answer it at all: a market with one bot, an empty pool or a spent
   *      budget rendered a green ACTIVE badge and no other signal.
   */
  const masthead = (showMeter: boolean) => (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          {/* 1 — PROVENANCE ------------------------------------------------ */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                feedState === "stale" ? "text-warning-ink" : "text-muted-foreground"
              )}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {/*
                  `animate-ping` is one of the class names globals.css neutralises
                  under `prefers-reduced-motion` — it sets both `animation: none`
                  AND `opacity: 0`, so the halo vanishes rather than freezing
                  mid-expansion. That is why the meaning lives on the solid dot
                  underneath and never on the halo.
                */}
                {feedState === "live" ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                ) : null}
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    feedState === "stale" ? "bg-warning" : "bg-success"
                  )}
                />
              </span>
              {feedState === "stale"
                ? tExtAdmin("stale")
                : feedState === "updating"
                  ? `${tCommon("updating")}…`
                  : tCommon("live")}
            </span>

            {data?.lastUpdated ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span>
                  {tCommon("last_updated")} {clock(data.lastUpdated)}
                </span>
              </>
            ) : null}

            {engine ? (
              <>
                <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border sm:inline-block" />
                <span
                  className={cn(
                    "hidden sm:inline",
                    engine.status !== "RUNNING" && "text-warning-ink"
                  )}
                >
                  {/* The engine's own status word is an English enum from the
                      backend, so it is mapped to a translated phrase rather than
                      printed. */}
                  {engine.status === "RUNNING"
                    ? engine.isLeader
                      ? t("engine_running_as_leader", {
                          arbiter: engine.leaderArbitratedBy ?? "none",
                        })
                      : t("engine_running_as_follower")
                    : t("engine_not_running")}
                </span>
              </>
            ) : null}

            {engine && (engine.errorCount ?? 0) > 0 ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-warning-ink">
                  {t("n_engine_errors", { count: count(engine.errorCount ?? 0) })}
                </span>
              </>
            ) : null}

            {quote ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-muted-foreground">{quote}</span>
              </>
            ) : null}

            {/* THE TOTALS ARE A LOWER BOUND, SAID ONCE FOR THE WHOLE PAGE.
                A denomination with no USD rate is left OUT of every total rather
                than counted as zero — the only honest choice, and an invisible
                one unless it is named. It sits in the provenance line because
                that is what it is: a statement about how complete the figures
                below are, not a figure. */}
            {unpriced.length ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-warning-ink">
                  {t("totals_exclude_unpriced", {
                    assets: unpriced.join(", "),
                  })}
                </span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          {pageHeader}

          {/* 3 — STATE ----------------------------------------------------- */}
          {showMeter ? (
            <div className="pt-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("quoting_state")}
                  <span className="normal-case tracking-normal">
                    {" "}
                    · {t("of_n_active_markets", { count: count(quoteMeter.active) })}
                  </span>
                </p>
                <Link
                  href="/admin/ai/market-maker/market"
                  className="rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {tCommon("view_all")}
                </Link>
              </div>

              {/* `gap-px` lets the track show through between segments. It is not
                  decoration: `success` and `info` sit close in lightness, and
                  butted together at 8px tall the boundary between them is
                  genuinely hard to find whatever palette an operator sets. */}
              <div
                className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={
                  quoteMeter.state === "ready"
                    ? quoteMeter.segments
                        .map(
                          (segment) =>
                            `${segmentLabel(segment.id)} ${segment.value}`
                        )
                        .join(", ")
                    : quoteMeter.state === "empty"
                      ? t("no_market_is_active")
                      : t("quoting_state")
                }
              >
                {quoteMeter.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn("h-full", QUOTE_SEGMENT_FILL[segment.id] ?? "bg-muted")}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                {quoteMeter.state === "empty" ? (
                  <span className="text-muted-foreground">
                    {t("no_market_is_active")}
                  </span>
                ) : (
                  quoteMeter.segments.map((segment) => (
                    <span
                      key={segment.id}
                      className="flex items-center gap-1.5 text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          QUOTE_SEGMENT_FILL[segment.id] ?? "bg-muted"
                        )}
                      />
                      {segmentLabel(segment.id)}
                      <span className="font-mono tabular-nums text-foreground">
                        <Loadable
                          loading={quoteMeter.state === "pending"}
                          placeholder="00"
                        >
                          {count(segment.value)}
                        </Loadable>
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const emergencyStopDialog = (
    <AlertDialog
      open={stopOpen}
      onOpenChange={(open) => {
        setStopOpen(open);
        if (!open) setStopReason("");
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tCommon("emergency_stop")}</AlertDialogTitle>
          {/* Names the exact objects and counts, per R6(1). "Stop everything" is
              not a confirmation; "stop 7 markets and 84 bots" is.

              The market count is ACTIVE **plus** PAUSED, because that is what
              the endpoint actually halts (`status != STOPPED`) and what it
              writes an EMERGENCY_STOP history row for. Naming only the ACTIVE
              ones would understate the blast radius. */}
          <AlertDialogDescription>
            {data
              ? t("emergency_stop_confirm", {
                  markets: count(stoppableMarkets),
                  bots: count(data.activeBots ?? 0),
                })
              : /* Reachable from the fatal branch, where the overview could not
                   be read. Printing "0 markets and 0 bots" there would be a
                   count the page does not have. */
                t("emergency_stop_confirm_unknown")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="mm-emergency-reason"
            className="text-sm font-medium text-foreground"
          >
            {tCommon("reason")}
          </label>
          <Textarea
            id="mm-emergency-reason"
            value={stopReason}
            onChange={(event) => setStopReason(event.target.value)}
            placeholder={t("emergency_stop_reason_placeholder")}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t("emergency_stop_reason_is_recorded")}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={stopping}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          {/* Deliberately NOT `AlertDialogAction`: that primitive closes the
              dialog on click, which would dismiss it before the request settles
              and lose the failure toast's context. */}
          <Button
            variant="destructive"
            disabled={stopping || !stopReason.trim()}
            onClick={confirmEmergencyStop}
          >
            {stopping ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <OctagonAlert className="h-4 w-4" />
            )}
            {tCommon("emergency_stop")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  /*
    THE ERROR STATE IS THE PAGE, NOT A BANNER ON TOP OF IT.
    `loading` is false by the time a failure lands, so leaving the body mounted
    renders a full console of zeros — four "0" tiles and an empty table — under a
    red banner saying the data could not be read. Every one of those zeros is a
    claim the page cannot support. The header stays so Retry and the emergency
    stop are still reachable (R7).
  */
  if (fatal) {
    return (
      /* `masthead(false)` and NOT a second `{header}` child: the masthead already
         renders `pageHeader` inside itself. */
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(false)}>
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("dashboard_unavailable")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{errorText}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchOverview()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              {/* R7 asks every terminal state to carry an action, and market
                  configuration does not depend on this endpoint. */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/ai/market-maker/market")}
              >
                <Store className="h-4 w-4" />
                {tCommon("markets")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        {emergencyStopDialog}
      </PageShell>
    );
  }

  return (
    <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(true)}>
      {/* -- ALERT ----------------------------------------------------------- */}
      {error ? (
        /* A failed POLL, not a failed page — `data` is still on screen and still
           true as of `lastUpdated`. Say the refresh failed; do not throw away a
           working dashboard over one bad request. */
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("refresh_failed")}</AlertTitle>
          <AlertDescription>{errorText}</AlertDescription>
        </Alert>
      ) : null}

      {/* Leadership is unarbitrated.

          The engine must tick exactly once per deployment. Redis normally
          arbitrates that and a database lease row is the fallback; "none" means
          neither could be reached, so the claim is fail-open — right for the
          single-process install it assumes, and a correctness problem the moment
          a second process starts, because two engines advance the price twice
          and both write the 1m candle binary options settle on. Deliberately
          shown only for "none": "database" arbitrates correctly and would be
          pure noise. */}
      {engineUnarbitrated ? (
        <Alert tone="destructive">
          <OctagonAlert className="h-4 w-4" />
          <AlertTitle>{tExt("leadership_unarbitrated")}</AlertTitle>
          <AlertDescription>{t("neither_redis_nor_the_database_lease")}</AlertDescription>
        </Alert>
      ) : null}

      {engineShortfall ? (
        <Alert tone="warning">
          <Activity className="h-4 w-4" />
          <AlertTitle>{t("engine_driving_fewer_markets")}</AlertTitle>
          <AlertDescription>
            {t("engine_driving_n_of_m", {
              driving: count(engineShortfall.driving),
              active: count(engineShortfall.active),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && silentMarkets > 0 ? (
        /* The 2am ticket: a market whose badge says ACTIVE and which is
           producing nothing. The breakdown names the remedy rather than the
           symptom, because all three gates are things the operator can close
           from the market's own page. */
        <Alert tone="warning">
          <Ban className="h-4 w-4" />
          <AlertTitle>{t("n_active_markets_are_not_quoting", { count: silentMarkets })}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              {[
                blockerCounts.bots > 0
                  ? t("n_need_active_bots", { count: blockerCounts.bots })
                  : null,
                blockerCounts.pool > 0
                  ? t("n_have_an_unfunded_pool", { count: blockerCounts.pool })
                  : null,
                blockerCounts.budget > 0
                  ? t("n_spent_their_daily_budget", { count: blockerCounts.budget })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* -- SUMMARY --------------------------------------------------------- */}
      {/* Four tiles, each a live number the operator can act on today, each
          linking through to the rows behind it (R3). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={tExtAdmin("quoting")}
          /* "3/5" reads as a figure to `isFigureValue` (digits, no word), so it
             stays in the monospace face. The denominator is ACTIVE markets, not
             all markets: a STOPPED market is not failing to quote. */
          value={`${(quoting?.active ?? 0) - silentMarkets}/${quoting?.active ?? 0}`}
          icon={Waves}
          index={0}
          loading={loading}
          description={t("markets_actually_making_a_market")}
          onClick={() => router.push("/admin/ai/market-maker/market")}
          {...(silentMarkets > 0 ? statsCardColors.warning : statsCardColors.neutral)}
        />
        <StatsCard
          label={t("outside_range")}
          value={loading ? 0 : (quoting?.outsideBand ?? 0)}
          icon={Gauge}
          index={1}
          loading={loading}
          description={t("n_more_at_the_range_edge", {
            count: quoting?.atEdge ?? 0,
          })}
          onClick={() => router.push("/admin/ai/market-maker/market")}
          {...((quoting?.outsideBand ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={tCommon("total_tvl")}
          value={
            <MoneyFigure
              value={usdMoney(data?.totalTVL ?? 0)}
              unitClassName={UNIT_CLASS}
            />
          }
          icon={Coins}
          index={2}
          loading={loading}
          description={
            budgetUsedPct === null
              ? t("volume_today_value", { value: usdMoney(data?.volumeToday ?? 0) })
              : t("volume_today_pct_of_budget", {
                  value: usdMoney(data?.volumeToday ?? 0),
                  pct: budgetUsedPct.toFixed(0),
                })
          }
          onClick={() => router.push("/admin/ai/market-maker/market")}
          {...statsCardColors.blue}
        />
        <StatsCard
          label={tCommon("total_p_l")}
          value={
            <MoneyFigure
              value={usdSignedMoney(data?.totalPnL ?? 0)}
              unitClassName={UNIT_CLASS}
            />
          }
          icon={TrendingUp}
          index={3}
          loading={loading}
          /* `pnlPercent` is P&L over TVL — the rate, beside the amount. It is
             the one figure on the old page that was already a rate rather than
             a counter, and it survives.

             It is NULL, not 0, when there is no pool capital to divide by, and
             the badge disappears with it. Rendering "+0.00%" there would claim
             the desk was flat on capital it does not have — a different and
             false statement from "there is nothing to measure". */
          change={
            typeof data?.pnlPercent === "number"
              ? `${data.pnlPercent >= 0 ? "+" : ""}${data.pnlPercent.toFixed(2)}%`
              : undefined
          }
          changeLabel={
            typeof data?.pnlPercent === "number" ? t("of_pool_capital") : undefined
          }
          /* The sign is the platform's: this pool IS the platform's capital, so
             a positive figure is money the desk is up. Saying so in words beats
             colouring the figure, which needs the reader to know which way round
             it is. */
          description={
            (data?.totalPnL ?? 0) >= 0
              ? t("pool_capital_is_up_on_funding")
              : t("pool_capital_is_down_on_funding")
          }
          onClick={() => router.push("/admin/ai/market-maker/analytics")}
          {...statsCardColors.neutral}
        />
      </div>

      {/* -- BODY: the markets ----------------------------------------------- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
              </span>
              {tCommon("your_markets")}
            </CardTitle>
            {/* The cap is DECLARED. The old page drew six cards out of an
                unbounded list and said nothing about the rest.

                The total is `totalMarkets`, NOT `rows.length`. The endpoint now
                caps the list it sends, so counting the rows in hand would have
                turned this line into "showing 10 of 10" on a platform running
                forty markets — a declaration that declares nothing, which is
                worse than the silence it replaced. */}
            <p className="text-xs text-muted-foreground">
              {loading
                ? t("ranked_worst_first")
                : t("showing_n_of_m_ranked_worst_first", {
                    shown: count(rows.length),
                    total: count(data?.totalMarkets ?? rows.length),
                  })}
            </p>
          </div>
          <Link
            href="/admin/ai/market-maker/market"
            className="flex items-center text-xs font-medium text-primary hover:underline"
          >
            {tCommon("view_all")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {/*
            NOT a `DataTable`: this is a fixed, already-ranked aggregate — the
            band classification and the blocker list are derived per request and
            have no column to sort or filter on server-side, and `DataTable`
            needs an `apiEndpoint` returning `{items, pagination}` per row model.
            It links INTO `/market`, which is the DataTable that owns these rows.
          */}
          {loading ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length ? (
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon("market")}</TableHead>
                    <TableHead>{tCommon("status")}</TableHead>
                    <TableHead className="w-48">{t("price_vs_range")}</TableHead>
                    <TableHead className="w-44">{t("inventory_vs_funded")}</TableHead>
                    {/* The unit is named ONCE per column rather than repeated on
                        every cell — ten rows of "USDT" is noise, and it keeps
                        the digits aligned. */}
                    <TableHead className="text-right">
                      {tExtAdmin("pool")}
                      {quoteSuffix}
                    </TableHead>
                    {/* NO `quoteSuffix` HERE, AND THAT IS NOT AN OMISSION.
                        `TradeExecutor.updateDatabaseStats()` increments
                        `currentDailyVolume` by the trade AMOUNT, not by the
                        trade VALUE, so this column and the budget it is measured
                        against are quantities of each market's BASE asset. The
                        quote code belongs on the pool column and nowhere else;
                        each row's own symbol names its base. */}
                    <TableHead className="w-36 text-right">
                      {tExtAdmin("volume_today")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const pnl =
                      (row.pool?.realizedPnL ?? 0) + (row.pool?.unrealizedPnL ?? 0);
                    const budgetPct =
                      row.maxDailyVolume > 0
                        ? Math.min(
                            100,
                            (row.currentDailyVolume / row.maxDailyVolume) * 100
                          )
                        : null;
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/admin/ai/market-maker/market/${row.id}`)
                        }
                      >
                        <TableCell>
                          <div className="font-medium">
                            {row.market?.symbol ?? t("unlinked_market")}
                          </div>
                          <span className="text-[11px] text-subtle-foreground">
                            {t("n_of_m_bots_active", {
                              active: row.activeBots,
                              total: row.totalBots,
                            })}
                          </span>
                        </TableCell>

                        <TableCell>
                          {/* Two facts, not one: the configured status AND
                              whether the engine's gates let it act on that
                              status. A market can be ACTIVE and silent, which is
                              the state this whole page exists to surface. */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.status === "ACTIVE" ? (
                              row.quoting ? (
                                <Badge tone="success" size="xs">
                                  {tExtAdmin("quoting")}
                                </Badge>
                              ) : (
                                <Badge tone="destructive" size="xs">
                                  {t("not_quoting")}
                                </Badge>
                              )
                            ) : (
                              <Badge tone="neutral" size="xs">
                                {row.status === "PAUSED"
                                  ? tCommon("paused")
                                  : tCommon("stopped")}
                              </Badge>
                            )}
                          </div>
                          {row.blockers.length ? (
                            <span className="mt-1 block text-[11px] text-warning-ink">
                              {row.blockers
                                .map((blocker) => blockerLabel(blocker))
                                .join(" · ")}
                            </span>
                          ) : (
                            /* When no gate is closed, the useful fact is when
                               this market last actually printed. It is stated
                               and NOT judged — see `stamp`. */
                            <span className="mt-1 block text-[11px] text-subtle-foreground">
                              {row.lastTradeAt
                                ? t("last_print_value", {
                                    value: stamp(row.lastTradeAt),
                                  })
                                : t("never_traded")}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {row.band === "unknown" || row.bandPosition === null ? (
                            <span className="text-[11px] text-muted-foreground">
                              {t("no_price_yet")}
                            </span>
                          ) : (
                            <>
                              {/* The soft-edge zones are drawn, so "close to the
                                  edge" is visible as a position rather than
                                  something the reader has to compute from two
                                  numbers. */}
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
                                <div
                                  aria-hidden
                                  className="absolute inset-y-0 left-0 bg-warning/25"
                                  style={{ width: `${BAND_EDGE_ZONE_PCT}%` }}
                                />
                                <div
                                  aria-hidden
                                  className="absolute inset-y-0 right-0 bg-warning/25"
                                  style={{ width: `${BAND_EDGE_ZONE_PCT}%` }}
                                />
                                <div
                                  className={cn(
                                    "absolute inset-y-0 w-1 rounded-full",
                                    row.band === "out"
                                      ? "bg-warning"
                                      : row.band === "edge"
                                        ? "bg-info"
                                        : "bg-foreground"
                                  )}
                                  style={{
                                    left: `calc(${Math.min(
                                      100,
                                      Math.max(0, (row.bandPosition + 1) * 50)
                                    )}% - 2px)`,
                                  }}
                                />
                              </div>
                              {/* The word carries the state; the bar is only the
                                  glance. Direction is never colour alone. */}
                              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-subtle-foreground">
                                <span>{price(row.lastKnownPrice ?? 0)}</span>
                                <span
                                  className={cn(
                                    "font-sans",
                                    row.band === "out" && "text-warning-ink",
                                    row.band === "edge" && "text-info-ink"
                                  )}
                                >
                                  {bandLabel(row.band)}
                                </span>
                              </div>
                            </>
                          )}
                        </TableCell>

                        <TableCell>
                          {row.inventory ? (
                            <>
                              <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-3">
                                <div
                                  className="h-full bg-chart-1"
                                  style={{ width: `${row.inventory.baseShare}%` }}
                                />
                                <div className="h-full flex-1 bg-chart-6" />
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-subtle-foreground">
                                <span>
                                  {t("base")} {row.inventory.baseShare.toFixed(0)}%
                                </span>
                                {/* Sign AND arrow AND unit — the skew is the one
                                    figure here whose direction matters, so it
                                    never relies on colour. */}
                                <span className="flex items-center gap-0.5 text-foreground">
                                  {row.inventory.skew >= 0 ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowDownRight className="h-3 w-3" />
                                  )}
                                  {row.inventory.skew >= 0 ? "+" : "-"}
                                  {Math.abs(row.inventory.skew).toFixed(1)}{" "}
                                  {t("percentage_points_short")}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              {t("no_pool")}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="font-mono tabular-nums">
                            {amount(row.pool?.totalValueLocked ?? 0)}
                          </div>
                          <span
                            className={cn(
                              "font-mono text-[11px] tabular-nums",
                              pnl > 0 && "text-up",
                              pnl < 0 && "text-down"
                            )}
                          >
                            {signed(pnl)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="font-mono tabular-nums">
                            {amount(row.currentDailyVolume)}
                          </div>
                          {budgetPct === null ? (
                            <span className="text-[11px] text-subtle-foreground">
                              {t("no_budget")}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "font-mono text-[11px] tabular-nums",
                                budgetPct >= 100
                                  ? "text-warning-ink"
                                  : "text-subtle-foreground"
                              )}
                            >
                              {t("pct_of_budget", { pct: budgetPct.toFixed(0) })}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyPanel
              icon={Store}
              title={tCommon("no_markets_yet")}
              body={tExt("create_your_first_ai_market_maker")}
              action={
                <Button
                  size="sm"
                  onClick={() =>
                    router.push("/admin/ai/market-maker/market/create")
                  }
                >
                  <Plus className="h-4 w-4" />
                  {tCommon("create_your_first_market")}
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* -- BODY: the counters ---------------------------------------------- */}
      {/* The figures the old page carried that are still worth carrying, at the
          size they deserve. The three ACTIVE/PAUSED/STOPPED Progress bars are
          folded into one cell: a proportion of a number the reader can also see
          does not need three bars to say it.

          EVERY ONE OF THESE IS A LINK, like the four tiles above them. A count
          with no destination is a poster, and this row was four of them: the
          operator could read "3 markets" and had to go find the market list from
          the nav to do anything about it. The registry does not accept a filter
          from the URL — `DataTable` reads no search params — so these land on
          the page that owns the rows rather than on a pre-filtered view of it. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat
          label={tCommon("markets")}
          value={data?.totalMarkets ?? 0}
          caption={t("active_paused_stopped", {
            active: data?.marketsByStatus?.active ?? 0,
            paused: data?.marketsByStatus?.paused ?? 0,
            stopped: data?.marketsByStatus?.stopped ?? 0,
          })}
          href="/admin/ai/market-maker/market"
          loading={loading}
        />
        <MiniStat
          label={tCommon("active_bots")}
          value={data?.activeBots ?? 0}
          caption={t("of_n_bots", { count: count(data?.totalBots ?? 0) })}
          href={botsHref}
          loading={loading}
        />
        {/* Trade COUNT and daily VOLUME are the two figures `/analytics` is
            built around — it reports `totalTrades`, `tradesToday`,
            `dailyVolume` and `volumeTargetPercent` per market, and takes a
            `?market=` deep link once the operator picks one. */}
        <MiniStat
          label={tCommon("recent_trades")}
          value={data?.recentTradeCount ?? 0}
          caption={tCommon("last_24_hours")}
          href="/admin/ai/market-maker/analytics"
          loading={loading}
        />
        <MiniStat
          label={tExtAdmin("volume_today")}
          value={usdMoney(data?.volumeToday ?? 0)}
          caption={
            budgetUsedPct === null
              ? t("no_budget")
              : t("pct_of_budget", { pct: budgetUsedPct.toFixed(0) })
          }
          href="/admin/ai/market-maker/analytics"
          loading={loading}
        />
      </div>

      {emergencyStopDialog}
    </PageShell>
  );
};

// ---------------------------------------------------------------------------
// Local pieces. Small enough to live beside their only consumer.
//
// BOTH SWAP THEIR VALUE WITH `Loadable`, NOT WITH A `<Skeleton>` BOX, and that
// is a correctness fix rather than a preference. `Skeleton` renders a `<div>`;
// these figures live inside a `<p>`. The HTML parser AUTO-CLOSES an open `<p>`
// when it meets a `<div>`, so the server's markup and the client's tree
// disagree about where the paragraph ends — React reports it as a hydration
// error and throws the subtree away. `Loadable` renders `SkeletonText`, a plain
// inline `<span>`, measured against the real font rather than guessed at with a
// hardcoded `h-4 w-20`.
// ---------------------------------------------------------------------------

function MiniStat({
  label,
  value,
  caption,
  href,
  loading,
}: {
  label: string;
  value: number | string;
  caption?: string;
  /**
   * Where this counter drills to. REQUIRED, and that is the whole point of it
   * being required: a count with no destination is a poster, and the type now
   * makes a poster impossible to build rather than merely discouraged.
   */
  href: string;
  loading: boolean;
}) {
  return (
    /* A real anchor, not the `onClick` + `role="button"` + `tabIndex` +
       `onKeyDown` quadruple that `StatsCard` has to hand-roll because it is a
       `m.div`. An anchor is focusable and announced as a link for free,
       and it survives middle-click and cmd-click into a new tab — which is how
       an operator triaging four counters actually opens them. The hover and
       focus treatment is copied from `StatsCard` verbatim so that both rows of
       tiles on this page answer to the pointer identically. */
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-border-strong focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        <Loadable loading={loading} placeholder="0,000">
          {value}
        </Loadable>
      </p>
      {/* Reserved whether or not there is a caption, so a four-up row cannot end
          up with one taller cell. */}
      <p className="mt-0.5 min-h-4 text-[11px] text-subtle-foreground">
        {loading ? null : caption}
      </p>
    </Link>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
