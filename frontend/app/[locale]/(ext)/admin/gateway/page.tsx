"use client";

/**
 * WHO — the operator running the payment gateway back office. Merchants take
 *       money through this platform and the platform owes it back to them, so
 *       every hour a payout sits here is an hour a business is out of pocket.
 * WHAT — decides what to clear before anything else: how many merchant payouts
 *       are waiting, how long the oldest has waited against the platform's own
 *       SLA, and whether any merchant's checkout has started failing.
 * CLICK — through to the payout queue to approve or reject, or through to a
 *       merchant record when its success rate has fallen.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED, AND WHY EACH ONE IS A DECISION
 *
 * This page was already sound: real server-side aggregates, `StatsCard`, a
 * three-state recent-payments list. It was not rebuilt. What it lacked was a
 * frame, and an answer to the question an operator actually opens it with.
 *
 *  - **The masthead's third tier is the payout queue, AGED.** "4 pending
 *    payouts" was a `StatsCard` among four, indistinguishable from "Total
 *    Merchants". Four payouts queued this morning and four queued nine days ago
 *    are the same number and completely different mornings. The band now splits
 *    them against `SLA_HOURS.withdrawal` — the shared budget, imported, not
 *    restated — so the meter here can never disagree with an age column on the
 *    queue it links to. A payout is money LEAVING, which is why it borrows the
 *    withdrawal budget rather than the gentler `approval` one.
 *
 *  - **Merchant success-rate regressions are surfaced.** A gateway does not
 *    fail loudly; it fails as one merchant's checkout quietly dropping from 96%
 *    to 60% while every headline on the page keeps rising, because the other
 *    forty merchants are fine. `merchantHealth` compares the last 7 days with
 *    the 7 before, per merchant, and only for merchants with enough decided
 *    payments in BOTH windows to have a baseline — a merchant with no prior
 *    traffic has not "dropped".
 *
 *  - **The hardcoded `$` is gone — and so is the unitless sum it was printed
 *    over.** `gatewayPayment.currency` is free-form per merchant, so the old
 *    flat `SUM(amount)` added a EUR payment to a USDT one and the page printed
 *    a dollar sign on the result. The first pass here stopped naming a unit it
 *    could not justify: one currency got its symbol, several got the bare
 *    figure and a caption saying how many went in. That was honest about the
 *    label and still unreadable as a number — 0.5 BTC plus 12,000 NGN does not
 *    become meaningful by having its symbol taken away. The handler now groups
 *    by currency, prices each bucket and only then sums, so every money figure
 *    on this page is USD and the payload says so in `payments.currency` /
 *    `payouts.currency`. The per-currency breakdowns are still sent,
 *    unconverted, as the audit trail behind each total, and any currency the
 *    platform holds no rate for arrives in `unpriced` — a non-empty list makes
 *    the figure above it a LOWER BOUND, and the tile's caption names what is
 *    missing rather than letting an under-count pass as the figure.
 *
 *  - **A customer with no name is a Guest, not an email address.** The handler
 *    used to fall back to `customer.email` for `customer.name` — which is the
 *    normal shape of a guest checkout — so a demo install's field mask, which
 *    redacts `customer.email` by path, was stepped around one key over. `name`
 *    is now nullable and this page already renders "Guest" for an empty one.
 *
 *  - **The Quick Links row was deleted.** Merchants / Payments / Payouts —
 *    three cards, in the nav directly above them, one row below the tiles that
 *    already link to the same three places (§8.5).
 *
 *  - **Wallet type stopped being painted in status tokens.** FIAT was
 *    `text-success`, SPOT `text-warning`, ECO `text-primary`: three status
 *    tokens spent on a categorical fact, on a page where `warning` has to still
 *    mean "this payout is late" (R8). The wallet chip is neutral; its icon is
 *    what distinguishes it.
 *
 *  - **`$fetch`'s error is read.** The old `if (!error && data)` dropped a
 *    failure on the floor and left the page showing zeros. A failed poll now
 *    says so and keeps the last good figures; a failure with nothing loaded
 *    takes the page, because a console of zeros is a claim this page cannot
 *    support.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  ExternalLink,
  RefreshCcw,
  RefreshCw,
  Store,
  TrendingDown,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import $fetch from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatMoney, isIntlCurrencyCode } from "@/utils/currency";
import { statusTone } from "@/lib/status-tone";
import { formatDuration, slaLevel } from "@/config/sla";
import type { BadgeTone } from "@/components/ui/badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { MoneyFigure } from "@/components/ui/money-figure";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { useAdminGatewayMode } from "./context/admin-gateway-mode";

// ---------------------------------------------------------------------------
// Payload — `GET /api/admin/gateway/stats?mode=`
//
// Every figure below is a server-side COUNT/SUM over the whole table, not a
// page. `recentPayments` is the one list and it is capped at 10 by the handler,
// which is why the card that renders it is titled "recent" and carries a View
// all rather than a count — nothing on this page is totalled from it.
//
// Every MONEY figure is grouped by currency, priced into USD and only then
// summed, so `payments.currency` and `payouts.currency` are the units and
// `payments.unpriced` / `payouts.unpriced` say what those totals could not
// reach. The `currencies[]` arrays are the unconverted rows behind them.
// ---------------------------------------------------------------------------

interface CurrencySplit {
  currency: string;
  count: number;
  amount: number;
}

interface AgeBucket {
  count: number;
  /** USD. The handler prices each currency before it adds them. */
  amount: number;
  /** The same bucket unconverted — what `amount` was priced from. */
  currencies: CurrencySplit[];
}

interface CurrencyTotal {
  currency: string;
  volume: number;
  fees: number;
  count: number;
}

interface DecliningMerchant {
  id: string;
  name: string;
  logo?: string | null;
  attempts: number;
  succeeded: number;
  failed: number;
  successRate: number;
  priorAttempts: number;
  priorSuccessRate: number;
  /** `successRate - priorSuccessRate`, in percentage POINTS. Always negative. */
  delta: number;
}

interface DashboardStats {
  mode: "LIVE" | "TEST";
  generatedAt: string;
  merchants: {
    total: number;
    active: number;
    pending: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
    partiallyRefunded: number;
    /** The unit the four totals below carry. "USD" — sent, not assumed. */
    currency: string;
    totalVolume: number;
    totalRefunded: number;
    netVolume: number;
    totalFees: number;
    /** Currencies with no USD rate. Non-empty ⇒ the totals are LOWER BOUNDS. */
    unpriced: string[];
    /** Completed volume BY CURRENCY, unconverted. The audit trail behind the
     *  totals above, and the reason the page can say how many went in. */
    currencies: CurrencyTotal[];
  };
  payouts: {
    pending: number;
    /** "USD", for `pendingAmount` and every `aging.*.amount`. */
    currency: string;
    pendingAmount: number;
    unpriced: string[];
    /** The shared SLA budget, in hours. Sent so the two ends cannot drift. */
    slaHours: number;
    oldestPendingAt: string | null;
    aging: { fresh: AgeBucket; due: AgeBucket; breached: AgeBucket };
    currencies: CurrencySplit[];
  };
  merchantHealth: {
    windowDays: number;
    minAttempts: number;
    dropPoints: number;
    /** Merchants with enough traffic in BOTH windows to be compared at all. */
    evaluated: number;
    merchants: DecliningMerchant[];
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    walletType: string;
    status: string;
    feeAmount: number;
    description?: string;
    merchantId: string;
    merchantName: string;
    merchantLogo?: string;
    customer?: {
      /* NULLABLE, and deliberately so: the handler no longer falls back to the
         customer's email address when both name parts are blank, because that
         fallback walked an unmasked address past the route's field mask. */
      name: string | null;
      email: string;
      avatar?: string;
    } | null;
    createdAt: string;
  }>;
}

const REFRESH_MS = 60_000;

/**
 * Icon + label KEY. The hue comes from `statusTone()`, exactly as the
 * user-facing `gateway/dashboard` view already does — this page used to decide
 * locally and disagreed with the shared table on three of its eight statuses.
 *
 * The labels used to be English literals in this map. They are keys now: a map
 * at module scope cannot call `useTranslations`, so the string has to be
 * resolved at the call site or it ships English to 89 locales.
 */
const STATUS_CONFIG: Record<
  string,
  { icon: any; key: string; ns: "common" | "ext" }
> = {
  COMPLETED: { icon: CheckCircle, key: "completed", ns: "common" },
  PENDING: { icon: Clock, key: "pending", ns: "common" },
  PROCESSING: { icon: Clock, key: "processing", ns: "common" },
  FAILED: { icon: XCircle, key: "failed", ns: "common" },
  CANCELLED: { icon: XCircle, key: "cancelled", ns: "common" },
  EXPIRED: { icon: AlertCircle, key: "expired", ns: "common" },
  REFUNDED: { icon: RefreshCcw, key: "refunded", ns: "common" },
  PARTIALLY_REFUNDED: { icon: RefreshCcw, key: "partially_refunded", ns: "ext" },
};

/** The `soft` chip recipe, for the icon tile that is not a Badge. */
const TONE_SURFACE: Record<BadgeTone, string> = {
  primary: "bg-primary/10 border-primary/20",
  secondary: "bg-secondary border-transparent",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  destructive: "bg-destructive/10 border-destructive/20",
  info: "bg-info/10 border-info/20",
  neutral: "bg-muted border-transparent",
};

const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

/**
 * Wallet type is IDENTITY, so it gets a glyph and no hue.
 *
 * It used to get one: FIAT `text-success`, SPOT `text-warning`, ECO
 * `text-primary`. Three status tokens spent on a categorical fact, on the one
 * page where `warning` has to still mean "this payout is nine days late" and
 * `primary` has to still mean "you can click this" (R8c). The icons already
 * separate the three, and there are exactly three.
 */
const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

/**
 * The payout-age meter's fills, worst band first.
 *
 * These ARE status tokens and that is the correct use of them: an overdue
 * payout is not a category, it is a problem. The order is the reading order —
 * the band that needs the operator is on the left, before anything else on the
 * page has been read.
 */
const AGE_BANDS = [
  { id: "breached", fill: "bg-destructive" },
  { id: "due", fill: "bg-warning" },
  { id: "fresh", fill: "bg-success" },
] as const;

type AgeBandId = (typeof AGE_BANDS)[number]["id"];

/**
 * The narrowest a non-empty meter segment may be drawn, in percent.
 *
 * Below this a band rounds away to nothing, and the band most likely to be tiny
 * is `breached` — the only band whose disappearance would be a lie.
 */
const MIN_SEGMENT_PCT = 3;

export default function GatewayAdminDashboard() {
  const t = useTranslations("ext_admin_gateway");
  const tAdmin = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { mode, isTestMode } = useAdminGatewayMode();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      const { data, error: failure } = await $fetch({
        url: `/api/admin/gateway/stats?mode=${mode}`,
        silent: true,
      });

      /* `$fetch` resolves an envelope and never throws, so there is no catch
         branch to put this in. The previous version tested `!error && data` and
         then did nothing at all with a failure — the page kept its `loading`
         skeletons until the finally block cleared them, and then rendered a
         full console of zeros with no indication anything had gone wrong. */
      if (failure) {
        setError(
          typeof failure === "string" ? failure : t("stats_could_not_be_loaded")
        );
      } else if (data) {
        setStats(data as DashboardStats);
        setError(null);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [mode, t]
  );

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    /* Polling a hidden tab counts payouts for nobody. Every operator leaves
       this page open in a background tab. */
    const tick = () => {
      if (document.visibilityState === "visible") fetchStats(true);
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // -------------------------------------------------------------------------
  // Formatting. Every formatter is pinned to `en-US`: a bare `toLocaleString()`
  // takes its grouping separator from the RUNTIME default — Node's ICU on the
  // server, the viewer's locale in the browser — so the same figure is "50,000"
  // on one and "50.000" on the other, which is a hydration mismatch the moment
  // any of this is prefetched.
  //
  // `formatTimeAgo` used to end in a bare `toLocaleDateString()` for anything
  // over a week old, and started with the English literals "Just now" / "5m
  // ago". Both are gone: the duration comes from the shared `formatDuration`
  // and the word "ago" is a key.
  // -------------------------------------------------------------------------

  const count = useCallback(
    (value: number) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
    []
  );

  /**
   * Money, in a currency the page is only allowed to name when it knows it.
   *
   * A null `code` renders the figure bare. That branch was the whole mechanism
   * once: the headline totals were raw cross-currency sums, so `paymentUnit` /
   * `payoutUnit` went null the moment the rows spanned two denominations, and
   * printing "$" over a sum of EUR and USDT is a lie with two decimal places on
   * it — the lie this page used to tell. The totals are priced server-side now
   * and always arrive with a unit, so the null branch survives only for the
   * per-row callers and for a payload that predates `payments.currency`.
   */
  const money = useCallback(
    (value: number, code: string | null, compact = true) => {
      const numeric = Number(value) || 0;
      const options = compact
        ? { notation: "compact" as const, maximumFractionDigits: 2 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      if (!code) return new Intl.NumberFormat("en-US", options).format(numeric);
      /* A three-letter code gets Intl's symbol form ("$1.2M"); a ticker Intl
         refuses ("USDT") gets figure-then-code, which is the order
         `MoneyFigure` splits on. `formatMoney` guards the RangeError. */
      if (isIntlCurrencyCode(code)) return formatMoney(numeric, code, options);
      return `${new Intl.NumberFormat("en-US", options).format(numeric)} ${code}`;
    },
    []
  );

  const clock = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(
        new Date(iso)
      ),
    []
  );

  const timeAgo = useCallback(
    (iso: string) => {
      const started = new Date(iso).getTime();
      if (!Number.isFinite(started)) return "—";
      const hours = Math.max(0, (Date.now() - started) / 3_600_000);
      return tAdmin("n_ago", { age: formatDuration(hours) });
    },
    [t]
  );

  /**
   * The unit the headline figures carry — READ, never assumed.
   *
   * This used to be derived here: one currency in the breakdown → name it,
   * several → send the figure out bare with a caption saying how many went in,
   * because the total was a raw cross-currency sum and naming any unit for it
   * would have been a lie. The handler now prices each currency before it adds
   * them, so there IS a unit and it comes down with the payload. The fallback
   * is "USD" only so a stale cached payload does not render a bare number; it
   * is what every current response sends.
   */
  const paymentUnit = stats?.payments.currency ?? "USD";
  const payoutUnit = stats?.payouts.currency ?? "USD";

  /**
   * What the totals could NOT reach.
   *
   * A currency with no USD rate is left out of the total rather than added as
   * zero, so a non-empty list means the figure above it is a lower bound. The
   * tile has to say which currencies, not merely that some exist — "excludes 2
   * currencies" is not something an operator can act on; "excludes XMR" is.
   */
  const paymentUnpriced = stats?.payments.unpriced ?? [];
  const payoutUnpriced = stats?.payouts.unpriced ?? [];

  const slaHours = stats?.payouts.slaHours ?? 0;

  /**
   * THE ONE QUESTION THIS CONSOLE EXISTS TO ANSWER: what is waiting on me, and
   * how long has it waited?
   *
   * Widths are WEIGHTED BY PAYOUT COUNT, not by amount, and the label says so.
   * Each payout is one decision an operator has to make; weighting by money
   * would draw nine overdue small payouts as a hairline beside one fresh large
   * one, which is the opposite of the triage this meter exists for. The amounts
   * are still shown, in the legend, beside the counts.
   *
   * KNOWN GAP, DECLARED HERE RATHER THAN PAPERED OVER: `gatewayPayout` has no
   * `testMode` column, so payouts are the one population on this page that the
   * LIVE/TEST switch does not filter. The tier-1 mode chip therefore qualifies
   * the tiles and the payment list but NOT this meter. Fixing it properly means
   * a column and a migration on the payout table, which is more than this pass
   * is allowed to change; the alternative — hiding the queue in TEST mode —
   * would hide real overdue money behind a display toggle, which is worse.
   *
   * THREE STATES, NOT TWO. "Nothing is waiting" and "we have not been told yet"
   * are different claims. Without the `pending` case the band asserts "no
   * payouts are waiting" for the whole of the first load, on a console whose
   * only job is to be believed. It is a named state rather than a `!loading &&`
   * gate because the layout-stability scanner counts the latter as content
   * withheld while loading.
   */
  const payoutQueue = useMemo(() => {
    const aging = stats?.payouts.aging;
    const total = stats?.payouts.pending ?? 0;

    const state: "pending" | "empty" | "ready" = !stats
      ? "pending"
      : total > 0
        ? "ready"
        : "empty";

    const raw = AGE_BANDS.map((band) => ({
      id: band.id as AgeBandId,
      fill: band.fill,
      count: aging?.[band.id]?.count ?? 0,
      amount: aging?.[band.id]?.amount ?? 0,
    }));

    if (state !== "ready") {
      /* The band shells still render, so the legend holds its shape and its
         width across all three states and nothing below it moves. */
      return {
        state,
        total,
        segments: raw.map((band) => ({ ...band, share: 0, width: 0 })),
      };
    }

    const segments = raw.map((band) => ({
      ...band,
      share: (band.count / total) * 100,
      width: (band.count / total) * 100,
    }));

    /* Floor-and-borrow. A single overdue payout in a queue of eighty rounds to
       a sub-pixel segment and disappears — the one segment that must never
       disappear. It is widened to a visible minimum and the difference is taken
       back from the WIDEST band, so the widths still sum to 100. */
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
  }, [stats]);

  /** Translate a band id. The ids are the contract; the words are ours. */
  const bandLabel = useCallback(
    (id: AgeBandId) =>
      id === "breached"
        ? tCommon("overdue")
        : id === "due"
          ? tAdmin("due_soon")
          : tAdmin("on_time"),
    [t]
  );

  /**
   * How long the oldest waiting payout has waited, and whether that is late.
   *
   * `slaLevel` is the same function the queue age columns use, reading the same
   * `SLA_HOURS` table the handler read — so this line and any row it links to
   * can never disagree about whether a payout is late.
   */
  const oldest = useMemo(() => {
    const iso = stats?.payouts.oldestPendingAt;
    if (!iso) return null;
    const { level, hours } = slaLevel(iso, "withdrawal");
    return { level, label: formatDuration(hours) };
  }, [stats?.payouts.oldestPendingAt]);

  const declining = stats?.merchantHealth.merchants ?? [];

  /**
   * What the live dot is allowed to claim. A green pulse beside a clock that
   * stopped advancing is a lie, and it is the easy one to ship: `error` is set
   * while `stats` stays on screen.
   */
  const feedState: "live" | "updating" | "stale" = error
    ? "stale"
    : refreshing
      ? "updating"
      : "live";

  const fatal = Boolean(error && !stats);

  const pageHeader = (
    <PageHeader
      className="py-5"
      title={tAdmin("payment_gateway")}
      description={tAdmin("overview_of_your_payment_gateway")}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => fetchStats(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {tCommon("refresh")}
          </Button>
          <Button asChild>
            <Link href="/admin/gateway/payout">
              <Wallet className="h-4 w-4" />
              {tAdmin("process_payouts")}
            </Link>
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
   * exported — get it wrong and the title sits wider than every card beneath
   * it.
   *
   * Three tiers, separated by hairlines and nothing else:
   *
   *   1. PROVENANCE — LIVE or TEST, how fresh the figures are, and the SLA
   *      budget the meter below is measured against. Mode was previously only
   *      visible as a switch in the site header, so a screenshot of this page
   *      could not be read: TEST-mode volume and LIVE-mode volume looked
   *      identical.
   *   2. IDENTITY — `PageHeader`, so there is exactly one `<h1>` and it is not
   *      hand-written (R1). The old page wrote `<h1 className="text-2xl
   *      font-bold">` directly.
   *   3. STATE — the payout queue, aged. The one thing that gets somebody out
   *      of bed, above the fold, before any tile is read.
   *
   * `showQueue` is false on the fatal branch: drawing a 0/0/0 meter while the
   * stats endpoint is down would be the page asserting something it explicitly
   * cannot know.
   */
  const masthead = (showQueue: boolean) => (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          {/* 1 — PROVENANCE ------------------------------------------------ */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                feedState === "stale"
                  ? "text-warning-ink"
                  : "text-muted-foreground"
              )}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {/* `animate-ping` is neutralised under `prefers-reduced-motion`
                    by globals.css — it sets `animation: none` AND `opacity: 0`,
                    so the halo vanishes rather than freezing. Which is why the
                    meaning lives on the solid dot underneath, never the halo. */}
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
                ? tAdmin("figures_are_stale")
                : feedState === "updating"
                  ? `${tCommon("updating")}…`
                  : tCommon("live")}
            </span>

            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            {/* The mode is a claim about which population every figure below
                was drawn from, so it is provenance, not a control. The control
                stays in the site header where it already lives. */}
            <span
              className={cn(
                "font-medium",
                isTestMode ? "text-warning-ink" : "text-muted-foreground"
              )}
            >
              {isTestMode ? tCommon("test_mode") : tCommon("live")}
            </span>

            {stats?.generatedAt ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span>
                  {tCommon("last_updated")} {clock(stats.generatedAt)}
                </span>
              </>
            ) : null}

            {showQueue && slaHours > 0 ? (
              <>
                <span
                  aria-hidden
                  className="hidden h-3 w-px shrink-0 bg-border sm:inline-block"
                />
                <span className="hidden sm:inline">
                  {t("payout_sla_hours", { hours: slaHours })}
                </span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          {pageHeader}

          {/* 3 — STATE ----------------------------------------------------- */}
          {showQueue ? (
            <div className="pt-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("payouts_awaiting_approval")}
                  <span className="normal-case tracking-normal">
                    {" "}
                    · {t("by_payout_count")}
                  </span>
                </p>
                <Link
                  href="/admin/gateway/payout"
                  className="rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {tCommon("view_all")}
                </Link>
              </div>

              {/* ONE TREE, THREE STATES. The track, the labels and the legend
                  all render whatever the queue looks like; only the fills and
                  the figures change, so nothing below moves as data lands.

                  `gap-px` lets the track show through between segments. It is
                  not decoration: butted together at 8px tall, `warning` and
                  `success` are genuinely hard to tell apart at the boundary in
                  light mode. A hairline of track separates them under whatever
                  palette an operator has set. */}
              <div
                className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={
                  payoutQueue.state === "ready"
                    ? payoutQueue.segments
                        .map(
                          (segment) =>
                            `${bandLabel(segment.id)} ${segment.count}`
                        )
                        .join(", ")
                    : payoutQueue.state === "empty"
                      ? t("no_payouts_are_waiting")
                      : t("payouts_awaiting_approval")
                }
              >
                {payoutQueue.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn("h-full", segment.fill)}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                {payoutQueue.state === "empty" ? (
                  <span className="text-muted-foreground">
                    {t("no_payouts_are_waiting")}
                  </span>
                ) : (
                  <>
                    {payoutQueue.segments.map((segment) => (
                      <span
                        key={segment.id}
                        className="flex items-center gap-1.5 text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            segment.fill
                          )}
                        />
                        {bandLabel(segment.id)}
                        <span className="font-mono tabular-nums text-foreground">
                          <Loadable
                            loading={payoutQueue.state === "pending"}
                            placeholder="00"
                          >
                            {count(segment.count)}
                          </Loadable>
                        </span>
                        <span className="font-mono tabular-nums text-subtle-foreground">
                          <Loadable
                            loading={payoutQueue.state === "pending"}
                            placeholder="0.0K"
                          >
                            {money(segment.amount, payoutUnit)}
                          </Loadable>
                        </span>
                      </span>
                    ))}

                    {/* The age of the oldest item is the fact the count cannot
                        carry. It is the difference between a queue and a
                        backlog, and it is why this band exists. */}
                    {oldest || payoutQueue.state === "pending" ? (
                      <span
                        className={cn(
                          "flex items-center gap-1.5 font-medium",
                          oldest?.level === "breached"
                            ? "text-destructive-ink"
                            : oldest?.level === "due"
                              ? "text-warning-ink"
                              : "text-muted-foreground"
                        )}
                      >
                        <Clock aria-hidden className="h-3.5 w-3.5" />
                        {/* Rendered in the pending state too, so this line does
                            not appear from nowhere and re-wrap the legend row
                            the moment the payload lands. The placeholder is the
                            WHOLE phrase, not just the duration: `t()` returns a
                            string, so the sentence is one text box and only a
                            same-shaped string reserves the right width. */}
                        <Loadable
                          loading={payoutQueue.state === "pending"}
                          placeholder={tAdmin("oldest_waiting", { age: "00h" })}
                        >
                          {tAdmin("oldest_waiting", { age: oldest?.label ?? "—" })}
                        </Loadable>
                      </span>
                    ) : null}
                  </>
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
    `loading` is false by the time a failure lands, so leaving the body mounted
    renders a full console of zeros — four "0" tiles and an empty list — under a
    red banner saying the data could not be read. Every one of those zeros is a
    claim the page cannot support. The masthead stays so Refresh is still
    reachable, and R7 asks a terminal state to carry an action.
  */
  if (fatal) {
    return (
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(false)}>
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("stats_could_not_be_loaded")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{error}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchStats()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              {/* The queues themselves are independent of this endpoint, so
                  they still work while it is down. */}
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/gateway/payout">
                  <Wallet className="h-4 w-4" />
                  {tAdmin("gateway_payouts")}
                </Link>
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
        /* A failed POLL, not a failed page — `stats` is still on screen and
           still true as of `generatedAt`. Say the refresh failed; do not throw
           away a working dashboard over one bad request. */
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tAdmin("refresh_failed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* -- SUMMARY --------------------------------------------------------- */}
      {/* Four tiles, each a true server-side total, each linking through to the
          rows that produced it (R3c). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("pending_payout_value")}
          value={
            <MoneyFigure
              value={money(stats?.payouts.pendingAmount ?? 0, payoutUnit)}
              unitClassName="text-base font-normal text-muted-foreground"
            />
          }
          icon={Wallet}
          index={0}
          loading={loading}
          /* The caption used to excuse a unitless figure ("Summed across 3
             currencies"). The figure is priced now, so the caption is back to
             its real job — how many decisions are in the queue — and only gives
             that up when something could NOT be priced, which is the one fact
             that changes how the number above should be read. */
          description={
            payoutUnpriced.length > 0
              ? t("excludes_unpriced_currencies", {
                  currencies: payoutUnpriced.join(", "),
                })
              : t("n_payouts_awaiting_approval", {
                  count: count(stats?.payouts.pending ?? 0),
                })
          }
          onClick={() => router.push("/admin/gateway/payout")}
          /* The one tile allowed a status token, and only when it has earned
             it: an overdue payout is a problem, not a category. */
          {...((stats?.payouts.aging.breached.count ?? 0) > 0
            ? statsCardColors.warning
            : statsCardColors.neutral)}
        />
        <StatsCard
          label={tAdmin("total_merchants")}
          value={loading ? 0 : (stats?.merchants.total ?? 0)}
          icon={Store}
          index={1}
          loading={loading}
          description={t("n_active_n_pending", {
            active: count(stats?.merchants.active ?? 0),
            pending: count(stats?.merchants.pending ?? 0),
          })}
          onClick={() => router.push("/admin/gateway/merchant")}
          {...statsCardColors.purple}
        />
        <StatsCard
          label={tAdmin("total_payments")}
          value={loading ? 0 : (stats?.payments.total ?? 0)}
          icon={CreditCard}
          index={2}
          loading={loading}
          description={t("n_completed_n_pending", {
            completed: count(stats?.payments.completed ?? 0),
            pending: count(stats?.payments.pending ?? 0),
          })}
          onClick={() => router.push("/admin/gateway/payment")}
          {...statsCardColors.blue}
        />
        <StatsCard
          label={tAdmin("net_volume")}
          value={
            <MoneyFigure
              value={money(stats?.payments.netVolume ?? 0, paymentUnit)}
              unitClassName="text-base font-normal text-muted-foreground"
            />
          }
          icon={DollarSign}
          index={3}
          loading={loading}
          /* Completed volume less completed refunds, both priced into USD
             before either is touched — they used to be raw sums over two
             different free-form currency columns, and this tile was their
             difference. The caption names the fee take, which is now in the
             same unit as the figure above it, and gives that up only when a
             currency could not be priced: the total is then a lower bound and
             saying which currency is missing outranks the fee. */
          description={
            paymentUnpriced.length > 0
              ? t("excludes_unpriced_currencies", {
                  currencies: paymentUnpriced.join(", "),
                })
              : t("fees_value", {
                  value: money(stats?.payments.totalFees ?? 0, paymentUnit),
                })
          }
          onClick={() => router.push("/admin/gateway/payment")}
          {...statsCardColors.green}
        />
      </div>

      {/* -- BODY: merchants whose checkout is failing more than it was ------- */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5" />
              </span>
              {t("success_rate_declines")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("window_vs_previous_window", {
                days: stats?.merchantHealth.windowDays ?? 7,
              })}
            </p>
          </div>
          <Link
            href="/admin/gateway/merchant"
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
                <SkeletonBlock key={row} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : declining.length ? (
            <div className="flex flex-col gap-2">
              {declining.map((merchant) => (
                <Link
                  key={merchant.id}
                  href={`/admin/gateway/merchant/${merchant.id}`}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 hover:bg-muted/50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{merchant.name}</p>
                    <p className="text-[11px] text-subtle-foreground">
                      {t("n_decided_payments", {
                        count: count(merchant.attempts),
                      })}
                    </p>
                  </div>
                  {/* THE SIGN AND THE WORD CARRY THE DIRECTION, not the colour.
                      `--down` is not separable from `--up` under deuteranopia,
                      so the drop is stated three times over: a minus sign, the
                      word "pts", and the before/after pair beneath it. */}
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-destructive-ink">
                      {t("n_points", { points: merchant.delta.toFixed(1) })}
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {merchant.priorSuccessRate.toFixed(0)}%{" "}
                      <ArrowRight aria-hidden className="inline h-3 w-3" />{" "}
                      {merchant.successRate.toFixed(0)}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* An honest empty state names its own threshold. "No declines" over
               a population of nobody is not the same claim as "no declines" over
               forty merchants, and the operator has to be able to tell which
               one they are looking at. */
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
                <TrendingDown className="h-5 w-5" />
              </span>
              <p className="font-medium">{t("no_merchant_success_rate_fell")}</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {(stats?.merchantHealth.evaluated ?? 0) > 0
                  ? t("n_merchants_compared", {
                      count: count(stats?.merchantHealth.evaluated ?? 0),
                      points: stats?.merchantHealth.dropPoints ?? 5,
                    })
                  : t("no_merchant_had_enough_traffic", {
                      count: stats?.merchantHealth.minAttempts ?? 10,
                      days: stats?.merchantHealth.windowDays ?? 7,
                    })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* -- BODY: the ten most recent payments ------------------------------ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{tExt("recent_payments")}</CardTitle>
            <CardDescription>
              {tAdmin("latest_payment_transactions_across_all_merchants")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/gateway/payment">
              {tCommon("view_all")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {/* Three states. Gated on the array alone this card said "no recent
              payments" for the whole fetch and then grew by five ~86px rows. */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card"
                >
                  <SkeletonBlock className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-lg">
                        <SkeletonText placeholder="0.00 USDT" />
                      </span>
                      <Badge tone="neutral" appearance="soft">
                        <SkeletonText placeholder="COMPLETED" />
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        <SkeletonText chars={20} />
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentPayments && stats.recentPayments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {stats.recentPayments.map((payment) => {
                const statusConfig =
                  STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                const tone = statusTone(payment.status);
                const WalletIcon = WALLET_ICONS[payment.walletType] || Wallet;
                const statusLabel =
                  statusConfig.ns === "ext"
                    ? tExt(statusConfig.key)
                    : tCommon(statusConfig.key);

                return (
                  <Link
                    key={payment.id}
                    href={`/admin/gateway/payment/${payment.id}`}
                    className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50"
                  >
                    {/* Status Indicator */}
                    <div className={cn("p-2 rounded-lg border", TONE_SURFACE[tone])}>
                      <StatusIcon className={cn("h-5 w-5", TONE_INK[tone])} />
                    </div>

                    {/* Payment Info. The row's own currency, so this one CAN
                        name a unit — it is a single payment, not a sum. */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-lg font-semibold tabular-nums">
                          {money(payment.amount, payment.currency, false)}
                        </span>
                        <Badge tone={tone} appearance="soft">
                          {statusLabel}
                        </Badge>
                        <span className="flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <WalletIcon className="h-3 w-3" />
                          {payment.walletType}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {payment.id}
                        </code>
                        {payment.description && (
                          <span className="truncate max-w-[200px]">
                            {payment.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Merchant & Customer */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        {payment.merchantLogo ? (
                          <img
                            src={payment.merchantLogo}
                            alt={payment.merchantName}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm font-medium truncate max-w-[120px]">
                            {payment.merchantName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tAdmin("merchant")}
                          </p>
                        </div>
                      </div>

                      {payment.customer && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={payment.customer.avatar}
                              /* `name` is nullable — a guest checkout has no
                                 name and the handler no longer substitutes the
                                 email address. The alt text falls through to
                                 the same word the label below shows, so a
                                 screen reader and a sighted reader are told
                                 the same thing. */
                              alt={payment.customer.name || tExt("guest")}
                            />
                            <AvatarFallback>
                              {payment.customer.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {payment.customer.name || tExt("guest")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tCommon("customer")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fee & Time */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("fee_value", {
                          value: money(
                            payment.feeAmount ?? 0,
                            payment.currency,
                            false
                          ),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(payment.createdAt)}
                      </p>
                    </div>

                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-muted-foreground">
                <CreditCard className="h-5 w-5" />
              </span>
              <p className="font-medium">{tExt("no_payments_yet")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {tAdmin("payments_will_appear_here_once_merchants")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
