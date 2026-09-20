"use client";

/**
 * WHO — the moderator on the NFT marketplace. Not the person who wants to know
 *       how the marketplace is DOING; the person who has to decide what happens
 *       to a collection, a dispute, a frozen sale and a broken token today.
 * WHAT — decides what needs a human right now: which collections are waiting to
 *       be let in, which disputes are open and past their budget, which sales
 *       are holding somebody's money with nothing moving, and which catalogue
 *       rows cannot do what the rest of the product asks of them.
 * CLICK — through to the collection registry to approve or suspend, the dispute
 *       console to rule, the auction and offer registries to unblock a frozen
 *       settlement, or the token registry to fix a broken record.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED
 *
 * Seven counters and a feed. Collections, NFTs, Active Listings, Sales Volume,
 * Platform Revenue, Activity (24h), Average Price — every label hardcoded
 * English on a platform that ships 90 locales — over a "Recent Marketplace
 * Activity" list, under a bare `<h1 className="text-3xl font-bold">` written
 * out twice, once in the error branch and once in the loaded one.
 *
 * Not one of those seven is a decision. There was no moderation queue on the
 * page at all: no pending collections, no disputes, no frozen settlements,
 * nothing. The one panel that did prompt an action was an onboarding nag whose
 * body was three marketing bullets ("Step-by-step guidance", "Progress
 * tracking", "Expert tips") and two buttons into a setup guide that has its own
 * route in the nav.
 *
 * AND FIVE OF THE SEVEN DREW A FABRICATED TREND. `sparklineData` came from
 * `analytics`'s `chartData.trends`, which is `generateTrendData()` —
 * `baseValue * (0.1 + Math.random() * 0.2)` fourteen times. A random walk,
 * redrawn on every load, painted under a real total. Nothing on this page
 * reads that endpoint any more.
 *
 * DESIGN NOTES THAT ARE DECISIONS, NOT TASTE
 *
 *  - **The rail is TIME; the tiles are VOLUME and VALUE.** Masthead tier 3
 *    carries all five queues and the KPI row carries the four that arrive as a
 *    stream, so they overlap — and that is not a duplicate region. The rail
 *    leads with how long the oldest item has waited (the age axis the Queue
 *    contract asks for, which no NFT screen had), the tiles lead with depth and
 *    with the money frozen behind it. An operator reads the rail to decide WHAT
 *    to open and the tiles to decide how bad it is. The fifth queue, catalogue
 *    defects, is a body card instead: its rows were never queued, so they have
 *    no clock and no money, and three sub-counts is a panel, not a tile.
 *  - **Ages are measured against the SHARED SLA budgets**, `config/sla.ts`,
 *    which mirrors `backend/src/utils/sla.ts` — the same numbers the core queues
 *    and the system health card use. A dispute badge that says "late" here while
 *    the dispute page says nothing would be worse than no badge.
 *  - **Catalogue defects carry no age, and the rail draws none.** The backend
 *    sends `oldestAt: null` for that queue on purpose: a broken token was never
 *    queued, it is simply wrong, and inventing a "waiting since" for it would be
 *    the page asserting something it cannot know.
 *  - **`warning` and `destructive` are spent only on state.** Identity is the
 *    chart ramp through `statsCardColors`. The tiles that are calm today are
 *    `neutral` and turn `warning` when they have work in them, so the colour on
 *    screen is information rather than decoration.
 *  - **No sparklines.** Not because they are ugly — because the only series this
 *    payload can honestly produce is dispute inflow versus resolution, and that
 *    one gets a real chart with a real axis.
 *  - **One entrance animation.** `StatsCard` staggers itself off `index`;
 *    nothing else on the page animates in.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Database,
  FileWarning,
  Gavel,
  HandCoins,
  ImageOff,
  Package,
  RefreshCw,
  Scale,
  Store,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SLA_HOURS, formatDuration, slaLevel, type SlaKey } from "@/config/sla";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loadable, Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import {
  ChartCard,
  ChartLegend,
  SeriesChart,
  seriesLegendItems,
} from "@/components/ui/chart";

// ---------------------------------------------------------------------------
// Payload — `GET /api/admin/nft/dashboard`
// ---------------------------------------------------------------------------

/** A frozen amount, per currency. A marketplace spans chains; a sum would not. */
interface MoneyRow {
  currency: string | null;
  count: number;
  amount: number;
}

interface QueueState {
  count: number;
  /** ISO of the oldest item still waiting, or null when the queue has no clock. */
  oldestAt: string | null;
}

interface DashboardData {
  timeRange: string;
  generatedAt: string;
  source: {
    available: boolean;
    error: string | null;
    /** Every counter is a SQL COUNT/SUM. Only the previews below are capped. */
    aggregate: boolean;
    scanned: number;
    cap: number;
    truncated: boolean;
  };
  sla: { dispute: number; approval: number };
  queues: {
    collections: QueueState & { suspended: number };
    disputes: QueueState & { urgent: number; unassigned: number };
    settlements: QueueState & { value: MoneyRow[] };
    escrow: QueueState & { value: MoneyRow[] };
    catalogue: QueueState;
  };
  catalogue: {
    brokenListed: number;
    unbackedMints: number;
    staleDrafts: number;
    mintedMissingMetadata: number;
    mintedMissingImage: number;
    defects: number;
  };
  marketplaces: {
    active: number;
    paused: number;
    deprecated: number;
    contracts: {
      id: string;
      chain: string;
      network: string;
      contractAddress: string;
      feePercentage: number;
      status: string;
      pauseReason: string | null;
      pausedAt: string | null;
    }[];
  };
  pendingCollections: {
    id: string;
    name: string;
    symbol: string;
    chain: string;
    network: string;
    deployed: boolean;
    createdAt: string | null;
    creator: string | null;
    creatorVerified: boolean;
  }[];
  openDisputes: {
    id: string;
    title: string;
    disputeType: string;
    status: string;
    priority: string;
    assigned: boolean;
    createdAt: string | null;
    reporter: string | null;
  }[];
  disputeFlow: { date: string; opened: number; resolved: number }[];
}

const REFRESH_MS = 30_000;

/**
 * Stands in for "the request failed and said nothing useful".
 *
 * A SENTINEL, never rendered, because `fetchDashboard` runs outside the render
 * pass: putting `"Failed to load dashboard"` straight into the error state —
 * which is what the reference page does — puts one untranslated sentence on
 * screen in 89 of the 90 locales. The words are resolved at render, where `t` is
 * in scope, and the state stays TRUTHY so the fatal branch still fires.
 *
 * The value is namespaced rather than something like "unknown" so that a server
 * message can never accidentally equal it and be swallowed.
 */
const UNKNOWN_ERROR = "nft-dashboard:unknown-error";

/**
 * The five queues, declared once.
 *
 * ORDER IS THE RAIL AND THE TILES BOTH, so they can never disagree about which
 * queue is which. `sla` names the shared budget an age is measured against;
 * `catalogue` has none because its rows were never queued — see the docblock.
 *
 * `href` is the registry that owns the decision. None of them can be opened
 * pre-filtered: `DataTable` takes `initialFilters` as a PROP and reads no URL
 * parameters, so a link can only land on the page, not on the subset. That is a
 * real limitation of the shared table, noted here rather than papered over with
 * a query string the table will ignore.
 */
const QUEUES = [
  { id: "collections", href: "/admin/nft/collection", sla: "approval" },
  { id: "disputes", href: "/admin/nft/dispute", sla: "dispute" },
  { id: "settlements", href: "/admin/nft/auction", sla: "dispute" },
  { id: "escrow", href: "/admin/nft/offer", sla: "dispute" },
  { id: "catalogue", href: "/admin/nft/token", sla: null },
] as const;

type QueueId = (typeof QUEUES)[number]["id"];

/**
 * How an SLA level paints.
 *
 * STATE tokens, and the only three on this page: `breached` is past the budget,
 * `due` is past half of it, `fresh` is inside it. The word beside the chip
 * carries the same fact, because these three are not separable under
 * deuteranopia at 11px.
 */
const SLA_TONE: Record<string, string> = {
  breached: "text-destructive-ink",
  due: "text-warning-ink",
  fresh: "text-muted-foreground",
};

const SLA_DOT: Record<string, string> = {
  breached: "bg-destructive",
  due: "bg-warning",
  fresh: "bg-success",
};

export default function NftModerationDashboard() {
  const t = useTranslations("ext_admin_nft");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const router = useRouter();

  /**
   * Translate a dispute priority.
   *
   * The enum is the contract and the words are ours — rendering the raw
   * `CRITICAL` would put an English token in the table for 89 of the 90 locales,
   * and `statusLabel()` would only title-case it into a different English word.
   *
   * Declared here rather than at module scope with the translators passed in as
   * arguments. Both resolve the same messages, but a `t` arriving as a PARAMETER
   * belongs to no namespace as far as any static tool can tell: the translation
   * scanner reports these keys as undeclared, and the namespace optimizer refuses
   * to consolidate them because it cannot prove which namespace the call site
   * means.
   */
  const priorityLabel = useCallback(
    (priority: string): string => {
      if (priority === "CRITICAL") return tExtAdmin("critical");
      if (priority === "HIGH") return tCommon("high");
      if (priority === "MEDIUM") return tCommon("medium");
      return tCommon("low");
    },
    [tCommon, tExtAdmin]
  );

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");

  /* Read inside the interval callback without making the interval depend on it,
     so a poll landing mid-render cannot restart the timer. */
  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;

  const fetchDashboard = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    const { data: payload, error: failure } = await $fetch({
      url: `/api/admin/nft/dashboard?timeRange=${timeRangeRef.current}`,
      silent: true,
    });

    /* `$fetch` resolves an envelope and never throws, so there is no catch
       branch to put this in — the previous version wrapped four concurrent
       calls in a try/catch and rethrew each response's `error` field as an
       exception, which is the only reason it appeared to work. */
    if (failure) {
      setError(typeof failure === "string" && failure ? failure : UNKNOWN_ERROR);
    } else if (payload) {
      setData(payload as DashboardData);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [timeRange, fetchDashboard]);

  useEffect(() => {
    /* Polling a hidden tab runs ten aggregate queries for nobody. Every
       moderator leaves this page open in a background tab. */
    const tick = () => {
      if (document.visibilityState === "visible") fetchDashboard(true);
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // -------------------------------------------------------------------------
  // Formatting. Every one of these pins "en-US".
  //
  // A bare `toLocaleString()` takes its grouping separator from the RUNTIME
  // default — Node's ICU on the server, the viewer's locale in the browser — so
  // the same figure is "50,000" on one and "50.000" on the other. It is only
  // latent while `data` is null through the server pass; the moment this payload
  // is prefetched it becomes a hydration mismatch.
  // -------------------------------------------------------------------------

  const count = useCallback(
    (value: number) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
    []
  );

  /**
   * A crypto amount with its ticker.
   *
   * NOT `Intl.NumberFormat({ style: "currency" })`: these are chain tickers, and
   * `style: "currency"` throws a RangeError on anything that is not three ASCII
   * letters — "MATIC" would take the page down from inside render, where the
   * error boundary is the only thing that catches it. Figure then code, which is
   * the shape `Intl` itself uses for a well-formed code it does not recognise.
   */
  const cryptoAmount = useCallback((value: number, currency: string | null) => {
    const numeric = Number(value) || 0;
    const figure = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: numeric > 0 && numeric < 0.01 ? 8 : 4,
    }).format(numeric);
    return currency ? `${figure} ${currency}` : figure;
  }, []);

  /** "1.2 ETH · 300 USDT" — never one summed figure across chains. */
  const moneyList = useCallback(
    (rows: MoneyRow[] | undefined) =>
      (rows || [])
        .filter((row) => row.amount > 0)
        .map((row) => cryptoAmount(row.amount, row.currency))
        .join(" · "),
    [cryptoAmount]
  );

  /**
   * The "last updated" clock, in the VIEWER's zone.
   *
   * The zone is genuinely right here — a moderator wants the time on their own
   * wall — so it is the LOCALE that gets pinned, and the value never reaches the
   * server pass because `generatedAt` only exists after a client fetch.
   */
  const clock = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(
        new Date(iso)
      ),
    []
  );

  const queues = data?.queues;

  /** Label for a queue id. The ids are the contract; the words are ours. */
  const queueLabel = useCallback(
    (id: QueueId) => {
      if (id === "collections") return t("queue_collections");
      if (id === "disputes") return tExtAdmin("open_disputes");
      if (id === "settlements") return t("queue_settlements");
      if (id === "escrow") return t("queue_escrow");
      return t("queue_catalogue");
    },
    [t, tExtAdmin]
  );

  /**
   * The decision rail: every queue with its depth and the age of its oldest item.
   *
   * `pending` IS A NAMED STATE, and that is the whole reason this is a memo and
   * not an inline expression. "Every queue is clear" and "we have not been told
   * yet" are different claims, and a rail of five zeroes asserts the first one
   * for the whole of the first load — on a console whose entire job is to be
   * believed. So the cells render a measured placeholder rather than a figure
   * until the payload lands.
   *
   * It is a named boolean rather than a `!loading && ...` gate because the
   * layout-stability scanner counts the second form as content withheld while
   * loading, and it is the form that makes the rail assert "clear" mid-fetch.
   *
   * There is deliberately no `empty` state: a rail with five zeroes in it IS the
   * empty state, and it is the same shape as a busy one, so nothing below the
   * band moves when the marketplace goes quiet.
   */
  const rail = useMemo(() => {
    const state: "pending" | "ready" = data ? "ready" : "pending";

    const segments = QUEUES.map((queue) => {
      const source = (queues as any)?.[queue.id] as QueueState | undefined;
      const depth = source?.count ?? 0;
      const oldestAt = source?.oldestAt ?? null;
      const age =
        oldestAt && queue.sla
          ? slaLevel(oldestAt, queue.sla as SlaKey)
          : null;
      return {
        id: queue.id as QueueId,
        href: queue.href,
        depth,
        age,
      };
    });

    const waiting = segments.reduce((sum, segment) => sum + segment.depth, 0);
    return { state, segments, waiting };
  }, [data, queues]);

  /**
   * What the live dot is allowed to claim.
   *
   * A green pulse beside a clock that stopped advancing is a lie, and it is the
   * easy one to ship: `error` is set while `data` stays on screen, so without
   * this the dot would read "Live" directly above the refresh-failed notice.
   */
  const feedState: "live" | "updating" | "stale" = error
    ? "stale"
    : refreshing
      ? "updating"
      : "live";

  /** The sentinel resolved to words, at the point where `t` is in scope. */
  const errorText =
    error === UNKNOWN_ERROR ? t("the_request_failed_with_no_message") : error;

  const unavailable = Boolean(data && !data.source.available);
  /* A failed poll must not wipe an already-loaded console — only take the page
     over when there is genuinely nothing to show. */
  const fatal = Boolean(error && !data);

  const rangeLabel =
    timeRange === "24h"
      ? tCommon("last_24_hours")
      : timeRange === "30d"
        ? tCommon("last_30_days")
        : tCommon("last_7_days");

  const disputeSeries = useMemo(
    () => [
      /*
        A STATE breakdown, not two categories, so these take status tokens
        rather than ramp slots — "opened" rising above "resolved" is a problem
        and should be painted like one. This is the exception R8(b) allows,
        declared rather than derived from array position.

        The tokens are `warning` (amber) and `success` (green), which is the
        canonical deuteranopia collision, so the `label`s here are NOT tooltip
        decoration: they are fed to `seriesLegendItems()` for the ChartCard
        `footer` below. `SeriesChart` renders no legend of its own — R8's
        "direction is never colour alone" is the caller's job on every
        multi-series chart, and without that footer the two lines are
        distinguishable only by hovering them.
      */
      { key: "opened", label: tCommon("opened"), color: "warning" },
      { key: "resolved", label: tCommon("resolved"), color: "success" },
    ],
    [tCommon, tExtAdmin]
  );

  const contracts = data?.marketplaces?.contracts ?? [];
  const noContract = Boolean(data?.source.available && contracts.length === 0);
  const pausedContracts = contracts.filter((row) => row.status === "PAUSED");

  const pageHeader = (
    <PageHeader
      className="py-5"
      title={t("nft_moderation")}
      description={t("what_needs_a_decision_right_now")}
      actions={
        <>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{tCommon("last_24_hours")}</SelectItem>
              <SelectItem value="7d">{tCommon("last_7_days")}</SelectItem>
              <SelectItem value="30d">{tCommon("last_30_days")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => fetchDashboard(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {tCommon("refresh")}
          </Button>
          <Button onClick={() => router.push("/admin/nft/dispute")}>
            <Scale className="h-4 w-4" />
            {tExtAdmin("dispute_management")}
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
   *   1. PROVENANCE — where these figures came from and how fresh they are, and
   *      in particular that the COUNTS are exact aggregates while the two tables
   *      below are capped previews. The old page declared nothing at all.
   *   2. IDENTITY — the existing `PageHeader`, so there is exactly one `<h1>`
   *      and it is still not hand-written (R1). The page it replaced wrote
   *      `<h1 className="text-3xl font-bold">` twice, in two branches.
   *   3. STATE — the decision rail: the one question this console exists to
   *      answer, above the fold and before any tile is read.
   *
   * `showRail` is false on the store-unavailable branch. Drawing a rail of
   * zeroes while the tables cannot be read would be the page asserting a clean
   * queue it explicitly cannot see.
   */
  const masthead = (showRail: boolean) => (
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
                  `animate-ping` is one of the class names globals.css
                  neutralises under `prefers-reduced-motion` — it sets both
                  `animation: none` AND `opacity: 0`, so the halo vanishes rather
                  than freezing mid-expansion. The meaning therefore lives on the
                  solid dot underneath and never on the halo.
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
                ? tExtAdmin("figures_are_stale")
                : feedState === "updating"
                  ? `${tCommon("updating")}…`
                  : tCommon("live")}
            </span>

            {data?.generatedAt ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span>
                  {tCommon("last_updated")} {clock(data.generatedAt)}
                </span>
              </>
            ) : null}

            {showRail && data?.source ? (
              <>
                <span
                  aria-hidden
                  className="hidden h-3 w-px shrink-0 bg-border sm:inline-block"
                />
                {/* The distinction the old page never made: the numbers are
                    exact, and the two tables are not the whole queue. */}
                <span className="hidden sm:inline">{t("counts_are_exact")}</span>
                <span
                  aria-hidden
                  className="hidden h-3 w-px shrink-0 bg-border lg:inline-block"
                />
                <span className="hidden lg:inline">
                  {t("previews_show_the_oldest_n", {
                    count: count(data.source.cap / 2),
                  })}
                </span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          {pageHeader}

          {/* 3 — STATE ----------------------------------------------------- */}
          {showRail ? (
            <div className="pt-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("decision_queue")}
                  <span className="normal-case tracking-normal">
                    {" "}
                    · {t("oldest_waiting")}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">
                  <Loadable loading={rail.state === "pending"} placeholder="00">
                    {count(rail.waiting)}
                  </Loadable>{" "}
                  {tExtAdmin("decisions_waiting")}
                </span>
              </div>

              {/*
                ONE TREE, BOTH STATES. Every cell renders in both — the label,
                the frame and the link are all knowable before the fetch — so
                only the figures wait, and nothing below the band moves when the
                payload lands. `gap-px` over a `bg-border` ground draws the grid
                lines: a hairline, not a shadow, exactly as the Ledger card does.
              */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
                {rail.segments.map((segment) => (
                  <Link
                    key={segment.id}
                    href={segment.href}
                    /* `hover:bg-muted/50` is the table row's hover, reused so a
                       hoverable cell reads the same everywhere. No lift, no
                       shadow — the Ledger shell takes its depth from a border. */
                    className="flex flex-col gap-1 bg-card p-3 outline-hidden transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {queueLabel(segment.id)}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-2xl font-semibold tabular-nums",
                        segment.depth > 0 ? "text-foreground" : "text-subtle-foreground"
                      )}
                    >
                      <Loadable
                        loading={rail.state === "pending"}
                        placeholder="00"
                      >
                        {count(segment.depth)}
                      </Loadable>
                    </span>
                    {/* The age line always occupies its row, whether or not this
                        queue has a clock, so a five-up rail cannot end up with
                        one taller cell. */}
                    <span className="flex min-h-4 items-center gap-1.5 text-[11px]">
                      {rail.state === "pending" ? (
                        <Loadable loading placeholder="0000" />
                      ) : segment.age ? (
                        <>
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              SLA_DOT[segment.age.level]
                            )}
                          />
                          {/* Colour is never the only carrier: the DURATION is
                              the fact — "80h" against a 24h budget reads as late
                              with no colour vision at all — and the breach adds
                              a word on top. The dot is the glance. */}
                          <span
                            className={cn(
                              "font-mono tabular-nums",
                              SLA_TONE[segment.age.level]
                            )}
                          >
                            {formatDuration(segment.age.hours)}
                          </span>
                          {segment.age.level === "breached" ? (
                            <span className="text-destructive-ink">
                              {t("past_sla")}
                            </span>
                          ) : null}
                        </>
                      ) : segment.depth === 0 ? (
                        /* Nothing in the queue, so there is nothing to have
                           waited. Ordered BEFORE the catalogue case on purpose:
                           an empty catalogue is clear, not clock-less. */
                        <span className="text-subtle-foreground">
                          {tCommon("clear")}
                        </span>
                      ) : segment.id === "catalogue" ? (
                        <span className="text-subtle-foreground">
                          {t("no_wait_clock")}
                        </span>
                      ) : (
                        /* Non-empty, and the server sent no oldest timestamp —
                           which it should never do for a timed queue. An em dash
                           rather than "clear", because "clear" beside a non-zero
                           count is the page contradicting itself. */
                        <span className="text-subtle-foreground">—</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  /*
    THE ERROR STATE IS THE PAGE, NOT A BANNER ON TOP OF IT.
    `loading` is false by the time a failure lands, so leaving the body mounted
    renders a full console of zeros — five "0" queues, four "0" tiles and two
    "nothing to see" panels — under a red banner saying the data could not be
    read. Every one of those zeros is a claim of a clean queue that the page
    cannot support. The header stays so the range picker and Retry are still
    reachable (R7).
  */
  if (fatal || unavailable) {
    return (
      /* `masthead(false)` and NOT a second `{header}` child: the masthead
         already renders `pageHeader` inside itself. */
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(false)}>
        <Alert tone="destructive">
          {fatal ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <AlertTitle>
            {fatal ? tExtAdmin("dashboard_unavailable") : t("nft_tables_unavailable")}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{fatal ? errorText : data?.source.error}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchDashboard()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              {/* R7 asks every terminal state to carry an action, and the
                  registries still open even when the aggregate does not. */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/nft/collection")}
              >
                <Package className="h-4 w-4" />
                {tExtAdmin("nft_collections")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(true)}>
      {/* -- ALERT ----------------------------------------------------------- */}
      {error ? (
        /* A failed POLL, not a failed page — `data` is still on screen and still
           true as of `generatedAt`. Say the refresh failed; do not throw away a
           working console over one bad request. */
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("refresh_failed")}</AlertTitle>
          <AlertDescription>{errorText}</AlertDescription>
        </Alert>
      ) : null}

      {noContract ? (
        /* The one condition under which nothing on the marketplace can trade at
           all. It outranks every queue below it, so it is an alert and not a
           tile. */
        <Alert tone="destructive">
          <Store className="h-4 w-4" />
          <AlertTitle>{t("no_marketplace_contract_deployed")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{t("nothing_can_trade_until_a_contract_is_deployed")}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/admin/nft/marketplace")}
            >
              <Store className="h-4 w-4" />
              {t("marketplace_contracts")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {pausedContracts.length > 0 ? (
        <Alert tone="warning">
          <Store className="h-4 w-4" />
          <AlertTitle>
            {t("n_marketplace_contracts_paused", {
              count: pausedContracts.length,
            })}
          </AlertTitle>
          <AlertDescription>
            {pausedContracts
              .map((row) => `${row.chain} ${row.network}`)
              .join(" · ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && (queues?.settlements.count ?? 0) > 0 ? (
        /* Money is frozen on the far side of this one: an auction ended with a
           winning bid and the cron refused to settle it because no contract
           holds the funds. Nothing clears it but a person. */
        <Alert tone="warning">
          <Gavel className="h-4 w-4" />
          <AlertTitle>
            {t("n_auctions_cannot_settle", {
              count: queues?.settlements.count ?? 0,
            })}
          </AlertTitle>
          <AlertDescription>
            {t("winning_bidders_are_waiting")}
            {moneyList(queues?.settlements.value)
              ? ` · ${moneyList(queues?.settlements.value)}`
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {data?.source.truncated ? (
        /* A cap that is not reported reads as "this is everything". The counts
           above it are exact; these two tables are not. */
        <Alert tone="info">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>{t("queues_are_deeper_than_the_previews")}</AlertTitle>
          <AlertDescription>
            {t("tables_show_the_oldest_n_of_each", {
              count: count(data.source.cap / 2),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* -- SUMMARY --------------------------------------------------------- */}
      {/*
        Four tiles, each a decision the moderator can make today, each linking to
        the registry that owns it (R3). Every one of them is a queue DEPTH or the
        money frozen behind it — nothing here is a scoreboard.

        Each tile is `neutral` while it is clear and `warning` once it has work
        in it, so the colour on this row is a reading of the marketplace rather
        than four decorative hues.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("queue_collections")}
          value={loading ? 0 : (queues?.collections.count ?? 0)}
          icon={Package}
          index={0}
          loading={loading}
          description={
            (queues?.collections.suspended ?? 0) > 0
              ? t("n_suspended_collections", {
                  count: queues?.collections.suspended ?? 0,
                })
              : t("collections_awaiting_approval")
          }
          onClick={() => router.push("/admin/nft/collection")}
          {...((queues?.collections.count ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={tExtAdmin("open_disputes")}
          value={loading ? 0 : (queues?.disputes.count ?? 0)}
          icon={Scale}
          index={1}
          loading={loading}
          description={t("n_urgent_n_unassigned", {
            urgent: queues?.disputes.urgent ?? 0,
            unassigned: queues?.disputes.unassigned ?? 0,
          })}
          onClick={() => router.push("/admin/nft/dispute")}
          {...((queues?.disputes.urgent ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={t("queue_settlements")}
          value={loading ? 0 : (queues?.settlements.count ?? 0)}
          icon={Gavel}
          index={2}
          loading={loading}
          description={
            moneyList(queues?.settlements.value) ||
            t("auctions_the_cron_could_not_settle")
          }
          onClick={() => router.push("/admin/nft/auction")}
          {...((queues?.settlements.count ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={t("queue_escrow")}
          value={loading ? 0 : (queues?.escrow.count ?? 0)}
          icon={HandCoins}
          index={3}
          loading={loading}
          description={
            moneyList(queues?.escrow.value) || t("buyer_funds_locked_with_no_nft")
          }
          onClick={() => router.push("/admin/nft/offer")}
          {...((queues?.escrow.count ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
      </div>

      {/* -- BODY: dispute throughput + marketplace contracts ---------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title={t("dispute_flow")}
          description={t("is_the_queue_draining_or_filling", { range: rangeLabel })}
          icon={Scale}
          height={280}
          className="lg:col-span-2"
          loading={loading}
          empty={
            !loading &&
            !data?.disputeFlow?.some((point) => point.opened || point.resolved)
          }
          emptyMessage={tCommon("no_data_available")}
          footer={
            <ChartLegend
              items={seriesLegendItems(disputeSeries)}
              variant="inline"
              loading={loading}
              pendingCount={2}
            />
          }
        >
          {/*
            The only throughput series this data model can produce. The other
            four queues have no completion timestamp on the row — a collection
            that was approved simply becomes ACTIVE and a blocked settlement
            simply stops being blocked — so "how fast are we clearing them" is
            unanswerable for them, and no chart pretends otherwise.
          */}
          <SeriesChart
            data={data?.disputeFlow ?? []}
            series={disputeSeries}
            type="line"
            xKey="date"
            timeframe={timeRange}
          />
        </ChartCard>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
              </span>
              {t("marketplace_contracts")}
            </CardTitle>
            <Link
              href="/admin/nft/marketplace"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-12 w-full" />
                ))}
              </div>
            ) : contracts.length ? (
              <ul className="divide-y divide-border">
                {contracts.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {row.chain}
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {row.network}
                        </span>
                      </p>
                      <p className="text-[11px] text-subtle-foreground">
                        {tExtAdmin("marketplace_fee")}{" "}
                        <span className="font-mono tabular-nums">
                          {row.feePercentage}%
                        </span>
                      </p>
                    </div>
                    <Badge
                      tone={
                        row.status === "ACTIVE"
                          ? "success"
                          : row.status === "PAUSED"
                            ? "warning"
                            : "neutral"
                      }
                      size="xs"
                    >
                      {row.status === "ACTIVE"
                        ? tCommon("active")
                        : row.status === "PAUSED"
                          ? tCommon("paused")
                          : t("deprecated")}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyPanel
                icon={Store}
                title={t("no_contract_deployed")}
                body={t("nothing_can_trade_until_a_contract_is_deployed")}
                action={
                  <Button
                    size="sm"
                    onClick={() => router.push("/admin/nft/marketplace")}
                  >
                    {t("marketplace_contracts")}
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: the two queues that have rows to look at ------------------ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                </span>
                {t("queue_collections")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tCommon("oldest_first")}
              </p>
            </div>
            <Link
              href="/admin/nft/collection"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {/* NOT a `DataTable`: this is a fixed, already-ranked preview of one
                status with no paging, sorting or filtering of its own, and it
                links INTO the DataTable that owns these rows. */}
            {loading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-11 w-full" />
                ))}
              </div>
            ) : data?.pendingCollections?.length ? (
              <div className="-mx-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("collection")}</TableHead>
                      <TableHead>{tCommon("creator")}</TableHead>
                      <TableHead className="text-right">
                        {tCommon("age")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingCollections.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => router.push("/admin/nft/collection")}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.name}</span>
                            {row.deployed ? null : (
                              <Badge tone="neutral" size="xs">
                                {tExt("not_deployed")}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-subtle-foreground">
                            {row.symbol} · {row.chain} {row.network}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {row.creator ?? tExtAdmin("unknown_creator")}
                          </span>
                          {row.creatorVerified ? (
                            <span className="block text-[11px] text-success-ink">
                              {tExt("verified_creator")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <AgeCell iso={row.createdAt} slaKey="approval" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyPanel
                icon={Package}
                title={t("no_collection_is_waiting")}
                body={t("every_submitted_collection_has_been_reviewed")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                </span>
                {tExtAdmin("open_disputes")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tCommon("oldest_first")}
              </p>
            </div>
            <Link
              href="/admin/nft/dispute"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-11 w-full" />
                ))}
              </div>
            ) : data?.openDisputes?.length ? (
              <div className="-mx-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("details")}</TableHead>
                      <TableHead>{tCommon("priority")}</TableHead>
                      <TableHead className="text-right">
                        {tCommon("age")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.openDisputes.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => router.push("/admin/nft/dispute")}
                      >
                        <TableCell>
                          <p className="max-w-[16rem] truncate font-medium">
                            {row.title}
                          </p>
                          <span className="text-[11px] text-subtle-foreground">
                            {row.reporter ?? t("unknown_reporter")}
                            {row.assigned ? "" : ` · ${tCommon("unassigned")}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {/* Priority is a STATE, so it takes a status tone —
                              and it carries its own word, which is what makes it
                              readable without colour vision. */}
                          <Badge
                            tone={
                              row.priority === "CRITICAL" || row.priority === "HIGH"
                                ? "destructive"
                                : row.priority === "MEDIUM"
                                  ? "warning"
                                  : "neutral"
                            }
                            size="xs"
                          >
                            {priorityLabel(row.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AgeCell iso={row.createdAt} slaKey="dispute" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyPanel
                icon={Scale}
                title={t("no_dispute_is_open")}
                body={t("nothing_has_been_reported_for_review")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: catalogue integrity --------------------------------------- */}
      {/*
        The fifth queue, and the one that is not a stream: these rows were never
        submitted for a decision, they are simply broken, so they get counters
        with no age instead of a table with a clock. Each is a distinct defect
        and each links to the token registry, which is where it is fixed.
      */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <ImageOff className="h-3.5 w-3.5" />
              </span>
              {t("queue_catalogue")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("rows_that_cannot_do_what_is_asked_of_them")}
            </p>
          </div>
          <Link
            href="/admin/nft/token"
            className="flex items-center text-xs font-medium text-primary hover:underline"
          >
            {tCommon("view_all")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniStat
              label={t("listed_with_nothing_to_show")}
              value={data?.catalogue.brokenListed ?? 0}
              caption={t("n_minted_missing_metadata_n_missing_image", {
                metadata: data?.catalogue.mintedMissingMetadata ?? 0,
                image: data?.catalogue.mintedMissingImage ?? 0,
              })}
              loading={loading}
              tone={(data?.catalogue.brokenListed ?? 0) > 0 ? "warning" : "none"}
            />
            <MiniStat
              label={t("minted_with_no_on_chain_id")}
              value={data?.catalogue.unbackedMints ?? 0}
              caption={t("cannot_be_transferred_or_listed")}
              loading={loading}
              tone={(data?.catalogue.unbackedMints ?? 0) > 0 ? "warning" : "none"}
            />
            <MiniStat
              label={t("drafts_never_minted")}
              value={data?.catalogue.staleDrafts ?? 0}
              caption={t("older_than_n_hours", { hours: SLA_HOURS.approval })}
              loading={loading}
              tone="none"
            />
          </div>
        </CardContent>
      </Card>

      {/* The provenance line that used to sit at the bottom of this page is in
          the masthead's top rail now. It qualifies every figure here, so
          printing it after all of them was the wrong end. */}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Local pieces. Small enough to live beside their only consumer; each exists to
// keep one shape identical across the several places it repeats on this page.
//
// `MiniStat` swaps its value with `Loadable`, NOT with a `<Skeleton>` box, and
// that is a correctness fix rather than a preference. `Skeleton` renders a
// `<div>`; the figure lives inside a `<p>`. The HTML parser AUTO-CLOSES an open
// `<p>` when it meets a `<div>`, so the server's markup and the client's tree
// disagree about where the paragraph ends — React reports it as a hydration
// error and throws the subtree away.
//
// `Loadable` renders `SkeletonText`, a plain inline `<span>`, and it is measured
// rather than guessed: it lays the placeholder out with the real font, size and
// weight and paints the pulse over that box.
// ---------------------------------------------------------------------------

/**
 * How long this row has waited, against the SHARED budget.
 *
 * `slaLevel` and `formatDuration` come from `config/sla.ts`, which mirrors
 * `backend/src/utils/sla.ts` — the same numbers the core queues and the health
 * card use, so this page can never call something late that they call fine.
 */
function AgeCell({ iso, slaKey }: { iso: string | null; slaKey: SlaKey }) {
  if (!iso) return <span className="text-subtle-foreground">—</span>;
  const { level, hours } = slaLevel(iso, slaKey);
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SLA_DOT[level])}
      />
      <span className={cn("font-mono text-xs tabular-nums", SLA_TONE[level])}>
        {formatDuration(hours)}
      </span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  caption,
  loading,
  tone,
}: {
  label: string;
  value: number | string;
  caption?: string;
  loading: boolean;
  /** `warning` only when the counter is non-zero — see the KPI row's note. */
  tone: "warning" | "none";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums",
          tone === "warning" ? "text-warning-ink" : "text-foreground"
        )}
      >
        <Loadable loading={loading} placeholder="0,000">
          {value}
        </Loadable>
      </p>
      {/* Reserved whether or not there is a caption, so a three-up row cannot
          end up with one taller cell. */}
      <p className="mt-0.5 min-h-4 text-[11px] text-subtle-foreground">
        {loading ? null : caption}
      </p>
    </div>
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
