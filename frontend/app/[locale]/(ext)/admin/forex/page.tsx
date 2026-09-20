"use client";

/**
 * WHO — the operator running the forex desk. Traders fund a forex account from
 *       their platform wallet, lock capital into a plan for a duration, and the
 *       settlement cron pays the result back out. Every one of those movements
 *       is the platform's money until it settles.
 * WHAT — decides what needs a human right now: which deposits and withdrawals
 *       are sitting unapproved and how long they have been sitting, how much
 *       capital is locked in open investments, and whether one plan is carrying
 *       the whole book.
 * CLICK — through to the deposit or withdrawal queue to approve or reject, to
 *       the investment registry to act on a specific position, or to the plan
 *       registry to change the terms that produce these outcomes.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED
 *
 * A `HeroSection` with two gradient orbs and six floating particles, under a
 * `bg-linear-to-b` page ground, over four vanity counters carrying growth
 * percentages. Below it: a six-tile "quick stats" row, a bar chart hand-built
 * from absolutely-positioned divs with a per-bar `delay: i * 0.03`, a
 * hand-rolled `<table>` with a per-row `delay: index * 0.05`, five separate
 * `motion.div` section wrappers each with its own entrance delay, and a
 * six-tile "Quick Actions" panel whose entries were Accounts, Plans,
 * Investments, Signals, Deposits and Withdrawals — six links that are already
 * in the addon nav directly above it, rendered through a local `colorMap` of
 * raw palette names.
 *
 * DESIGN NOTES THAT ARE DECISIONS, NOT TASTE
 *
 *  - **The two figures an operator loses money on were the two smallest things
 *    on the page.** `pendingDeposits` and `pendingWithdrawals` were tiles five
 *    and six of a six-up strip, below four all-time totals nobody acts on. A
 *    FOREX_WITHDRAW sitting PENDING has already debited the trader's forex
 *    account and has not credited anything anywhere — it is money in transit
 *    with a person waiting on the other end. That pair is now masthead tier 3,
 *    above every other number on the page.
 *
 *  - **Aged, not just counted.** A count answers "is there work"; it does not
 *    answer "is any of it late", and late is the only part that escalates. The
 *    age comes from a second, one-row request per queue (see
 *    `probeOldestPending`) and is scored against `config/sla.ts` — the SAME
 *    table the queue's own age column and the core health card read. A masthead
 *    that invented its own threshold could say amber where the row it links to
 *    says red.
 *
 *  - **Every money figure names its unit, and the unit comes from the PLAN.**
 *    The old page printed `$1.2M` over `SUM(forexInvestment.amount)`. That sum
 *    is real but nameless: an investment carries no currency of its own — the
 *    unit of account lives on the plan it was bought against
 *    (`forexPlan.currency`, a required column), so the sum adds 1.5 BTC to
 *    50,000 USD and publishes 50001.5. `api/(ext)/forex/utils/money.ts` solved
 *    this once for the landing page (`investedByCurrency` / `summarise`) and
 *    the dashboard handler now uses the same helper, so this page can state a
 *    figure it is able to name. The rule that follows from it, and the one to
 *    hold the line on: **nothing here divides, adds or ranks one denomination
 *    against another.** Capital shares are per pool, settled P&L is listed per
 *    pool, and the volume chart is scoped to the largest pool and says which.
 *    Pools are ORDERED by size — that is a sort, not a published quantity, and
 *    it is the same convention `summarise()` uses to pick `primaryInvested`.
 *
 *  - **The growth percentages are gone.** `investmentsGrowth`, `usersGrowth`,
 *    `plansGrowth` and `accountsGrowth` all compare month-TO-DATE against the
 *    whole of the previous month, so on the 2nd of the month every one of them
 *    reads about -95% and recovers over four weeks. A delta chip that is
 *    negative because of the calendar is worse than no delta chip. Fixing it
 *    means deciding what a month-over-month delta should compare on a desk
 *    whose positions run for weeks — a product question, not a bug — so the
 *    fields stay unrendered and absent from the interface below rather than
 *    being faked into a plausible-looking chip.
 *
 *  - **The range picker moved onto the chart it actually scopes.** `timeframe`
 *    reaches exactly one thing in the handler: the `chartData` GROUP BY. Every
 *    other figure on this page — totals, outcomes, accounts, pending counts —
 *    is all-time and does not move when the picker moves. Sitting in the page
 *    header it claimed to scope the page; on the chart's own toolbar it claims
 *    what is true, and tier 1 says "all-time totals" for the rest.
 *
 *  - **One entrance animation.** `StatsCard` staggers itself off `index` and
 *    nothing else on this page animates in.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Clock,
  CreditCard,
  History,
  Layers,
  LineChart,
  PieChart,
  RefreshCw,
  Rocket,
  Scale,
  Signal,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/currency";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loadable, Skeleton } from "@/components/ui/skeleton";
import { statusLabel, statusTone } from "@/lib/status-tone";
import { formatDuration, slaLevel, type SlaKey } from "@/config/sla";
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
import { ChartCard, SeriesChart, chartColor } from "@/components/ui/chart";

// ---------------------------------------------------------------------------
// Payload — `backend/src/api/(ext)/admin/forex/index.get.ts`
//
// Provenance of every field, because half of this file's job is not asserting
// something the handler cannot support:
//
//   totalInvestments      SUM(amount) WHERE status != 'REJECTED', ALL TIME.
//                         A true total of a NAMELESS quantity — it spans plan
//                         currencies. Deliberately absent from the interface
//                         below; `investedByCurrency` is what this page renders.
//   totalProfit           Sign-aware SUM over COMPLETED, but summed across plan
//                         currencies, so it is nameless for the same reason and
//                         is likewise absent below. `profitByCurrency` replaces
//                         it.
//   investedByCurrency    GROUP BY plan.currency over status != 'REJECTED',
//                         largest pool first. True totals, each nameable. The
//                         plan join is `required`, so an investment whose plan
//                         was deleted out from under it is excluded rather than
//                         landing in an unnamed bucket — which is the one way
//                         these can read slightly under `totalInvestments`.
//   primaryInvested       The largest pool, or null when nothing is invested.
//   mixedCurrencies       More than one pool holds capital.
//   profitByCurrency      Same grouping over COMPLETED only, and the profit
//                         column goes through `SIGNED_PROFIT_SQL`: settlement
//                         stores a signed profit TODAY, but rows written before
//                         that fix hold a loss as a POSITIVE number beside
//                         `result = 'LOSS'`, so a raw sum turns a losing book
//                         into a gain of identical size (utils/money.ts).
//   activeInvestments     COUNT(status = 'ACTIVE').  True total.
//   completedInvestments  COUNT(status = 'COMPLETED'). True total.
//   winRate               win / (win+loss+draw) over COMPLETED. True total.
//   totalAccounts         COUNT(forexAccount).       True total.
//   liveAccounts/demo     COUNT by type.             True total.
//   totalSignals/active   COUNT(forexSignal).        True total.
//   pendingDeposits       COUNT(transaction WHERE type='FOREX_DEPOSIT'
//                         AND status='PENDING').     True total.
//   pendingWithdrawals    same, FOREX_WITHDRAW.       True total.
//   activePlans           MISLABELLED: it is COUNT(id) over forexPlan with no
//                         predicate, i.e. ALL plans. Rendered here as "Plans",
//                         which is what it counts.
//   chartData             server-side GROUP BY over the selected range, JOINED
//                         to the plan and filtered to `chartCurrency` — one
//                         pool, so the bar heights are a real magnitude.
//   chartCurrency         which pool that is; null only on an empty book.
//   planDistribution      server-side GROUP BY plan, UNBOUNDED — every plan is
//                         present, so a share denominator taken from it is a
//                         true total rather than a page. It carries the plan's
//                         `currency`, which is what makes a share computable at
//                         all: the denominator is the plan's OWN pool.
//   recentInvestments     LIMIT 5. A list, never summed here. `profit` arrives
//                         sign-corrected and each row carries its plan currency.
//   topPlans              LIMIT 5. Plan CONFIGURATION (min/max amount, profit
//                         band) duplicated from the plan registry; not
//                         rendered — see `removed` in the rework notes.
//
// The growth fields are deliberately absent from this interface so nothing can
// reach for them by accident, and so are the two cross-currency scalars
// (`totalInvestments`, `totalProfit`) for exactly the same reason: both are
// arithmetically correct and neither can be named, and a field that is in scope
// is a field the next edit will headline.
// ---------------------------------------------------------------------------

interface Overview {
  activeUsers: number;
  activePlans: number;
  totalAccounts: number;
  activeInvestments: number;
  completedInvestments: number;
  winRate: number;
  liveAccounts: number;
  demoAccounts: number;
  totalSignals: number;
  activeSignals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

/** One denomination's pool. The only shape on this payload that can be named. */
interface CurrencyPool {
  currency: string;
  totalInvested: number;
  /** Sign-aware — see `SIGNED_PROFIT_SQL` in the handler. */
  totalProfit: number;
}

interface DashboardData {
  overview: Overview;
  investedByCurrency: CurrencyPool[];
  primaryInvested: CurrencyPool | null;
  mixedCurrencies: boolean;
  profitByCurrency: CurrencyPool[];
  chartCurrency: string | null;
  chartData: { name: string; value: number }[];
  planDistribution: { name: string; currency: string; value: number }[];
  investmentResults: { win: number; loss: number; draw: number };
  recentInvestments: {
    id: string;
    user: string;
    userId: string;
    plan: string;
    amount: number;
    profit: number;
    currency: string;
    date: string;
    status: string;
    result: string;
  }[];
}

const REFRESH_MS = 60_000;

/**
 * The two decision queues this desk owns, in the order money moves.
 *
 * `sla` names the budget in `config/sla.ts`, NOT a number written here. The
 * deposit and withdrawal budgets differ (72h against 7d) and that difference is
 * the platform's, shared with the queue's own age column and with the core
 * health card, so this file must never restate either value.
 */
const QUEUES = [
  {
    id: "deposit",
    icon: ArrowDownToLine,
    sla: "deposit" as SlaKey,
    href: "/admin/forex/deposit",
  },
  {
    id: "withdraw",
    icon: ArrowUpFromLine,
    sla: "withdrawal" as SlaKey,
    href: "/admin/forex/withdraw",
  },
] as const;

/**
 * Outcome fills for the win / loss / draw meter.
 *
 * These are STATES, not categories, so they take status tokens rather than ramp
 * slots — the R8(b) exception, declared here rather than derived from array
 * position. Each row also carries its own word, because `success` and
 * `destructive` are not separable under deuteranopia.
 */
const OUTCOME_FILL = {
  win: "bg-success",
  loss: "bg-destructive",
  draw: "bg-muted-foreground",
} as const;

/**
 * Capital-by-plan bars: ONE metric, so one identity colour for every row.
 *
 * The ramp and not `primary` — `primary` is reserved for things you click
 * (R8c), and these bars are read, not pressed.
 */
const PLAN_BAR_FILL = "bg-chart-1";

/** How many plans the concentration list draws before it says "+N more". */
const PLAN_ROWS = 6;

/**
 * How many currency pools the settled-P&L list draws before it says "+N more".
 *
 * There is no "and the rest" row, and there cannot be one: the remainder would
 * be a sum across denominations, which is the figure this whole panel exists to
 * avoid publishing.
 */
const PROFIT_POOLS = 3;

/** The single volume series, named rather than taken from its array index. */
const VOLUME_SERIES_COLOR = chartColor(null, 0);

/** What one probe of a queue's oldest unresolved row came back with. */
interface QueueProbe {
  /** ISO timestamp of the oldest PENDING row, or null when there is none. */
  oldest: string | null;
  /**
   * False when the list endpoint refused us. The dashboard route is gated on
   * `access.forex` while the queues are gated on `view.forex.deposit` /
   * `view.forex.withdraw`, so an operator can legitimately be allowed to see
   * the COUNT and not the rows. In that case the count still renders and the
   * age says it is unavailable — it never silently reads as "nothing is old".
   */
  available: boolean;
}

const NO_PENDING: QueueProbe = { oldest: null, available: true };

/**
 * The age of the oldest item still awaiting a decision on one queue.
 *
 * One row, not a page: `perPage=1` with `sortOrder=asc` on `createdAt` asks the
 * database for exactly the row that matters, and `pagination.totalItems` is
 * deliberately IGNORED — the count already arrived with the dashboard payload
 * as a real `COUNT(*)`, and two sources for one number is how they come to
 * disagree.
 */
async function probeOldestPending(endpoint: string): Promise<QueueProbe> {
  const filter = encodeURIComponent(JSON.stringify({ status: "PENDING" }));
  const { data, error } = await $fetch({
    url: `${endpoint}?page=1&perPage=1&sortField=createdAt&sortOrder=asc&filter=${filter}`,
    silent: true,
  });
  if (error) return { oldest: null, available: false };
  const first = (data as any)?.items?.[0];
  return { oldest: first?.createdAt ?? null, available: true };
}

export default function ForexDashboardPage() {
  const t = useTranslations("ext_admin_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * The last failure, if any — `null` while the feed is healthy.
   *
   * A WRAPPER around the message rather than the message itself, because the
   * envelope's `error` is not always a string and the fallback wording has to
   * come from `useTranslations` at RENDER time. Storing an English default in
   * state is how a page ends up shipping one hardcoded sentence to 90 locales.
   */
  const [failure, setFailure] = useState<{ message: string | null } | null>(
    null
  );
  const [timeframe, setTimeframe] = useState("1y");

  /**
   * Which range the data ON SCREEN was fetched for.
   *
   * The chart's own loading state is `loadedRange !== timeframe`, which is
   * exact: it is true from the moment the picker moves until the matching
   * payload lands, and false during the 60-second poll, which re-fetches the
   * SAME range and must not blank the plot every minute.
   */
  const [loadedRange, setLoadedRange] = useState<string | null>(null);

  /**
   * When the browser received the payload.
   *
   * The handler sends no `generatedAt`, so this is the client's receive time
   * rather than the server's generation time. Those are milliseconds apart and
   * the label says "last updated", which is true of both — but it is a
   * different claim from the one the futures console makes, so it is written
   * down rather than assumed.
   */
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [queue, setQueue] = useState<{
    state: "pending" | "ready";
    deposit: QueueProbe;
    withdraw: QueueProbe;
  }>({ state: "pending", deposit: NO_PENDING, withdraw: NO_PENDING });

  /* Read inside the interval callback without making the interval depend on it,
     so a poll landing mid-render cannot restart the timer. */
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  const fetchDashboard = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    const range = timeframeRef.current;

    const { data: payload, error } = await $fetch({
      url: `/api/admin/forex?timeframe=${range}`,
      silent: true,
    });

    /* `$fetch` resolves an envelope and never throws, so there is no catch
       branch to put this in — the previous version wrapped the call in a
       try/catch that could not fire, and then fell through to rendering an
       empty dashboard on every failure. */
    if (error) {
      setFailure({ message: typeof error === "string" ? error : null });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const next = payload as DashboardData;
    setData(next);
    setLoadedRange(range);
    setFetchedAt(new Date().toISOString());
    setFailure(null);
    setLoading(false);
    setRefreshing(false);

    /*
      The ages are a SECOND round trip, on purpose, and only when there is
      something to age. A queue at zero is not queried at all, so a quiet desk
      costs exactly one request per poll; a busy one costs three. Resolving the
      page on the first response and letting the ages land after keeps the whole
      dashboard from waiting on two list endpoints it does not otherwise need.
    */
    const overview = next?.overview;
    const [deposit, withdraw] = await Promise.all([
      (overview?.pendingDeposits ?? 0) > 0
        ? probeOldestPending("/api/admin/forex/deposit")
        : Promise.resolve(NO_PENDING),
      (overview?.pendingWithdrawals ?? 0) > 0
        ? probeOldestPending("/api/admin/forex/withdraw")
        : Promise.resolve(NO_PENDING),
    ]);
    setQueue({ state: "ready", deposit, withdraw });
  }, []);

  useEffect(() => {
    /* `background` is true even on the very first call: `loading` already
       governs the skeletons, and this only decides whether the Refresh button
       spins. Nothing here re-blanks a loaded page. */
    fetchDashboard(true);
  }, [timeframe, fetchDashboard]);

  useEffect(() => {
    /* Polling a hidden tab runs three queries for nobody. Every operator leaves
       this page open in a background tab; the previous version kept a 60-second
       refetch running in each one for as long as the browser lived. */
    const tick = () => {
      if (document.visibilityState === "visible") fetchDashboard(true);
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const overview = data?.overview;
  const results = data?.investmentResults ?? { win: 0, loss: 0, draw: 0 };
  const settledOutcomes = results.win + results.loss + results.draw;

  /**
   * The named pools. `primaryInvested` is the largest one and is the ONLY
   * invested figure on this page that carries a symbol on its own.
   */
  const primaryPool = data?.primaryInvested ?? null;
  const capitalPools = data?.investedByCurrency ?? [];
  const mixedCurrencies = Boolean(data?.mixedCurrencies);
  /** Settled P&L per pool, sign-aware at the database. Never summed here. */
  const profitPools = (data?.profitByCurrency ?? []).filter(
    (pool) => pool.currency
  );
  /** The pool the volume series is scoped to; "" only on an empty book. */
  const chartCurrency = data?.chartCurrency ?? "";

  // -------------------------------------------------------------------------
  // Formatting — every one of these pins "en-US".
  //
  // A bare `toLocaleString()` takes its grouping separator from the RUNTIME
  // default: Node's ICU on the server, the viewer's locale in the browser. The
  // same figure comes out "50,000" on one and "50.000" on the other, which is a
  // hydration mismatch the moment any of this payload is prefetched. Cheaper to
  // pin it than to remember why it is currently safe.
  //
  // MONEY GOES THROUGH `formatMoney`, NEVER THROUGH `Intl` DIRECTLY. Forex
  // plan currencies are free-text tickers, and `Intl` throws a RangeError on
  // any code that is not exactly three letters — `USDT` takes the whole page to
  // the error boundary DURING RENDER, where no `onError` can catch it.
  // `formatMoney` falls back to `USDT 5,000.50` for those.
  //
  // Every call site passes a currency that came from the row it is formatting.
  // If you find yourself reaching for a page-level default here, the figure you
  // are about to print spans pools and should not be printed at all.
  // -------------------------------------------------------------------------

  const count = useCallback(
    (value: number) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
    []
  );

  const money = useCallback(
    (value: number, currency: string, compact = true) => {
      /* Annotated rather than inlined so `notation: "compact"` narrows to the
         literal type `Intl` expects instead of widening to `string`. */
      const options: Intl.NumberFormatOptions = compact
        ? { notation: "compact", maximumFractionDigits: 2 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      return formatMoney(Number(value) || 0, currency, options);
    },
    []
  );

  /**
   * Direction carried by a SIGN, so it does not depend on colour (R8).
   *
   * Written by hand rather than with `signDisplay`, to match the rest of the
   * platform and to keep the glyph in front of the symbol on every runtime.
   */
  const signedMoney = useCallback(
    (value: number, currency: string) => {
      const numeric = Number(value) || 0;
      return `${numeric >= 0 ? "+" : "-"}${money(Math.abs(numeric), currency)}`;
    },
    [money]
  );

  /**
   * The "last updated" clock, in the VIEWER's zone.
   *
   * The zone is genuinely right here — an operator wants the time on their own
   * wall — so it is the LOCALE that gets pinned. The value never reaches the
   * server pass because `fetchedAt` only exists after a client fetch.
   */
  const clock = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat("en-US", { timeStyle: "medium" }).format(
        new Date(iso)
      ),
    []
  );

  const rangeLabel =
    timeframe === "1m"
      ? tCommon("last_30_days")
      : timeframe === "3m"
        ? tExtAdmin("last_3_months")
        : tExtAdmin("last_12_months");

  /**
   * The two decision queues, resolved against the SLA table.
   *
   * `level` is `fresh | due | breached` from `config/sla.ts` and is rendered
   * with exactly the ink the queue's own age cell uses — `destructive-ink` past
   * the budget, `warning-ink` past half of it. The masthead and the row it
   * links to therefore cannot disagree about whether something is late.
   */
  const queueRows = useMemo(() => {
    const probes: Record<string, QueueProbe> = {
      deposit: queue.deposit,
      withdraw: queue.withdraw,
    };
    const counts: Record<string, number> = {
      deposit: overview?.pendingDeposits ?? 0,
      withdraw: overview?.pendingWithdrawals ?? 0,
    };
    return QUEUES.map((definition) => {
      const probe = probes[definition.id];
      const pending = counts[definition.id];
      const scored = probe.oldest ? slaLevel(probe.oldest, definition.sla) : null;
      /* Still waiting on an answer: either the first probe pass has not run, or
         the count moved above zero on a poll and this queue's probe is in
         flight. Both are "not known yet", not "nothing to report". */
      const ageLoading =
        queue.state === "pending" ||
        (pending > 0 && probe.available && !probe.oldest);
      return { ...definition, pending, probe, scored, ageLoading };
    });
  }, [overview, queue]);

  const pendingTotal = queueRows.reduce((sum, row) => sum + row.pending, 0);

  /**
   * THREE STATES, NOT TWO.
   *
   * "Nothing is waiting on you" and "we have not been told yet" are different
   * claims, and on a console whose whole job is to be believed the difference
   * has to be visible: without the `pending` case the masthead asserts an all
   * clear for the entire first load. It is a named state rather than a
   * `!loading &&` gate because the layout-stability scanner counts the latter as
   * content withheld while loading.
   */
  const queueState: "pending" | "waiting" | "clear" = !data
    ? "pending"
    : pendingTotal > 0
      ? "waiting"
      : "clear";

  /**
   * Where the book's capital sits, by plan — WITHIN each denomination.
   *
   * Two properties have to hold at once here, and the first version held only
   * one of them:
   *
   *  - The denominator is a TRUE TOTAL. `planDistribution` is an unbounded
   *    `GROUP BY` over every plan, with no `limit` in the handler, so reducing
   *    it in the browser sums the whole population rather than a page. Only the
   *    DISPLAY is capped, and the cap is stated in the UI.
   *  - The denominator is the SAME UNIT as the numerator. Each row is one plan
   *    and therefore one currency, so a single reduce across every row produced
   *    a BTC-over-USD quotient: with 1.5 BTC in plan A and 50,000 USD in plan
   *    B, plan B "held 100% of all invested capital" and A's bar drew at zero.
   *    A plan's share is its share of ITS OWN pool, and each pool is labelled.
   *
   * Pools are ordered by size, which is a sort and not a published quantity —
   * the same ordering `summarise()` uses to choose `primaryInvested`. The
   * display budget is spent from the largest pool down.
   */
  const planConcentration = useMemo(() => {
    const plans = (data?.planDistribution ?? []).filter(
      (plan) => plan.value > 0
    );

    const totals = new Map<string, number>();
    for (const plan of plans) {
      totals.set(plan.currency, (totals.get(plan.currency) ?? 0) + plan.value);
    }
    const ordered = [...totals.entries()].sort((a, b) => b[1] - a[1]);

    let budget = PLAN_ROWS;
    const pools = ordered
      .map(([currency, total]) => {
        const rows = plans
          .filter((plan) => plan.currency === currency)
          .sort((a, b) => b.value - a.value)
          .slice(0, Math.max(0, budget))
          .map((plan) => ({
            ...plan,
            share: total > 0 ? (plan.value / total) * 100 : 0,
          }));
        budget -= rows.length;
        return { currency, total, rows };
      })
      .filter((pool) => pool.rows.length > 0);

    const lead = pools[0]?.rows[0] ?? null;
    return {
      pools,
      mixed: ordered.length > 1,
      hidden: Math.max(0, plans.length - (PLAN_ROWS - budget)),
      lead,
    };
  }, [data?.planDistribution]);

  /**
   * The volume series.
   *
   * `xIsDate={false}` is load-bearing. The handler sends BUCKET LABELS, not
   * dates — "Jan", "17", "2026-31" — and the chart kit's date coercion reads
   * `"Week 12"` as December 1st, so a lenient parse here would silently
   * reorder and mislabel the axis.
   */
  const volumeSeries = useMemo(
    () => [
      {
        key: "value",
        label: tCommon("invested"),
        color: VOLUME_SERIES_COLOR,
      },
    ],
    [tCommon]
  );

  /** `2026-31` is an ISO year-week bucket; the year is noise on an axis tick. */
  const formatBucket = useCallback(
    (value: any) => {
      const label = String(value ?? "");
      const week = /^\d{4}-(\d{2})$/.exec(label);
      return week ? t("week_abbrev", { week: Number(week[1]) }) : label;
    },
    [t]
  );

  /* A failed poll must not wipe an already-loaded dashboard — only take the
     page over when there is genuinely nothing to show. */
  const fatal = Boolean(failure && !data);

  /** The failure text, with the translated fallback applied at render time. */
  const failureMessage = failure
    ? (failure.message ?? tExt("failed_to_load_dashboard"))
    : null;

  /**
   * What the live dot is allowed to claim.
   *
   * A green pulse beside a clock that stopped advancing is a lie, and it is the
   * easy one to ship: `failure` is set while `data` stays on screen, so without
   * this the dot would read "Live" directly above the refresh-failed notice.
   */
  const feedState: "live" | "updating" | "stale" = failure
    ? "stale"
    : refreshing
      ? "updating"
      : "live";

  const pageHeader = (
    <PageHeader
      className="py-5"
      title={tExt("forex_dashboard")}
      description={t("forex_dashboard_description")}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => fetchDashboard(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {tCommon("refresh")}
          </Button>
          <Button onClick={() => router.push("/admin/forex/plan")}>
            <Rocket className="h-4 w-4" />
            {tExtAdmin("manage_plans")}
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
   * wrapper repeats PageShell's own container string verbatim
   * (`mx-auto w-full px-4 container`) because `containerVariants` is not
   * exported — get it wrong and the title sits wider than every card beneath
   * it.
   *
   * Three tiers, separated by hairlines and nothing else:
   *
   *   1. PROVENANCE — how fresh these figures are and what they are scoped to.
   *      The scope line matters more here than on most consoles: everything
   *      except the volume chart is all-time, and the page used to carry a
   *      range picker that implied otherwise.
   *   2. IDENTITY — the existing `PageHeader`, so there is exactly one `<h1>`
   *      and it is not hand-written (R1).
   *   3. STATE — the decision queue: deposits and withdrawals waiting on a
   *      human, with the age of the oldest one, above the fold and before any
   *      tile is read.
   *
   * `showQueue` is false on the fatal branch. Rendering a 0 / 0 all-clear while
   * the dashboard failed to load would be the page asserting the one thing it
   * definitely cannot know.
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

            {fetchedAt ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span>
                  {tCommon("last_updated")} {clock(fetchedAt)}
                </span>
              </>
            ) : null}

            <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border sm:inline-block" />
            {/* The scope of everything that is not the volume chart. */}
            <span className="hidden sm:inline">{tExtAdmin("all_time_totals")}</span>

            <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border md:inline-block" />
            {/* WHICH UNIT, not "no unit". Every money figure below is scoped to
                one plan currency; this says how many there are to scope to, so
                a single-pool install reads as a plain currency statement and a
                mixed one warns before the first tile is read. */}
            <span className="hidden normal-case tracking-normal md:inline">
              {mixedCurrencies
                ? t("amounts_span_n_pools", { count: capitalPools.length })
                : primaryPool
                  ? t("amounts_in_currency", { currency: primaryPool.currency })
                  : t("amounts_follow_plan_currency")}
            </span>
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          {pageHeader}

          {/* 3 — STATE ----------------------------------------------------- */}
          {showQueue ? (
            <div className="pt-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                  {t("awaiting_a_decision")}
                  <span className="normal-case tracking-normal">
                    {" "}
                    · {t("money_held_until_you_act")}
                  </span>
                </p>
                {/* Rendered beside the heading rather than in place of the
                    tiles, so the all-clear costs the band no height change. */}
                {queueState === "clear" ? (
                  <span className="text-xs text-muted-foreground">
                    {t("nothing_is_waiting_on_you")}
                  </span>
                ) : null}
              </div>

              {/*
                ONE TREE, EVERY STATE. Both tiles render whatever the queues look
                like — only the figure and the age caption change — so the band
                holds its height from the first paint through the all-clear.
              */}
              <div className="grid gap-3 sm:grid-cols-2">
                {queueRows.map((row) => (
                  <QueueTile
                    key={row.id}
                    href={row.href}
                    icon={row.icon}
                    label={
                      row.id === "deposit"
                        ? tCommon("deposits")
                        : tCommon("withdrawals")
                    }
                    value={count(row.pending)}
                    loading={queueState === "pending"}
                    /*
                      The COUNT arrives with the dashboard payload and the AGE
                      arrives one round trip later, so they load independently.
                      `ageLoading` also covers the race where the count says two
                      and the probe has not answered yet — a caption that filled
                      the gap with "age unavailable" would be asserting a failure
                      that has not happened.
                    */
                    ageLoading={row.ageLoading}
                    caption={
                      row.pending === 0
                        ? tCommon("nothing_waiting")
                        : !row.probe.available
                          ? t("age_unavailable")
                          : row.scored
                            ? row.scored.level === "breached"
                              ? t("oldest_waiting_past_target", {
                                  age: formatDuration(row.scored.hours),
                                  target: formatDuration(row.scored.budgetHours),
                                })
                              : tExtAdmin("oldest_waiting", {
                                  age: formatDuration(row.scored.hours),
                                })
                            : t("age_unavailable")
                    }
                    /* Tone follows `config/sla.ts` and nothing else, and it is
                       the same ink `AgeCell` paints in the queue this links to:
                       past the budget is `destructive-ink`, past half of it is
                       `warning-ink`, everything else is muted. */
                    tone={
                      row.pending === 0 || !row.scored
                        ? "fresh"
                        : row.scored.level
                    }
                  />
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
    renders a full console of zeros — four "0" tiles, an empty chart, an
    all-clear queue — under a red banner saying the data could not be read.
    Every one of those zeros is a claim the page cannot support. The header
    stays so Retry and the registries are still reachable (R7).
  */
  if (fatal) {
    return (
      /* `masthead(false)` and NOT a second `header` child: the masthead already
         renders `pageHeader` inside itself, so leaving a second copy in place
         would put two `<h1>`s on the one branch an operator reaches when the
         dashboard is down. */
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead(false)}>
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExt("failed_to_load_dashboard")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{failureMessage}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fetchDashboard()}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("try_again")}
              </Button>
              {/* R7 asks every terminal state to carry an action, and the two
                  queues are reachable — and decidable — without this endpoint. */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/forex/deposit")}
              >
                <ArrowDownToLine className="h-4 w-4" />
                {tCommon("deposits")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/forex/withdraw")}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                {tCommon("withdrawals")}
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
      {failureMessage ? (
        /* A failed POLL, not a failed page — `data` is still on screen and
           still true as of the clock in the masthead. Say the refresh failed;
           do not throw away a working dashboard over one bad request. */
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("refresh_failed")}</AlertTitle>
          <AlertDescription>{failureMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* -- SUMMARY --------------------------------------------------------- */}
      {/* Four tiles, each a live figure the operator acts on, each linking
          through to the rows behind it (R3). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("open_investments")}
          value={loading ? 0 : (overview?.activeInvestments ?? 0)}
          icon={Activity}
          index={0}
          loading={loading}
          description={t("n_settled_to_date", {
            count: count(overview?.completedInvestments ?? 0),
          })}
          onClick={() => router.push("/admin/forex/investment")}
          {...statsCardColors.blue}
        />
        {/* ONE POOL, NAMED — not the cross-currency grand total.
            `overview.totalInvestments` is a real sum and an unnameable one; the
            handler still publishes it and this page deliberately cannot see it.
            When a second pool exists the label says LARGEST rather than TOTAL,
            because the figure stops being the whole book at that moment. */}
        <StatsCard
          label={
            mixedCurrencies
              ? t("largest_capital_pool")
              : tCommon("total_investments")
          }
          value={
            loading ? 0 : money(primaryPool?.totalInvested ?? 0, primaryPool?.currency ?? "")
          }
          icon={Wallet}
          index={1}
          loading={loading}
          description={
            mixedCurrencies
              ? t("largest_of_n_currency_pools", { count: capitalPools.length })
              : t("across_every_plan")
          }
          onClick={() => router.push("/admin/forex/investment")}
          {...statsCardColors.purple}
        />
        <StatsCard
          label={tCommon("win_rate")}
          value={loading ? "0%" : `${overview?.winRate ?? 0}%`}
          icon={Target}
          index={2}
          loading={loading}
          progress={overview?.winRate ?? 0}
          /* A rate the admin can change TODAY — `forexPlan.defaultResult` and
             `profitPercentage` are what produce it — which is what makes it a
             legitimate KPI rather than a scoreboard (R3b). */
          description={t("of_n_settled_outcomes", {
            count: count(settledOutcomes),
          })}
          onClick={() => router.push("/admin/forex/plan")}
          {...statsCardColors.amber}
        />
        <StatsCard
          label={tCommon("trading_accounts")}
          value={loading ? 0 : (overview?.totalAccounts ?? 0)}
          icon={Users}
          index={3}
          loading={loading}
          description={t("n_live_n_demo", {
            live: count(overview?.liveAccounts ?? 0),
            demo: count(overview?.demoAccounts ?? 0),
          })}
          onClick={() => router.push("/admin/forex/account")}
          {...statsCardColors.cyan}
        />
      </div>

      {/* -- BODY: volume + outcomes ----------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title={tExtAdmin("investment_volume")}
          /* The series is ONE pool — the handler joins the plan and filters to
             `chartCurrency` — so the description names it. A bar of 1.5 BTC
             stacked on 50,000 USD is a height that means nothing, and a caption
             does not rescue it; scoping does. When a second pool exists the
             description says the other plans are not in this plot. */
          description={
            !chartCurrency
              ? rangeLabel
              : mixedCurrencies
                ? t("range_in_currency_only", {
                    range: rangeLabel,
                    currency: chartCurrency,
                  })
                : t("range_in_currency", {
                    range: rangeLabel,
                    currency: chartCurrency,
                  })
          }
          icon={LineChart}
          height={280}
          className="lg:col-span-2"
          /* The ONLY thing on this page the range picker scopes, so the picker
             lives here rather than in the page header claiming the rest. */
          actions={
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">{tCommon("last_30_days")}</SelectItem>
                <SelectItem value="3m">{tExtAdmin("last_3_months")}</SelectItem>
                <SelectItem value="1y">{tExtAdmin("last_12_months")}</SelectItem>
              </SelectContent>
            </Select>
          }
          loading={loading || loadedRange !== timeframe}
          empty={
            !loading &&
            loadedRange === timeframe &&
            !data?.chartData?.some((point) => point.value > 0)
          }
          emptyMessage={tCommon("no_data_available")}
        >
          <SeriesChart
            data={data?.chartData ?? []}
            series={volumeSeries}
            type="area"
            xKey="name"
            xIsDate={false}
            formatXAxis={formatBucket}
            valueFormatter={(value) => money(value, chartCurrency, false)}
          />
        </ChartCard>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
              </span>
              {tExtAdmin("investment_results")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ONE TREE, TWO STATES — the words, the dots, the tracks and the
                footer rules are all knowable before the fetch. Only the five
                figures are not, so only they get a placeholder and the card
                holds its height across the transition. */}
            <OutcomeRow
              label={tCommon("win")}
              fill={OUTCOME_FILL.win}
              value={results.win}
              total={settledOutcomes}
              loading={loading}
              format={count}
            />
            <OutcomeRow
              label={tCommon("loss")}
              fill={OUTCOME_FILL.loss}
              value={results.loss}
              total={settledOutcomes}
              loading={loading}
              format={count}
            />
            <OutcomeRow
              label={tCommon("draw")}
              fill={OUTCOME_FILL.draw}
              value={results.draw}
              total={settledOutcomes}
              loading={loading}
              format={count}
            />

            <dl className="space-y-2 border-t pt-4 text-sm">
              <MetaRow
                label={t("settled_outcomes")}
                value={count(settledOutcomes)}
                loading={loading}
              />
              {/*
                NET P&L, ONE ROW PER POOL — and never a sum of them.
                =================================================================
                The sign is the whole meaning of this figure, which is why it is
                carried as a character rather than as a colour. That makes it the
                one number on the page a wrong sign ruins, and there were two
                ways to get it wrong:

                 1. Settlement stores a signed `profit` today, but rows written
                    before that fix hold a loss as a POSITIVE number beside
                    `result = 'LOSS'`. A raw `SUM(profit)` therefore renders a
                    desk that lost 3.1K as `+3.1K`, in gain ink. The handler now
                    routes the column through `SIGNED_PROFIT_SQL` from
                    `forex/utils/money.ts` — the same CASE the landing page has
                    used since the cron was fixed.
                 2. Adding a BTC loss to a USD gain produces a signed number
                    whose sign belongs to neither. So the pools are LISTED, each
                    named, and the page never reduces them.
              */}
              {loading || profitPools.length === 0 ? (
                <MetaRow
                  label={t("net_returned_to_traders")}
                  value="—"
                  loading={loading}
                />
              ) : (
                profitPools.slice(0, PROFIT_POOLS).map((pool) => (
                  <MetaRow
                    key={pool.currency}
                    label={t("net_returned_in", { currency: pool.currency })}
                    value={signedMoney(pool.totalProfit, pool.currency)}
                    loading={false}
                  />
                ))
              )}
            </dl>
            {!loading && profitPools.length > PROFIT_POOLS ? (
              /* The cap is stated. A truncated list that says nothing reads as
                 the whole population. */
              <p className="text-[11px] text-subtle-foreground">
                {t("n_more_currency_pools", {
                  count: profitPools.length - PROFIT_POOLS,
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: concentration + recent ------------------------------------ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <PieChart className="h-3.5 w-3.5" />
              </span>
              {tExtAdmin("plan_distribution")}
            </CardTitle>
            <Link
              href="/admin/forex/plan"
              className="flex items-center rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-1">
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} className="h-9 w-full" />
                ))}
              </div>
            ) : planConcentration.pools.length ? (
              <div className="space-y-4">
                {/* The one sentence this panel exists for: concentration. A
                    ranked list shows the shape; naming the leader states it —
                    and the sentence names the POOL it is a share of, because
                    that is the only denominator the percentage came from. */}
                {planConcentration.lead ? (
                  <p className="text-xs text-muted-foreground">
                    {t("top_plan_holds_share", {
                      name: planConcentration.lead.name,
                      pct: planConcentration.lead.share.toFixed(0),
                      currency:
                        planConcentration.lead.currency || tCommon("unknown"),
                    })}
                  </p>
                ) : null}
                {planConcentration.pools.map((pool) => (
                  <div key={pool.currency || "unnamed"} className="space-y-3">
                    {/* The pool header appears only when there IS more than one
                        pool — on a single-currency install it would be a rule
                        restating what the tiles already say. */}
                    {planConcentration.mixed ? (
                      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                        <span>{pool.currency || tCommon("unknown")}</span>
                        <span className="tabular-nums">
                          {money(pool.total, pool.currency)}
                        </span>
                      </div>
                    ) : null}
                    {pool.rows.map((plan) => (
                      <div key={plan.name} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">
                            {plan.name}
                          </span>
                          <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                            {money(plan.value, plan.currency)}
                            {/* Share OF ITS OWN POOL. */}
                            <span className="ml-2 text-xs text-subtle-foreground">
                              {plan.share.toFixed(0)}%
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                          <div
                            className={cn("h-full", PLAN_BAR_FILL)}
                            style={{ width: `${plan.share}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {planConcentration.hidden > 0 ? (
                  /* The cap is stated. A truncated list that says nothing reads
                     as the whole population, which is exactly how a page
                     acquires a wrong total. */
                  <p className="pt-1 text-[11px] text-subtle-foreground">
                    {t("n_more_plans", { count: planConcentration.hidden })}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyPanel
                icon={Layers}
                title={t("no_capital_is_invested_yet")}
                body={
                  (overview?.activePlans ?? 0) > 0
                    ? t("plans_exist_but_nobody_has_invested")
                    : t("no_plan_is_configured_yet")
                }
                action={
                  (overview?.activePlans ?? 0) > 0 ? null : (
                    <Button
                      size="sm"
                      onClick={() => router.push("/admin/forex/plan")}
                    >
                      {tCommon("plans")}
                    </Button>
                  )
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                </span>
                {tCommon("recent_investments")}
              </CardTitle>
              {/* The endpoint hard-limits this to five rows. Saying so is the
                  difference between a sample and an implied total. */}
              <p className="text-xs text-muted-foreground">
                {t("the_five_most_recent")}
              </p>
            </div>
            <Link
              href="/admin/forex/investment"
              className="flex items-center rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {tCommon("view_all")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {/*
              NOT a `DataTable`: this is a fixed five-row tail with no paging,
              filtering or sorting of its own — `DataTable` needs an
              `apiEndpoint` returning `{items, pagination}` and owns the whole
              page frame when it renders. It links INTO the investment
              DataTable, which is where those capabilities live.
            */}
            {loading ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} className="h-11 w-full" />
                ))}
              </div>
            ) : data?.recentInvestments?.length ? (
              <div className="-mx-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("user")}</TableHead>
                      <TableHead>{tCommon("plan")}</TableHead>
                      <TableHead className="text-right">
                        {tCommon("amount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {tCommon("profit")}
                      </TableHead>
                      <TableHead>{tCommon("result")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead className="text-right">
                        {tCommon("age")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentInvestments.map((row) => {
                      const settled = row.status?.toUpperCase() === "COMPLETED";
                      return (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer"
                          onClick={() => router.push("/admin/forex/investment")}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {isNamed(row.user) ? row.user : tCommon("unknown")}
                            </div>
                            <span className="font-mono text-[11px] text-subtle-foreground">
                              {row.userId?.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.plan}
                          </TableCell>
                          {/* Each row carries its OWN unit, from the plan it
                              was bought against. A column of bare figures in a
                              table whose rows can be denominated differently
                              invites exactly the comparison that is invalid. */}
                          <TableCell className="text-right font-mono tabular-nums">
                            {money(row.amount, row.currency)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono tabular-nums",
                              settled && row.profit > 0 && "text-up",
                              settled && row.profit < 0 && "text-down"
                            )}
                          >
                            {/* An unsettled investment has no P&L yet, and a
                                literal 0 would read as "broke even".

                                `profit` arrives SIGN-CORRECTED from the handler.
                                Before that, a LOSS settled by the old cron
                                stored its magnitude as a positive number, so
                                this cell painted `+1,234` in gain ink in the
                                same row whose Result badge said "Loss". */}
                            {settled ? signedMoney(row.profit, row.currency) : "—"}
                          </TableCell>
                          <TableCell>
                            {/* Soft, like the status pill beside it. Two
                                appearances in one row reads as two kinds of
                                importance, and these are peers. */}
                            {row.result ? (
                              <Badge
                                tone={statusTone(row.result)}
                                appearance="soft"
                                size="xs"
                              >
                                {statusLabel(row.result)}
                              </Badge>
                            ) : (
                              <span className="text-subtle-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              tone={statusTone(row.status)}
                              appearance="soft"
                              size="xs"
                            >
                              {statusLabel(row.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                            {/* Age, not a formatted date: a bare
                                `toLocaleDateString()` during render takes both
                                its locale and its calendar from the runtime,
                                which is the classic hydration mismatch — and
                                "how long has this been running" is the question
                                anyway. */}
                            {row.date ? formatDuration(ageHours(row.date)) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyPanel
                icon={History}
                title={tCommon("no_investments_yet")}
                body={t("nobody_has_locked_capital_into_a_plan")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* -- BODY: the desk registry ----------------------------------------- */}
      {/* Four counts that were computed by the handler and rendered NOWHERE on
          the page this replaced. Each links to the registry that owns it. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DeskStat
          label={tExtAdmin("live_accounts")}
          value={count(overview?.liveAccounts ?? 0)}
          caption={t("hold_real_funds")}
          href="/admin/forex/account"
          icon={CreditCard}
          loading={loading}
        />
        <DeskStat
          label={tExtAdmin("demo_accounts")}
          value={count(overview?.demoAccounts ?? 0)}
          caption={t("paper_balances_only")}
          href="/admin/forex/account"
          icon={Users}
          loading={loading}
        />
        <DeskStat
          /* `overview.activePlans` counts EVERY plan — the handler's alias is
             wrong, not its SQL — so the label says "Plans", which is true. */
          label={tCommon("plans")}
          value={count(overview?.activePlans ?? 0)}
          caption={t("investment_terms_on_offer")}
          href="/admin/forex/plan"
          icon={Rocket}
          loading={loading}
        />
        <DeskStat
          label={tCommon("signals")}
          value={count(overview?.totalSignals ?? 0)}
          caption={t("n_active", {
            count: count(overview?.activeSignals ?? 0),
          })}
          href="/admin/forex/signal"
          icon={Signal}
          loading={loading}
        />
      </div>
    </PageShell>
  );
}

/**
 * Does the handler's `user` string actually name somebody?
 *
 * `recentInvestments` builds the name as `${firstName} ${lastName}` off a
 * `raw: true, nest: true` query. Sequelize materialises a belongsTo that
 * matched nothing as `{firstName: null, lastName: null}` rather than as `null`,
 * and that object is TRUTHY — so the handler's own `inv.user ? … : "Unknown"`
 * guard never fires and the string on the wire is the literal "null null". Its
 * fallback is no better here: "Unknown" is hardcoded English in the handler and
 * would ship untranslated to 89 locales. Both are treated as "no name" so the
 * cell can fall back to a translated one.
 */
function isNamed(value?: string | null): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "Unknown") return false;
  return !/^(null|undefined)(\s+(null|undefined))*$/i.test(trimmed);
}

/** Whole hours since an ISO timestamp, for `formatDuration`. */
function ageHours(iso: string): number {
  const started = new Date(iso).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, (Date.now() - started) / (1000 * 60 * 60));
}

// ---------------------------------------------------------------------------
// Local pieces. Small enough to live beside their only consumer; each exists to
// keep one shape identical across the several places it repeats on this page.
//
// EVERY ONE OF THEM SWAPS ITS VALUE WITH `Loadable`, NOT WITH A `<Skeleton>`
// BOX, and that is a correctness fix rather than a preference. `Skeleton`
// renders a `<div>`; each of these figures lives inside a `<p>` or a `<span>`.
// The HTML parser AUTO-CLOSES an open `<p>` when it meets a `<div>`, so the
// server's markup and the client's tree disagree about where the paragraph
// ends — React reports it as a hydration error and throws the subtree away.
//
// `Loadable` renders `SkeletonText`, a plain inline `<span>` that is legal in
// all three places, and it is MEASURED rather than guessed: it lays the
// placeholder string out with the real font, size and weight.
// ---------------------------------------------------------------------------

/**
 * One decision queue in the masthead.
 *
 * A `Link`, not a card with an `onClick`: this is navigation, so it should be
 * middle-clickable, focusable and readable by a screen reader as a link. The
 * hover is a BORDER colour change and nothing else — no lift, no scale, no
 * shadow (the Ledger shell takes its depth from the border).
 */
function QueueTile({
  href,
  icon: Icon,
  label,
  value,
  caption,
  tone,
  loading,
  ageLoading,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption: string;
  tone: "fresh" | "due" | "breached";
  /** The count — known as soon as the dashboard payload lands. */
  loading: boolean;
  /** The age — one round trip behind the count. */
  ageLoading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5 outline-hidden transition-colors hover:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {/* The tile is IDENTITY — which queue is this — so it stays neutral.
            All of this row's state lives on the age caption, in the same ink
            the queue's own age column uses. Painting the tile as well would
            give one fact two independent colour decisions to disagree over. */}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span
            className={cn(
              "flex items-center gap-1 truncate text-[11px]",
              tone === "breached" && "font-medium text-destructive-ink",
              tone === "due" && "text-warning-ink",
              tone === "fresh" && "text-subtle-foreground"
            )}
          >
            {/* The glyph is what makes "late" survive a monochrome print or a
                colour-vision deficiency. */}
            {tone === "breached" ? (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            ) : tone === "due" ? (
              <Clock className="h-3 w-3 shrink-0" />
            ) : null}
            <Loadable loading={ageLoading} placeholder="0000000000">
              {caption}
            </Loadable>
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums">
          <Loadable loading={loading} placeholder="00">
            {value}
          </Loadable>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </span>
    </Link>
  );
}

/** One outcome row: word, count, and its share of all settled investments. */
function OutcomeRow({
  label,
  fill,
  value,
  total,
  loading,
  format,
}: {
  label: string;
  fill: string;
  value: number;
  total: number;
  loading: boolean;
  format: (value: number) => string;
}) {
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", fill)} />
          {label}
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums">
          <Loadable loading={loading} placeholder="0,000">
            {format(value)}
          </Loadable>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full", fill)}
          style={{ width: `${loading ? 0 : share}%` }}
        />
      </div>
    </div>
  );
}

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
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium tabular-nums">
        <Loadable loading={loading} placeholder="00.0K">
          {value}
        </Loadable>
      </dd>
    </div>
  );
}

/** A registry count that leads somewhere. A count with no door is a poster. */
function DeskStat({
  label,
  value,
  caption,
  href,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  caption: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-4 outline-hidden transition-colors hover:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        <Loadable loading={loading} placeholder="0,000">
          {value}
        </Loadable>
      </p>
      {/* Reserved whether or not the caption fits on one line, so a four-up row
          cannot end up with one taller cell. */}
      <p className="mt-0.5 min-h-4 text-[11px] text-subtle-foreground">
        {caption}
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
