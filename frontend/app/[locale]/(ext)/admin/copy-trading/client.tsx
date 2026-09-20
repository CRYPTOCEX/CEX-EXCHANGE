"use client";

/**
 * WHO — the operator running the copy-trading desk. Followers hand this
 *       platform real money and then hand the decisions to somebody else, so
 *       every allocation on it is capital the platform is holding on trust.
 * WHAT — decides whether that capital is safe right now: how much of it is
 *       actually being traded, how much is stuck behind a leader who cannot or
 *       does not trade, and whether the replication engine is landing the
 *       copies it promised.
 * CLICK — through a leader to suspend, reinstate or recalculate them; through
 *       to the follower registry to release an allocation; through to the
 *       pending queue to approve or reject an application.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED
 *
 * A `HeroSection` with two gradient orbs and six floating particles, over eight
 * KPI tiles in two rows, a `PremiumCard` shell that hand-rolled a two-layer
 * shadow plus a hover shadow, a `whileHover={{ x: 4 }}` on every leader row, a
 * `whileHover={{ scale: 1.01 }}` on every application row, an eight-tile "Quick
 * Access" grid duplicating the nav directly above it, and a 100-point "health
 * score" invented on the server from two numbers the page was already showing.
 *
 * DESIGN NOTES THAT ARE DECISIONS, NOT TASTE
 *
 *  - **The masthead answers "is follower capital safe", and it is the only
 *    thing on this page allowed to answer it.** The old page's headline figure
 *    was Total Allocated — one number that is identical whether every penny of
 *    it is being traded by an active leader or every penny is frozen behind a
 *    suspended one. The meter splits the same total four ways, and those four
 *    ids come from the server so the meter and the table below it cannot
 *    disagree about which leader is in which state.
 *
 *  - **"Dormant" is a state the schema does not have.** A leader who stopped
 *    trading a fortnight ago is still `status: "ACTIVE"`, so no status column
 *    anywhere in this addon shows the failure. It is derived on the server from
 *    the leader's last trade against `capital.dormantDays`, and that threshold
 *    arrives in the payload rather than being restated here — the "Capital not
 *    being traded" caption prints the server's own number, so the definition
 *    the operator reads and the one the bands were computed with are the same
 *    value and cannot drift apart.
 *
 *  - **"Top Leaders" is a rank, not a sample.** The ordering, the follower
 *    count and the eligibility (ACTIVE followers of ACTIVE leaders) all come
 *    from ONE server-side aggregate. If eligibility were applied after the
 *    ranking, a suspended leader with the biggest book would be dropped rather
 *    than replaced, and the rows below it would silently renumber themselves —
 *    which is why the row index may be printed as the rank.
 *
 *  - **The health score is gone; its two inputs stayed.** `healthScore` was
 *    `100` minus fixed penalties for failure rate and queue depth — a composite
 *    with no unit that could not be acted on, wrapped in a 1.5s animated dial.
 *    Both inputs are real and both are now printed as themselves, next to the
 *    five most recent failures, which is what an operator actually opens.
 *
 *  - **No currency symbol the payload cannot justify.** `quoteAmount` is
 *    denominated in each allocation's own quote asset, so the old
 *    `$${totalAllocated.toLocaleString()}` was a dollar sign printed over a sum
 *    of USDT and BTC. The server now sends `capital.currency`, null when the
 *    book spans more than one quote asset, and the figure renders bare with the
 *    count of assets stated in the provenance rail.
 *
 *  - **One entrance animation.** `StatsCard` staggers itself off `index`.
 *    Nothing else animates in: the old page had a `staggerContainer` over five
 *    nested `fadeInUp` blocks plus a per-bar width tween, so the whole console
 *    rebuilt itself section by section on every load.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Clock,
  Crown,
  DollarSign,
  Layers,
  RefreshCw,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMoney, isIntlCurrencyCode } from "@/utils/currency";
import { useCopyTradingAdminDashboardStore } from "@/store/copy-trading/admin-dashboard-store";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loadable, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { ChartCard, SeriesChart, chartColor } from "@/components/ui/chart";

const REFRESH_MS = 30_000;

/**
 * The capital meter's fills, keyed by the band id the SERVER sends.
 *
 * These are status tokens rather than ramp slots because the bands are a state
 * axis, not a set of categories — a segment growing on the right has to read as
 * a problem without anybody consulting a legend. `stranded` is the only
 * `destructive` on the page and it is spent deliberately: it is money the
 * platform is holding that nobody can trade and nobody chose to park.
 *
 * `dormant` is `warning` and NOT `destructive`, and that is a consistency
 * requirement rather than a preference — the same population is painted
 * `warning` by the "Capital not being traded" table's dormant rows, and a
 * masthead saying red where the table beside it says amber is a masthead
 * disagreeing with its own page about the same leader.
 */
const CAPITAL_BAND_FILL: Record<string, string> = {
  copying: "bg-success",
  paused: "bg-info",
  dormant: "bg-warning",
  stranded: "bg-destructive",
};

/** Band order for the shells rendered before the first payload lands. */
const CAPITAL_BAND_ORDER = ["copying", "paused", "dormant", "stranded"] as const;

/**
 * The narrowest a non-empty meter segment may be drawn, in percent.
 *
 * Below this a band rounds away to nothing, and the band most likely to be tiny
 * is `stranded` — the one whose disappearance would be a lie.
 */
const MIN_SEGMENT_PCT = 2.5;

/**
 * The ticker beside a 24px figure, set down to body size.
 *
 * A four-letter quote code at the figure's own weight reads as part of the
 * number — "1.2M USDT" comes out looking like a seven-character amount.
 */
const UNIT_CLASS = "text-base font-normal text-muted-foreground";

/**
 * Leader status → tone. A DECLARED map, not an array index (R8b).
 *
 * `REJECTED` and `INACTIVE` are neutral on purpose: they are settled outcomes,
 * not things demanding attention, and painting them red would put four red
 * chips on a page whose one red thing is meant to be stranded money.
 */
const LEADER_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "destructive",
  REJECTED: "neutral",
  INACTIVE: "neutral",
};

/** Risk grade → tone. Risk IS a state axis, so status tokens are correct here. */
const RISK_TONE: Record<string, BadgeTone> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
};

const RISK_FILL: Record<string, string> = {
  LOW: "bg-success",
  MEDIUM: "bg-warning",
  HIGH: "bg-destructive",
};

/**
 * Trading style → ramp slot, declared rather than derived from array position.
 *
 * Style is pure IDENTITY — no style is better than another — so it takes the
 * chart ramp. The old page painted three of the four `bg-primary` and the
 * fourth `bg-warning`, which read as "one of our four trading styles is a
 * problem".
 */
const STYLE_FILL: Record<string, string> = {
  SCALPING: "bg-chart-1",
  DAY_TRADING: "bg-chart-2",
  SWING: "bg-chart-3",
  POSITION: "bg-chart-4",
};

export default function CopyTradingDashboardClient() {
  const t = useTranslations("ext_admin_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");

  // -------------------------------------------------------------------------
  // Label helpers. Enum values are the CONTRACT; the words are ours, so nothing
  // English arrives from the payload and gets rendered.
  //
  // These live INSIDE the component rather than at module scope with the
  // translator passed in as an argument. Both resolve the same messages, but a
  // `t` arriving as a parameter belongs to no namespace as far as any static
  // tool can tell: the translation scanner reads the keys as undeclared, and the
  // namespace optimizer refuses to consolidate them because it cannot prove
  // which namespace the call site means ("t has no declaration in scope").
  // -------------------------------------------------------------------------

  const statusLabel = useCallback(
    (status: string): string => {
      switch (status) {
        case "ACTIVE":
          return tCommon("active");
        case "PENDING":
          return tCommon("pending");
        case "SUSPENDED":
          return tCommon("suspended");
        case "REJECTED":
          return tCommon("rejected");
        default:
          return tCommon("inactive");
      }
    },
    [tCommon]
  );

  const riskLabel = useCallback(
    (level: string): string => {
      if (level === "LOW") return tCommon("low");
      if (level === "HIGH") return tCommon("high");
      return tCommon("medium");
    },
    [tCommon]
  );

  const styleLabel = useCallback(
    (style: string): string => {
      switch (style) {
        case "SCALPING":
          return t("style_scalping");
        case "DAY_TRADING":
          return tExt("day_trading");
        case "SWING":
          return t("style_swing");
        case "POSITION":
          return t("style_position");
        default:
          return style;
      }
    },
    [t]
  );
  const router = useRouter();

  const { data, isLoading, isRefreshing, error, fetchDashboard } =
    useCopyTradingAdminDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    /* Polling a hidden tab aggregates the allocation table for nobody. Every
       admin leaves this page open in a background tab. */
    const tick = () => {
      if (document.visibilityState === "visible") fetchDashboard(true);
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const stats = data?.stats;
  const capital = data?.capital;
  const quote = capital?.currency ?? null;

  // -------------------------------------------------------------------------
  // Formatting. Every one of these is pinned to `en-US`.
  //
  // A bare `toLocaleString()` during render takes its grouping separator from
  // the RUNTIME default — Node's ICU on the server, the viewer's locale in the
  // browser — so the same figure is "50,000" on one and "50.000" on the other.
  // The previous page called it in six places.
  // -------------------------------------------------------------------------

  const amount = useCallback((value: number, compact = true) => {
    const numeric = Number(value) || 0;
    return new Intl.NumberFormat(
      "en-US",
      compact
        ? { notation: "compact", maximumFractionDigits: 2 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    ).format(numeric);
  }, []);

  const count = useCallback(
    (value: number) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
    []
  );

  /**
   * Money in a denomination the payload can actually justify.
   *
   * `code` is null whenever the underlying rows span more than one currency, in
   * which case the figure renders BARE. That is the whole point: a correct sum
   * of a column is still not a dollar amount, and printing "$" on it is the
   * defect this replaced.
   */
  const money = useCallback(
    (value: number, code: string | null, compact = true) => {
      const numeric = Number(value) || 0;
      if (!code) return amount(numeric, compact);
      /* A three-letter code gets Intl's symbol form ("$1.2M"); a ticker Intl
         refuses gets figure-then-code, which is the order `MoneyFigure` splits
         on. */
      if (isIntlCurrencyCode(code)) {
        return formatMoney(
          numeric,
          code,
          compact
            ? { notation: "compact", maximumFractionDigits: 2 }
            : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        );
      }
      return `${amount(numeric, compact)} ${code}`;
    },
    [amount]
  );

  const capitalMoney = useCallback(
    (value: number, compact = true) => money(value, quote, compact),
    [money, quote]
  );

  const revenueMoney = useCallback(
    (value: number, compact = true) =>
      money(value, data?.revenueCurrency ?? null, compact),
    [money, data?.revenueCurrency]
  );

  /**
   * A signed BARE figure, deliberately without a currency.
   *
   * Realised P&L comes off `copyTradingTrade.profit`, which is denominated in
   * each trade's own quote asset — a different population from the allocations,
   * so `capital.currency` does not describe it and would be the same "$ over a
   * mixed sum" mistake in a new place. The sign carries the meaning; the unit
   * is named by the column or caption around it.
   */
  const signed = useCallback(
    (value: number) => `${value >= 0 ? "+" : "-"}${amount(Math.abs(value))}`,
    [amount]
  );

  /**
   * The "last updated" clock, in the VIEWER's zone.
   *
   * The zone is genuinely right here — an operator wants the time on their own
   * wall — so it is the LOCALE that gets pinned, and the value never reaches
   * the server pass because `generatedAt` only exists after a client fetch.
   */
  const clock = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(
        new Date(iso)
      ),
    []
  );

  /** Whole days between now and an ISO timestamp. Used for queue age. */
  const daysSince = useCallback((iso?: string | null) => {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return null;
    return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  }, []);

  /**
   * How the allocated book splits by the state its capital is in.
   *
   * WEIGHTED BY CAPITAL, NOT BY FOLLOWER COUNT, and the label says so. One
   * follower holding 40% of the book would otherwise draw as a single hairline
   * beside 127 dust allocations, which is the exact concentration this console
   * exists to catch.
   *
   * The floor-and-borrow is not cosmetic either. A 0.3% stranded slice rounds
   * to a sub-pixel segment and disappears — the one segment that must never
   * disappear. It is widened to a visible minimum and the difference is taken
   * back from the WIDEST band, so the widths still sum to 100 and the bar never
   * overflows its track.
   */
  const capitalHealth = useMemo(() => {
    const bands = capital?.bands ?? [];
    const total = bands.reduce((sum, band) => sum + band.capital, 0);

    /*
      THREE STATES, NOT TWO. "Nothing is allocated" and "we have not been told
      yet" are different claims and the difference is visible: without the
      `pending` case the masthead asserts "No capital is allocated" for the
      whole of the first load, on a console whose entire job is to be believed.
      It is a named state rather than a `!isLoading &&` gate because the
      layout-stability scanner counts the latter as content withheld while
      loading.
    */
    const state: "pending" | "empty" | "ready" = !data
      ? "pending"
      : total > 0
        ? "ready"
        : "empty";

    if (state !== "ready") {
      /* The band shells still render, so the legend holds its shape and its
         width across all three states and nothing below it moves. */
      return {
        state,
        total: 0,
        segments: CAPITAL_BAND_ORDER.map((id) => ({
          id,
          capital: 0,
          followers: 0,
          share: 0,
          width: 0,
        })),
      };
    }

    const segments = bands.map((band) => ({
      ...band,
      share: (band.capital / total) * 100,
      width: (band.capital / total) * 100,
    }));

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

    return { state: "ready" as const, total, segments };
  }, [capital?.bands, data]);

  /**
   * Translate a band id.
   *
   * The ids are the contract; the words are ours. Nothing English arrives from
   * the handler for these, and nothing should — a label hardcoded in a route
   * would put an English word in the masthead for 89 of the 90 locales.
   */
  const bandLabel = useCallback(
    (id: string) => {
      if (id === "paused") return tCommon("paused");
      if (id === "dormant") return t("leader_dormant");
      if (id === "stranded") return t("stranded");
      return t("copying");
    },
    [t, tCommon]
  );

  const reasonLabel = useCallback(
    (reason: string, days: number | null) => {
      if (reason === "leader-inactive") return t("reason_leader_cannot_trade");
      if (reason === "unreleased") return t("reason_allocation_not_released");
      return days === null
        ? t("reason_never_traded")
        : t("reason_no_trades_in_days", { days });
    },
    [t]
  );

  const activitySeries = useMemo(
    () => [
      { key: "volume", label: tCommon("volume"), color: chartColor(null, 0) },
      { key: "profit", label: tCommon("profit"), color: chartColor(null, 1) },
      // See health/client.tsx: an ICU placeholder printed as a chart label.
      { key: "trades", label: tCommon("trades"), color: chartColor(null, 2) },
    ],
    [tCommon]
  );

  const [activeMetric, setActiveMetric] = useState(0);

  /* A failed poll must not wipe an already-loaded dashboard — only take the
     page over when there is genuinely nothing to show. */
  const fatal = Boolean(error && !data);

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
    : isRefreshing
      ? "updating"
      : "live";

  const pageHeader = (
    <PageHeader
      className="py-5"
      title={t("copy_trading_dashboard")}
      description={tExtAdmin("monitor_and_manage_your_copy_trading_platform")}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => fetchDashboard(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {tCommon("refresh")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/copy-trading/settings")}
          >
            <Settings className="h-4 w-4" />
            {tCommon("settings")}
          </Button>
          <Button onClick={() => router.push("/admin/copy-trading/leader")}>
            <Users className="h-4 w-4" />
            {tExtAdmin("manage_leaders")}
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
   * `pt-header-clear` here is the only thing keeping the page out from under
   * the fixed site header, and the band supplies its own `pb-8`. The inner
   * wrapper repeats PageShell's own `wide` container string verbatim
   * (`mx-auto w-full px-4 container`) because `containerVariants` is not
   * exported — get it wrong and the title sits wider than every card beneath it.
   *
   * Three tiers, separated by hairlines and nothing else:
   *
   *   1. PROVENANCE — how fresh these figures are and what unit they are in.
   *   2. IDENTITY — the `PageHeader`, so there is exactly one `<h1>` and it is
   *      still not hand-written (R1).
   *   3. STATE — the follower-capital meter: the one question this console
   *      exists to answer, above the fold and before any tile is read.
   *
   * `showCapital` is false on the fatal branch. Rendering a 0%/0%/0%/0% meter
   * while the request has failed would be the page asserting something it
   * explicitly cannot know.
   */
  const masthead = (showCapital: boolean) => (
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
                  `animation: none` AND `opacity: 0`, so the halo vanishes
                  rather than freezing mid-expansion. That is why the meaning
                  lives on the solid dot underneath and never on the halo.
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

            {/* THE UNIT, STATED. When the book spans more than one quote asset
                there is no currency that describes the totals, and saying so is
                the only honest alternative to picking one. */}
            {showCapital && capital ? (
              <>
                <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border sm:inline-block" />
                <span className="hidden sm:inline">
                  {quote
                    ? quote
                    : t("n_quote_assets", { count: capital.quoteAssets })}
                </span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          {pageHeader}

          {/* 3 — STATE ----------------------------------------------------- */}
          {showCapital ? (
            <div className="pt-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("follower_capital")}
                  <span className="normal-case tracking-normal">
                    {" "}
                    · {t("by_allocated_capital")}
                  </span>
                </p>
                <Link
                  href="/admin/copy-trading/follower"
                  className="rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {tCommon("view_all")}
                </Link>
              </div>

              {/* `gap-px` lets the track show through between segments. It is
                  not decoration: `success` and `info` sit close in lightness in
                  light mode, and butted together at 8px tall the boundary
                  between them is genuinely hard to find. */}
              <div
                className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={
                  capitalHealth.state === "ready"
                    ? capitalHealth.segments
                        .map(
                          (segment) =>
                            `${bandLabel(segment.id)} ${segment.share.toFixed(0)}%`
                        )
                        .join(", ")
                    : capitalHealth.state === "empty"
                      ? t("no_capital_is_allocated")
                      : t("follower_capital")
                }
              >
                {capitalHealth.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn(
                      "h-full",
                      CAPITAL_BAND_FILL[segment.id] ?? "bg-muted"
                    )}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                {capitalHealth.state === "empty" ? (
                  <span className="text-muted-foreground">
                    {t("no_capital_is_allocated")}
                  </span>
                ) : (
                  capitalHealth.segments.map((segment) => (
                    <span
                      key={segment.id}
                      className="flex items-center gap-1.5 text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          CAPITAL_BAND_FILL[segment.id] ?? "bg-muted"
                        )}
                      />
                      {bandLabel(segment.id)}
                      <span className="font-mono tabular-nums text-foreground">
                        <Loadable
                          loading={capitalHealth.state === "pending"}
                          placeholder="00"
                        >
                          {segment.share > 0 && segment.share < 1
                            ? "<1"
                            : segment.share.toFixed(0)}
                        </Loadable>
                        %
                      </span>
                      <span className="font-mono tabular-nums text-subtle-foreground">
                        <Loadable
                          loading={capitalHealth.state === "pending"}
                          placeholder="000"
                        >
                          {capitalMoney(segment.capital)}
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

  /*
    THE ERROR STATE IS THE PAGE, NOT A BANNER ON TOP OF IT.
    `isLoading` is false by the time a failure lands, so leaving the body
    mounted renders a full console of zeros under a red banner saying the data
    could not be read. Every one of those zeros is a claim the page cannot
    support. The header stays so Retry and the nav actions are still reachable
    (R7).
  */
  if (fatal) {
    return (
      /* `masthead(false)` and NOT a second `{header}` child: the masthead
         already renders `pageHeader` inside itself. */
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(false)}>
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("dashboard_unavailable")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{error}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchDashboard()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              {/* R7 asks every terminal state to carry an action, and the leader
                  registry is the one thing that still works without this
                  aggregate. */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/copy-trading/leader")}
              >
                <Crown className="h-4 w-4" />
                {tExtAdmin("manage_leaders")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  const atRisk = capital?.atRisk ?? 0;
  const atRiskLeaders = capital?.atRiskLeaders ?? 0;
  const pendingApplications = stats?.leaders?.pending ?? 0;

  return (
    <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(true)}>
      {/* -- ALERT ----------------------------------------------------------- */}
      {error ? (
        /* A failed POLL, not a failed page — `data` is still on screen and
           still true as of `generatedAt`. */
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("refresh_failed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && atRisk > 0 ? (
        <Alert tone="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>
            {t("follower_capital_is_not_being_traded", {
              value: capitalMoney(atRisk),
            })}
          </AlertTitle>
          <AlertDescription>
            {t("held_behind_n_leaders", { count: atRiskLeaders })}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* -- SUMMARY --------------------------------------------------------- */}
      {/* Four tiles, each a live number the operator can act on today, each
          linking through to the rows behind it (R3). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("follower_capital")}
          value={
            <MoneyFigure
              value={capitalMoney(capital?.totalAllocated ?? 0)}
              unitClassName={UNIT_CLASS}
            />
          }
          icon={Wallet}
          index={0}
          loading={isLoading}
          description={t("in_open_trades_value", {
            value: capitalMoney(capital?.inUse ?? 0),
          })}
          onClick={() => router.push("/admin/copy-trading/follower")}
          sparklineData={data?.sparklines?.allocation}
          {...statsCardColors.blue}
        />
        <StatsCard
          label={t("capital_not_being_traded")}
          value={
            <MoneyFigure value={capitalMoney(atRisk)} unitClassName={UNIT_CLASS} />
          }
          icon={ShieldAlert}
          index={1}
          loading={isLoading}
          description={
            atRiskLeaders > 0
              ? t("held_behind_n_leaders", { count: atRiskLeaders })
              : t("every_allocation_is_with_a_trading_leader")
          }
          onClick={() => router.push("/admin/copy-trading/leader")}
          {...(atRisk > 0 ? statsCardColors.warning : statsCardColors.neutral)}
        />
        <StatsCard
          label={tExtAdmin("pending_applications")}
          value={isLoading ? 0 : pendingApplications}
          icon={Clock}
          index={2}
          loading={isLoading}
          description={
            pendingApplications > 0
              ? tExtAdmin("decisions_waiting")
              : tCommon("all_caught_up")
          }
          onClick={() =>
            router.push("/admin/copy-trading/leader?status=PENDING")
          }
          {...(pendingApplications > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={tExtAdmin("platform_revenue")}
          value={
            <MoneyFigure
              value={revenueMoney(stats?.financial?.platformRevenue ?? 0)}
              unitClassName={UNIT_CLASS}
            />
          }
          icon={DollarSign}
          index={3}
          loading={isLoading}
          description={t("last_30_days_value", {
            value: revenueMoney(stats?.financial?.monthRevenue ?? 0),
          })}
          onClick={() => router.push("/admin/copy-trading/transaction")}
          sparklineData={data?.sparklines?.revenue}
          {...statsCardColors.amber}
        />
      </div>

      {/* -- BODY: activity + replication ------------------------------------ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title={tExtAdmin("performance_overview")}
          description={tExtAdmin("last_7_days_trading_activity")}
          icon={Activity}
          height={300}
          className="lg:col-span-2"
          loading={isLoading}
          empty={!isLoading && !data?.tradeTimeline?.length}
          emptyMessage={tExtAdmin("no_trading_data_available")}
          actions={
            /* Three measures of ONE series, so this is a control rather than a
               legend: the dot is the colour the line will be drawn in, so the
               swatch you click is the colour you get. */
            <div className="flex items-center gap-1">
              {activitySeries.map((series, index) => (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => setActiveMetric(index)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    activeMetric === index
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: series.color }}
                    />
                    {series.label}
                  </span>
                </button>
              ))}
            </div>
          }
        >
          <SeriesChart
            data={data?.tradeTimeline ?? []}
            series={[activitySeries[activeMetric]]}
            type="area"
            xKey="date"
            xIsDate={false}
            formatXAxis={(value) => String(value ?? "")}
            /* Volume and profit are sums of `cost`/`profit` on the TRADE table,
               denominated in each trade's own quote asset — not the allocation
               currency — so they render bare rather than wearing a symbol this
               series cannot justify. */
            valueFormatter={(value) =>
              activeMetric === 2 ? count(value) : amount(value, false)
            }
          />
        </ChartCard>

        {/*
          THE REPLICATION CARD — what used to be a 100-point "health score".
          Both numbers the score was computed from are printed as themselves,
          above the failures they describe, because "68 / 100" is not something
          anybody can act on and "4 copies failed today" is.
        */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
              </span>
              {t("replication")}
            </CardTitle>
            <Link
              href="/admin/copy-trading/health"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              {tExtAdmin("system_health")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <MetaRow
                label={t("waiting_to_copy")}
                value={count(stats?.health?.pendingTrades ?? 0)}
                loading={isLoading}
              />
              <MetaRow
                label={t("failed_today")}
                value={count(stats?.health?.failedToday ?? 0)}
                loading={isLoading}
              />
              <MetaRow
                label={tCommon("failure_rate")}
                value={`${stats?.health?.failureRate ?? "0"}%`}
                loading={isLoading}
              />
            </dl>

            <div className="border-t pt-3">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                {t("recent_failures")}
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} className="h-9 w-full" />
                  ))}
                </div>
              ) : data?.failedReplications?.length ? (
                <ul className="space-y-2">
                  {data.failedReplications.slice(0, 3).map((trade) => (
                    <li key={trade.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          <span className="truncate font-medium">
                            {trade.symbol}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                          {amount(trade.cost)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate pl-5 text-subtle-foreground">
                        {/* The engine's own message when there is one — it is
                            the only thing here that says WHY. The enum value is
                            never rendered as the fallback: `REPLICATION_FAILED`
                            is a database value, not a sentence. */}
                        {trade.errorMessage ||
                          trade.leader?.displayName ||
                          tCommon("failed")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">
                  {t("no_replication_failed_today")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: capital that is not being traded -------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                {t("capital_not_being_traded")}
              </CardTitle>
              {/* The dormancy threshold is printed from `capital.dormantDays`
                  and never from a literal here. A second copy of the number in
                  the client is a second definition of "dormant" that can drift
                  from the one the bands above were actually computed with. It
                  is omitted rather than defaulted while the payload is absent —
                  a threshold is exactly the kind of figure a console must not
                  guess. */}
              <p className="text-xs text-muted-foreground">
                {t("ranked_by_follower_money_held_still")}
                {typeof capital?.dormantDays === "number" ? (
                  <span className="text-subtle-foreground">
                    {" · "}
                    {t("dormant_after_n_days", {
                      days: capital.dormantDays,
                    })}
                  </span>
                ) : null}
              </p>
            </div>
            <Link
              href="/admin/copy-trading/leader"
              className="flex shrink-0 items-center text-xs font-medium text-primary hover:underline"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {/*
              NOT a `DataTable`: this is a derived, already-ranked join across
              allocations, followers and leaders with no row model to page,
              filter or sort server-side — `DataTable` needs an `apiEndpoint`
              returning `{items, pagination}` per model. It links INTO the
              leader registry, which does own these rows.
            */}
            {isLoading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-11 w-full" />
                ))}
              </div>
            ) : capital?.leaders?.length ? (
              <>
                <div className="-mx-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tCommon("leader")}</TableHead>
                        <TableHead>{tCommon("reason")}</TableHead>
                        <TableHead className="text-right">
                          {tExt("followers")}
                        </TableHead>
                        {/* The unit is named ONCE per column rather than
                            repeated on every cell, which also keeps the digits
                            aligned. */}
                        <TableHead className="text-right">
                          {tCommon("allocated_capital")}
                          {quote ? ` (${quote})` : ""}
                        </TableHead>
                        <TableHead className="text-right">
                          {tCommon("last_trade")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capital.leaders.map((leader) => (
                        <TableRow
                          key={leader.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/admin/copy-trading/leader/${leader.id}`
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {leader.displayName || t("unnamed_leader")}
                              </span>
                              {leader.status ? (
                                <Badge
                                  tone={
                                    LEADER_STATUS_TONE[leader.status] ??
                                    "neutral"
                                  }
                                  size="xs"
                                >
                                  {statusLabel(leader.status)}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {reasonLabel(leader.reason, leader.daysIdle)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {count(leader.followers)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {amount(leader.capital)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {leader.daysIdle === null
                              ? tCommon("never")
                              : t("n_days_ago", { days: leader.daysIdle })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* A cap that is not reported reads as "this is everything",
                    which is exactly how a silent limit turns into a wrong
                    total. */}
                {atRiskLeaders > capital.leaders.length ? (
                  <p className="mt-3 text-xs text-subtle-foreground">
                    {t("showing_n_of_m", {
                      shown: capital.leaders.length,
                      total: atRiskLeaders,
                    })}
                  </p>
                ) : null}
              </>
            ) : (
              <EmptyPanel
                icon={ShieldAlert}
                title={t("every_allocation_is_with_a_trading_leader")}
                body={t("no_follower_money_is_sitting_still")}
              />
            )}
          </CardContent>
        </Card>

        {/* THE QUEUE. Oldest first, with an age on every row — a pending
            application is work that arrived without the operator asking, and
            §3 of the admin plan asks every such list for an age axis. */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </span>
              {tExtAdmin("pending_applications")}
            </CardTitle>
            {pendingApplications > 0 ? (
              <Badge tone="warning" size="xs">
                {count(pendingApplications)}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-14 w-full" />
              ))
            ) : data?.pendingApplications?.length ? (
              <>
                {data.pendingApplications.slice(0, 4).map((app) => {
                  const age = daysSince(app.createdAt);
                  return (
                    <Link
                      key={app.id}
                      href={`/admin/copy-trading/leader/${app.id}`}
                      className="flex items-center gap-3 rounded-md border border-border p-2.5 hover:bg-surface-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={app.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {(app.displayName || app.user?.firstName || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {app.displayName}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {styleLabel(app.tradingStyle)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge
                          tone={RISK_TONE[app.riskLevel] ?? "neutral"}
                          size="xs"
                        >
                          {riskLabel(app.riskLevel)}
                        </Badge>
                        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-subtle-foreground">
                          {age === null
                            ? "—"
                            : t("n_days_waiting", { days: age })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {pendingApplications > 4 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      router.push("/admin/copy-trading/leader?status=PENDING")
                    }
                  >
                    {t("review_all_n", { count: pendingApplications })}
                  </Button>
                ) : null}
              </>
            ) : (
              <EmptyPanel
                icon={UserCheck}
                title={tCommon("all_caught_up")}
                body={tCommon("no_pending_applications")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: who carries the book + what the roster looks like ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Crown className="h-3.5 w-3.5" />
                </span>
                {tExt("top_leaders")}
              </CardTitle>
              {/* The ranking is server-side and the caption says what it is
                  ranked BY and over WHICH population. It used to be five
                  arbitrary rows sorted among themselves and labelled "top", and
                  then five rows ranked over every leader but rendered only if
                  ACTIVE — so a suspended #1 left a card of four rows numbered
                  1-4. Both the count and the eligibility now come from one
                  server-side aggregate, which is why `index + 1` below is a
                  rank and not a row number. */}
              <p className="text-xs text-muted-foreground">
                {t("active_leaders_ranked_by_active_followers")}
              </p>
            </div>
            <Link
              href="/admin/copy-trading/leader"
              className="flex shrink-0 items-center text-xs font-medium text-primary hover:underline"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              [0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-12 w-full" />
              ))
            ) : data?.topLeaders?.length ? (
              data.topLeaders.map((leader, index) => (
                <Link
                  key={leader.id}
                  href={`/admin/copy-trading/leader/${leader.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-3"
                >
                  <span className="w-5 shrink-0 text-center font-mono text-xs tabular-nums text-subtle-foreground">
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={leader.avatar} />
                    <AvatarFallback className="text-xs">
                      {(leader.displayName || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {leader.displayName || t("unnamed_leader")}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t("n_followers", { count: leader.followerCount })} ·{" "}
                      {amount(leader.capital)}
                      {quote ? ` ${quote}` : ""}
                    </p>
                  </div>
                  {/* Win rate carries the word "win" beside it rather than
                      relying on the up/down hue, which is not separable under
                      deuteranopia. */}
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {leader.winRate}%
                    </p>
                    <p className="text-[10px] text-subtle-foreground">
                      {tCommon("win_rate")}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyPanel
                icon={Crown}
                title={tExtAdmin("no_leaders_yet")}
                body={t("nobody_is_following_a_leader_yet")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
              </span>
              {t("leader_mix")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("active_leaders_by_style_and_risk")}
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                {tExt("trading_styles")}
              </p>
              <DistributionBars
                rows={(data?.distributions?.tradingStyle ?? []).map((row) => ({
                  key: row.style,
                  label: styleLabel(row.style),
                  fill: STYLE_FILL[row.style] ?? "bg-muted",
                  count: row.count,
                }))}
                rowCount={4}
                loading={isLoading}
                emptyLabel={tCommon("no_data")}
              />
            </div>
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                {tExtAdmin("risk_distribution")}
              </p>
              <DistributionBars
                rows={(data?.distributions?.riskLevel ?? []).map((row) => ({
                  key: row.level,
                  label: riskLabel(row.level),
                  fill: RISK_FILL[row.level] ?? "bg-muted",
                  count: row.count,
                }))}
                rowCount={3}
                loading={isLoading}
                emptyLabel={tCommon("no_data")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: population and lifetime counters --------------------------
          Context rather than queue depth, which is why these are a counter row
          and not a second KPI block — R3 allows exactly one KPI row per page.

          The two `growth` strings the payload still carries are deliberately
          not here. `calcGrowth(totalNow, totalAsOfLastWeek)` over a count that
          only ever goes up is non-negative by construction, so it was a
          permanently-green "+12.4%" chip that no decision has ever turned on.
          The populations themselves, and the share of them that is ACTIVE,
          are the part an operator reads. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MiniStat
          label={tExt("active_leaders")}
          value={count(stats?.leaders?.active ?? 0)}
          caption={t("of_n_total", { count: stats?.leaders?.total ?? 0 })}
          loading={isLoading}
        />
        <MiniStat
          label={tExt("active_followers")}
          value={count(stats?.followers?.active ?? 0)}
          caption={t("of_n_total", { count: stats?.followers?.total ?? 0 })}
          loading={isLoading}
        />
        <MiniStat
          label={tExtAdmin("todays_trades")}
          value={count(stats?.trades?.today ?? 0)}
          caption={t("vs_yesterday_value", {
            value: stats?.trades?.todayGrowth ?? "0%",
          })}
          loading={isLoading}
        />
        <MiniStat
          label={tCommon("total_trades")}
          value={count(stats?.trades?.completed ?? 0)}
          caption={t("closed_all_time")}
          loading={isLoading}
        />
        {/* Bare, and the caption says which population it is. `cost` is
            denominated in each trade's own quote asset, so there is no one
            symbol that describes the sum — the old page rendered it as
            `(volume / 1000).toFixed(1) + "k"`, which also prints 1.5M as
            "1500.0k". */}
        <MiniStat
          label={tCommon("total_volume")}
          value={amount(stats?.trades?.volume ?? 0)}
          caption={t("today_value", {
            value: amount(stats?.trades?.todayVolume ?? 0),
          })}
          loading={isLoading}
        />
        <MiniStat
          label={t("followers_down_on_the_copy")}
          value={count(capital?.underwaterFollowers ?? 0)}
          caption={t("net_realised_value", {
            value: signed(capital?.underwaterNet ?? 0),
          })}
          loading={isLoading}
        />
      </div>

      {/* The provenance line that used to sit at the very bottom of the page —
          "last updated" — is in the masthead's top rail now. It qualifies every
          figure here, so printing it after all of them was the wrong end. */}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Local pieces. Small enough to live beside their only consumer; each exists to
// keep one shape identical across the several places it repeats on this page.
//
// EVERY ONE OF THEM SWAPS ITS VALUE WITH `Loadable`, NOT WITH A `<Skeleton>`
// BOX, and that is a correctness fix rather than a preference. `Skeleton`
// renders a `<div>`; each of these figures lives inside a `<p>` or a `<dd>`.
// The HTML parser AUTO-CLOSES an open `<p>` when it meets a `<div>`, so the
// server's markup and the client's tree disagree about where the paragraph ends
// — React reports it as a hydration error and throws the subtree away.
//
// `Loadable` renders `SkeletonText`, a plain inline `<span>` — legal in all of
// them — and it is MEASURED rather than guessed: it lays the placeholder string
// out with the real font, size and weight and paints the pulse over that box.
// ---------------------------------------------------------------------------

function MetaRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium tabular-nums">
        <Loadable loading={loading} placeholder="00.0K">
          {value}
        </Loadable>
      </dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  caption,
  loading,
}: {
  label: string;
  value: number | string;
  caption?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        <Loadable loading={loading} placeholder="0,000">
          {value}
        </Loadable>
      </p>
      {/* Reserved whether or not there is a caption, so a four-up row cannot
          end up with one taller cell. */}
      <p className="mt-0.5 min-h-4 text-[11px] text-subtle-foreground">
        {loading ? null : caption}
      </p>
    </div>
  );
}

/**
 * A distribution as labelled bars.
 *
 * `loading` is a state of the LIST, not a reason to replace it: the pending
 * rows are the REAL row's boxes — a `text-sm` label line and an 8px track
 * inside `space-y-1.5`, stacked on `space-y-3` — so the panel's height is
 * produced by the same layout either way and the card cannot resize when the
 * counts land.
 *
 * The bar widths are plain CSS. They used to be a framer `initial={{width:0}}`
 * tween, which meant every bar on the page re-grew from zero on each 30-second
 * poll — and `width` is the one property that cannot be composited, so it was
 * also a layout pass per frame per bar.
 */
function DistributionBars({
  rows,
  rowCount,
  loading,
  emptyLabel,
}: {
  rows: { key: string; label: string; fill: string; count: number }[];
  rowCount: number;
  loading: boolean;
  emptyLabel: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  /* The EMPTY state, named. `loading` is in it only to stop "No data" being
     asserted about a request that has not answered — this is a leaf and has no
     other way to tell the two apart. */
  if (!loading && rows.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {loading
        ? Array.from({ length: rowCount }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  <SkeletonText chars={9} />
                </span>
                <span className="font-mono text-xs">
                  <SkeletonText placeholder="00 (00%)" />
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3" />
            </div>
          ))
        : rows.map((row) => {
            const share = total > 0 ? (row.count / total) * 100 : 0;
            return (
              <div key={row.key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-xs tabular-nums">
                    {row.count} ({share.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn("h-full rounded-full", row.fill)}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
