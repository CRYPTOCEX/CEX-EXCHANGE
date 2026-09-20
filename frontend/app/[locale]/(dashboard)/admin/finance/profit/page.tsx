"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  Coins,
  RefreshCw,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { useTableStore } from "@/components/blocks/data-table/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loadable } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useAnalytics } from "./analytics";
import { useColumns, useViewConfig } from "./columns";

interface WalletCurrencyTotals {
  total: number;
  walletId: string;
  walletBalance: number;
  available: number;
}

interface ProfitSummary {
  totalsByWalletType: Record<string, Record<string, WalletCurrencyTotals>>;
  totalsByType: Record<string, { total: number; count: number }>;
  totalsByCurrency: Record<string, { total: number; count: number }>;
  // Per-currency, keyed by currency code. Adding BTC to USD to NGN produces a
  // figure that means nothing, which is what these tiles used to show.
  periodComparison: {
    today: Record<string, number>;
    thisWeek: Record<string, number>;
    thisMonth: Record<string, number>;
    lastMonth: Record<string, number>;
  };
  trackingSince: string | null;
  adminId: string;
  /**
   * Swap fees earned ON CHAIN that the platform does not hold yet.
   *
   * NOT part of any figure above, on purpose. These accrue to a fee-recipient
   * address the platform has no key for and become platform money only once
   * the operator sweeps them. Optional because an install without the Swap
   * addon never sends the key.
   */
  pendingOnchainRevenue?: Array<{
    tokenSymbol: string;
    chainId: number;
    total: number;
    /** null when the token could not be priced. NEVER render this as $0.00. */
    totalUsd: number | null;
    count: number;
  }>;
}

/**
 * Rows a list shows before the disclosure takes over.
 *
 * These caps replace `max-h-24 overflow-y-auto` / `max-h-40 overflow-y-auto`.
 * A scroll container inside a card is the wrong control for this: it clipped
 * whichever row straddled the boundary (a wallet balance rendered as a row of
 * half-height glyphs), put a scrollbar track inside a 4px-radius card, and hid
 * the fact that there was more data behind a gesture nobody makes on a
 * dashboard tile. A cap plus a labelled "Show All (15)" says how much is
 * hidden and reveals it in place.
 */
const PERIOD_ROWS = 3;
const WALLET_ROWS = 12;
const BREAKDOWN_ROWS = 6;

/**
 * How many rows a list RESERVES while its length is unknown.
 *
 * A currency list has no knowable length, so the honest pending state is a
 * plausible fixed count that then settles — not zero. Zero is the actively
 * wrong answer on this page for a mechanical reason: the four period tiles
 * share one grid row and carry `h-full`, so a tile that grows by two lines
 * when its data lands resizes ALL FOUR, and the wallet and breakdown sections
 * below it move by the difference.
 *
 * `null` is the pending row itself, so a list can be `(T | null)[]` and one
 * `.map()` renders both states from the same markup. That is the whole point:
 * there is no second copy of a row to drift out of sync with the real one.
 */
const PENDING_PERIOD_ROWS: Array<[string, number] | null> = [null, null];
const PENDING_WALLET_ROWS: Array<[string, WalletCurrencyTotals] | null> = [
  null,
  null,
  null,
  null,
];

/** One shared empty map, so a pending tile is not handed a fresh object (and a
 *  fresh `useMemo` dependency) on every render. */
const NO_AMOUNTS: Record<string, number> = {};

const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function numberFormatter(maximumFractionDigits: number, signed: boolean) {
  const key = `${maximumFractionDigits}:${signed}`;
  let formatter = NUMBER_FORMATTERS.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    NUMBER_FORMATTERS.set(key, formatter);
  }
  return formatter;
}

/**
 * The full figure, grouped, never abbreviated.
 *
 * This used to compact on magnitude: a 1,113.47 USD balance printed as `1.11K`
 * and a 400,000 MRST one as `400.00K`. Every number on this page is money the
 * platform holds or has paid out, and an abbreviated figure is a lie about an
 * amount — the reader cannot tell 1,113.47 from 1,114.99, and nothing in the UI
 * said the value was approximate. This is the same call `StatsCard` settled on
 * when 26 hand-rolled cards were collapsed onto it: `compact` is opt-in, and
 * for an accounting surface the answer is no.
 *
 * Precision follows magnitude because the same component renders fiat and
 * crypto dust: two places for anything over 1, eight below it.
 */
function formatAmount(n: number, signed = false): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  return numberFormatter(abs > 0 && abs < 1 ? 8 : 2, signed).format(n);
}

/**
 * A figure's ink.
 *
 * Positive is `--foreground` deliberately — most rows here are positive and
 * painting all of them green is decoration, not information. A negative row is
 * a platform payout (`recordPlatformLoss` writes them) and reads as a gain
 * unless it is marked, so that is where the colour goes, and always alongside
 * the `-` sign: `--up`/`--down` are not separable under deuteranopia, so colour
 * alone must never be what tells a gain from a loss.
 */
function amountInk(n: number): string {
  return n < 0 ? "text-down" : "text-foreground";
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  // Byte-identical to the icon tile in `ui/card/stats-card.tsx`, so a tile on
  // this page and a `StatsCard` anywhere else in the admin read as one family.
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {/* `h2`, because the DataTable hero owns the page's only `h1`. The label
          is `--foreground` with the colour on the icon — a section heading set
          in `--muted-foreground` was the quietest thing on the page. */}
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {title}
      </h2>
      {hint ? (
        <span className="text-xs text-subtle-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

function DisclosureButton({
  total,
  expanded,
  onToggle,
}: {
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tCommon = useTranslations("common");

  return (
    <Button
      type="button"
      variant="ghost"
      size="2xs"
      // Pulled left so the label lines up with the list above it rather than
      // sitting in from the card's padding edge.
      className="-ml-2 mt-1 w-fit text-muted-foreground"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      {expanded ? tCommon("show_less") : `${tCommon("show_all")} (${total})`}
    </Button>
  );
}

/**
 * One period tile: the dominant currency as the figure, the rest as a list.
 *
 * Not a `StatsCard` — that component renders one value, and a period here has
 * one figure PER CURRENCY. It follows the same grammar instead (Ledger shell,
 * `p-4`, muted label, 7x7 icon tile, monospaced tabular figure) so the row does
 * not read as a different card system.
 */
function PeriodTile({
  label,
  amounts,
  icon,
  footer,
  loading = false,
}: {
  label: string;
  amounts: Record<string, number>;
  icon: LucideIcon;
  footer?: React.ReactNode;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const entries = useMemo(
    () =>
      Object.entries(amounts ?? {}).sort(
        ([, a], [, b]) => Math.abs(b) - Math.abs(a)
      ),
    [amounts]
  );

  const [lead, ...rest] = entries;
  const visible = expanded ? rest : rest.slice(0, PERIOD_ROWS);
  const hidden = rest.length - visible.length;

  /**
   * EMPTY AND PENDING ARE DIFFERENT ANSWERS.
   *
   * The em-dash means "this period had no fees" — a conclusion, and one this
   * component could only reach by looking at data it did not have yet. Before
   * the page passed `loading` down, every tile printed it during the fetch and
   * then replaced it with a figure, a currency code and up to three list rows,
   * which is the tile changing height at the moment the operator looks at it.
   */
  const showEmpty = !loading && !lead;
  const listRows: Array<[string, number] | null> = loading
    ? PENDING_PERIOD_ROWS
    : visible;

  return (
    // `h-full` so every tile fills its grid cell: without it the tile carrying
    // the month delta is a line taller than its neighbours and the row renders
    // ragged, because a CSS grid stretches the item and not the content.
    <Card padding="md" className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <IconTile icon={icon} />
      </div>

      {showEmpty ? (
        <p className="text-xl font-semibold leading-tight text-subtle-foreground">
          —
        </p>
      ) : (
        <>
          {/* `text-xl`, not `text-2xl`: the tile also carries a currency code
              and a list, and at a quarter of the container a seven-figure
              amount at 24px runs past the card edge.

              The placeholder lives INSIDE this `<p>`, so its height is
              produced by this exact typography — change `text-xl` here and the
              pending state follows on its own. */}
          <p
            className={cn(
              "flex flex-wrap items-baseline gap-x-1.5 text-xl font-semibold leading-tight tracking-tight",
              lead ? amountInk(lead[1]) : "text-foreground"
            )}
          >
            <span className="font-mono tabular-nums">
              <Loadable loading={loading} placeholder="+12,345.67">
                {lead ? formatAmount(lead[1], true) : null}
              </Loadable>
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              <Loadable loading={loading} placeholder="USD">
                {lead ? lead[0] : null}
              </Loadable>
            </span>
          </p>

          {listRows.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {listRows.map((row, i) => (
                <li
                  key={row ? row[0] : `pending-${i}`}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    <Loadable loading={!row} placeholder="USD">
                      {row ? row[0] : null}
                    </Loadable>
                  </span>
                  {/* `shrink-0` on the figure and `min-w-0 truncate` on the
                      label: the label is what may be clipped, never the
                      amount. */}
                  <span
                    className={cn(
                      "shrink-0 font-mono tabular-nums",
                      row ? amountInk(row[1]) : undefined
                    )}
                  >
                    <Loadable loading={!row} placeholder="1,234.56">
                      {row ? formatAmount(row[1], true) : null}
                    </Loadable>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {hidden > 0 || expanded ? (
            <DisclosureButton
              total={entries.length}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
            />
          ) : null}
        </>
      )}

      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </Card>
  );
}

function WalletTypeCard({
  type = "",
  currencies = [],
  loading = false,
}: {
  type?: string;
  currencies?: Array<[string, WalletCurrencyTotals]>;
  loading?: boolean;
}) {
  const tCommon = useTranslations("common");
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? currencies : currencies.slice(0, WALLET_ROWS);
  const hidden = currencies.length - visible.length;
  // The `available / total` pair only appears on rows with funds on hold, so
  // the caption that explains it only appears when one of them does.
  const hasHeld = currencies.some(([, d]) => d.available < d.total);
  const rows: Array<[string, WalletCurrencyTotals] | null> = loading
    ? PENDING_WALLET_ROWS
    : visible;

  return (
    <Card padding="md">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* Neutral, not tinted. Every wallet type used to get the same
            `bg-primary/10 text-primary` chip, so the colour separated nothing —
            and giving four types four hues would be adding colour, not fixing
            it. The label already names the entity. */}
        <Badge
          tone="neutral"
          appearance="outline"
          size="xs"
          className="tracking-wide"
        >
          <Loadable loading={loading} placeholder="ECOSYSTEM">
            {type}
          </Loadable>
        </Badge>
        {hasHeld ? (
          <span className="text-[11px] text-subtle-foreground">
            {tCommon("available")} / {tCommon("total")}
          </span>
        ) : null}
      </div>

      {/* Row padding, NOT `space-y-*`. `space-y` sets a margin on every child
          but the DOM-first one, and in a multi-column flow that child is the
          only one at the top of its column — so the other columns start one
          margin lower and the rows stop lining up across the card. */}
      <ul className={CURRENCY_FLOW}>
        {rows.map((row, i) => (
          <li
            key={row ? row[0] : `pending-${i}`}
            className="flex items-baseline justify-between gap-2 break-inside-avoid py-0.5 text-sm"
          >
            <span className="min-w-0 truncate font-medium">
              <Loadable loading={!row} placeholder="USDT">
                {row ? row[0] : null}
              </Loadable>
            </span>
            <span className="shrink-0 font-mono tabular-nums">
              <Loadable loading={!row} placeholder="12,345.67">
                {row ? (
                  <>
                    {formatAmount(row[1].available)}
                    {row[1].available < row[1].total ? (
                      <span className="ml-1 text-xs text-subtle-foreground">
                        / {formatAmount(row[1].total)}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </Loadable>
            </span>
          </li>
        ))}
      </ul>

      {hidden > 0 || expanded ? (
        <DisclosureButton
          total={currencies.length}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      ) : null}
    </Card>
  );
}

interface BreakdownRow {
  key: string;
  label: string;
  value: number;
  count: number;
}

function BreakdownCard({
  icon,
  title,
  rows,
  limit,
  loading = false,
}: {
  icon: LucideIcon;
  title: string;
  rows: BreakdownRow[];
  limit: number;
  loading?: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? rows : rows.slice(0, limit);
  const hidden = rows.length - visible.length;
  // Scale on MAGNITUDE. Ranking and scaling on the signed value meant a
  // negative row produced `width: -12%`, which is an invalid declaration — so
  // the fill kept its auto width and a platform payout drew a FULL bar.
  const max = rows.reduce((m, r) => Math.max(m, Math.abs(r.value)), 0);
  /* `limit` pending rows, because that is exactly how many the card shows
     before its disclosure takes over — so the collapsed card is already its
     final height and only its contents resolve. */
  const listRows: Array<BreakdownRow | null> = loading
    ? Array.from({ length: limit }, () => null)
    : visible;

  return (
    <Card padding="md">
      <div className="mb-3">
        <SectionHeading icon={icon} title={title} />
      </div>

      <ul className="space-y-2">
        {listRows.map((row, i) => {
          const pct =
            row && max > 0 ? Math.min(100, (Math.abs(row.value) / max) * 100) : 0;
          return (
            <li key={row ? row.key : `pending-${i}`} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium" title={row?.label}>
                  <Loadable loading={!row} placeholder={t("trading_fee")}>
                    {row ? row.label : null}
                  </Loadable>
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  <span className={row ? amountInk(row.value) : undefined}>
                    <Loadable loading={!row} placeholder="12,345.67">
                      {row ? formatAmount(row.value) : null}
                    </Loadable>
                  </span>
                  <span
                    className="ml-1.5 text-subtle-foreground"
                    title={
                      row ? `${row.count} ${tCommon("transactions")}` : undefined
                    }
                  >
                    (
                    <Loadable loading={!row} placeholder="123">
                      {row ? row.count : null}
                    </Loadable>
                    )
                  </span>
                </span>
              </div>
              {/* Decorative: the figure above already states the value, so the
                  bar is `aria-hidden` rather than a second announcement. Track
                  and radius match `StatsCard`'s progress fill.

                  The TRACK renders in both states — it is the shape, and it is
                  a fixed 4px whatever the fill does. Only the fill waits, at
                  zero width, because a pending proportion is not a proportion
                  and a guessed bar is a claim about the data. */}
              <div
                aria-hidden
                className="h-1 w-full overflow-hidden rounded-sm bg-surface-3"
              >
                <div
                  className={cn(
                    "h-full rounded-sm",
                    row && row.value < 0 ? "bg-down" : "bg-primary"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {hidden > 0 || expanded ? (
        <DisclosureButton
          total={rows.length}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      ) : null}
    </Card>
  );
}

/**
 * The layouts.
 *
 * These used to be described as "shared by the skeleton and the loaded state so
 * nothing jumps", and they were — the three grid strings were the only thing
 * `SummarySkeleton` had in common with the dashboard it stood in for. Everything
 * else about it was invented: four cards each holding one `h-24` grey block
 * against tiles whose real height is a label row, a 20px figure, up to three
 * list rows and a footer; two `h-20` blocks against wallet cards that flow up to
 * twelve currencies across four columns; two `h-40` blocks against breakdown
 * cards of six rows each. Sharing the container class does not make a duplicate
 * faithful — it just moves the drift inside the box.
 *
 * There is no second tree now. The components take `loading` and reserve their
 * own rows, so these constants have one caller each again.
 */

/** Four periods that are read against each other, so their baselines align
 *  (the tiles carry `h-full`; see `PeriodTile`). */
const PERIOD_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4";

/**
 * Wallet types stack full-width; the currencies flow in columns INSIDE each.
 *
 * Two layouts were tried and are worth not repeating. A 3-column grid of
 * per-type cards makes every row as tall as its tallest cell, so the
 * one-currency FIAT card left a five-row hole beside fifteen-currency ECO —
 * `items-start` cannot fix that, because it shortens the card and not the row.
 * CSS `columns` on the cards is worse: the balancer fills sequentially against
 * a computed target height, so four cards of 1/6/6/1 rows packed into two
 * columns and left the third empty at 1680px.
 *
 * Flowing the CURRENCIES instead is what actually fits. Every row is one line
 * tall, which is the case column balancing handles perfectly, and a card is
 * then exactly as tall as its own content at every width — no holes to fill.
 */
const WALLET_STACK = "space-y-3";
const CURRENCY_FLOW =
  "columns-1 gap-x-6 sm:columns-2 lg:columns-3 xl:columns-4";

const BREAKDOWN_GRID = "grid grid-cols-1 items-start gap-3 lg:grid-cols-2";

function ProfitSummaryDashboard() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  // The summary duplicates what the analytics view already charts, so it only
  // belongs above the table.
  const analyticsTab = useTableStore((s) => s.analyticsTab);

  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // `$fetch` resolves to a `{ data, error }` envelope and never throws, so the
  // try/catch that used to wrap this was unreachable: an outage arrives as
  // `error` set, not as an exception.
  const load = useCallback(
    () => $fetch({ url: "/api/admin/finance/profit/summary", silent: true }),
    []
  );

  const apply = useCallback((res: { data?: any; error?: any }) => {
    if (!res.error && res.data) {
      setSummary(res.data);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  /**
   * The mount fetch resolves into a callback rather than awaiting inside the
   * effect body, for two reasons: `loading` already starts `true` so there is
   * nothing to set synchronously, and the `cancelled` flag stops a response
   * that lands after the operator has navigated away from setting state on an
   * unmounted tree.
   */
  useEffect(() => {
    let cancelled = false;
    load().then((res) => {
      if (!cancelled) apply(res);
    });
    return () => {
      cancelled = true;
    };
  }, [load, apply]);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(false);
    apply(await load());
  }, [load, apply]);

  const walletCards = useMemo(() => {
    const byType = summary?.totalsByWalletType ?? {};
    return Object.keys(byType)
      .map((type) => ({
        type,
        currencies: Object.entries(byType[type])
          .filter(([, v]) => v.total > 0)
          .sort(([, a], [, b]) => b.total - a.total),
      }))
      // Types whose every wallet is empty are dropped HERE rather than by
      // returning null from the map. Deciding it during render left the
      // section heading on a page with no cards under it.
      .filter((entry) => entry.currencies.length > 0);
  }, [summary]);

  // Ranked by magnitude, not signed value: a large payout is a large flow, and
  // sorting it to the bottom hid the only rows that need attention.
  const feeSourceRows = useMemo<BreakdownRow[]>(
    () =>
      Object.entries(summary?.totalsByType ?? {})
        .map(([type, data]) => ({
          key: type,
          label: type.replace(/_/g, " "),
          value: data.total,
          count: data.count,
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [summary]
  );

  const currencyRows = useMemo<BreakdownRow[]>(
    () =>
      Object.entries(summary?.totalsByCurrency ?? {})
        .map(([currency, data]) => ({
          key: currency,
          label: currency,
          value: data.total,
          count: data.count,
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [summary]
  );

  /* Sorted by USD where we have it, so the largest uncollected position leads.
     An unpriced row sorts last rather than to the top as a zero. */
  const pendingOnchainRows = useMemo(
    () =>
      [...(summary?.pendingOnchainRevenue ?? [])].sort(
        (a, b) => (b.totalUsd ?? 0) - (a.totalUsd ?? 0)
      ),
    [summary]
  );

  if (analyticsTab === "analytics") return null;

  if (error) {
    return (
      <Card padding="md" tone="destructive">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            {t("failed_to_load_profit_summary")}
          </p>
          {/* Was a bare `<button>` with `text-primary hover:underline`: no
              focus ring, no hit area, and the only control on the page that
              was not a Button. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retry}
          >
            <RefreshCw className="h-4 w-4" />
            {tCommon("retry")}
          </Button>
        </div>
      </Card>
    );
  }

  const periodComparison = summary?.periodComparison;

  // Month-over-month is only meaningful within a single currency, so compare
  // the currency that dominates this month rather than a cross-currency total.
  const thisMonthAmounts = periodComparison?.thisMonth ?? NO_AMOUNTS;
  const thisMonthEntries = Object.entries(thisMonthAmounts).sort(
    ([, a], [, b]) => Math.abs(b) - Math.abs(a)
  );
  const leadCurrency = thisMonthEntries[0]?.[0] ?? null;
  const leadThisMonth = leadCurrency ? (thisMonthAmounts[leadCurrency] ?? 0) : 0;
  const leadLastMonth = leadCurrency
    ? (periodComparison?.lastMonth?.[leadCurrency] ?? 0)
    : 0;
  const monthChange =
    leadLastMonth !== 0
      ? ((leadThisMonth - leadLastMonth) / Math.abs(leadLastMonth)) * 100
      : 0;
  const monthUp = monthChange >= 0;
  const trackingSince = summary?.trackingSince ?? null;

  /**
   * WHAT THE PENDING PAGE SHOWS, AND WHY IT IS NAMED RATHER THAN INLINED.
   * ==========================================================================
   *
   * Each of these sections used to be gated on data that only exists after the
   * fetch — `walletCards.length > 0`, `feeSourceRows.length > 0`,
   * `summary.trackingSince` — which reads as an emptiness test and behaves as a
   * pending test, because while the request is in flight every one of them is
   * empty. So the dashboard rendered as four period tiles and nothing else, and
   * then grew a wallet section, a two-card breakdown row and a footnote
   * underneath, pushing the profit table below it down the page by several
   * hundred pixels at the moment the data landed.
   *
   * `loading || <the real emptiness test>` keeps both meanings: reserve the
   * section while we do not know, drop it once we do know there is nothing in
   * it. Naming the boolean above the JSX is deliberate — an inline `!loading &&`
   * is indistinguishable, to a reader and to the scanner, from withholding
   * content that is already available.
   */
  const showMonthDelta =
    loading || (leadCurrency !== null && leadLastMonth !== 0);
  const showWalletSection = loading || walletCards.length > 0;
  const showFeeSources = loading || feeSourceRows.length > 0;
  const showCurrencies = loading || currencyRows.length > 0;
  const showBreakdowns = showFeeSources || showCurrencies;
  const showTracking = loading || Boolean(trackingSince);

  return (
    <div className="space-y-6">
      {/* Period overview — one line per currency, never a cross-currency total */}
      <div className={PERIOD_GRID}>
        <PeriodTile
          label="Today"
          amounts={periodComparison?.today ?? NO_AMOUNTS}
          icon={Calendar}
          loading={loading}
        />
        <PeriodTile
          label={tCommon("this_week")}
          amounts={periodComparison?.thisWeek ?? NO_AMOUNTS}
          icon={TrendingUp}
          loading={loading}
        />
        <PeriodTile
          label={tCommon("this_month")}
          amounts={thisMonthAmounts}
          // The arrow carries direction as SHAPE and the tile stays neutral;
          // the colour lives on the delta chip below, where the sign is
          // printed beside it.
          icon={monthUp ? ArrowUpRight : ArrowDownRight}
          loading={loading}
          footer={
            showMonthDelta ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-subtle-foreground">
                {/* The chip is neutral until the direction is known — `up` and
                    `down` are the two things this element says, and saying
                    either one before the figure exists is a guess the operator
                    reads as a fact. */}
                <span
                  className={cn(
                    "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
                    loading
                      ? "bg-surface-3 text-muted-foreground"
                      : monthUp
                        ? "bg-up/12 text-up-ink"
                        : "bg-down/12 text-down-ink"
                  )}
                >
                  <Loadable loading={loading} placeholder="+12.3%">
                    {`${monthUp ? "+" : ""}${monthChange.toFixed(1)}%`}
                  </Loadable>
                </span>
                <span>
                  {t("vs_last_month")}{" "}
                  <Loadable loading={loading} placeholder="USD">
                    {leadCurrency}
                  </Loadable>
                </span>
              </div>
            ) : null
          }
        />
        <PeriodTile
          label={t("last_month")}
          amounts={periodComparison?.lastMonth ?? NO_AMOUNTS}
          icon={Clock}
          loading={loading}
        />
      </div>

      {/* Accrued on chain — NOT platform money yet, and visually separated
          from every tile above for exactly that reason. An operator who reads
          this as profit will reconcile their books against a number the
          platform cannot spend. */}
      {pendingOnchainRows.length ? (
        <section className="space-y-3">
          <SectionHeading
            icon={Coins}
            title="Accrued on-chain (not yet swept)"
            hint={t("earned_not_held")}
          />
          <Card padding="md" tone="warning">
            <p className="mb-3 text-xs text-muted-foreground">
              {t("swap_fees_sitting_at_your_fee")}
            </p>
            <ul className="space-y-2">
              {pendingOnchainRows.map((row) => (
                <li
                  key={`${row.chainId}:${row.tokenSymbol}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {row.tokenSymbol}
                    <span className="ml-2 font-mono text-xs text-subtle-foreground">
                      chain {row.chainId}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">
                    {row.total.toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {/* An em dash, never $0.00 — a token we could not price
                          is not a worthless one. */}
                      {row.totalUsd === null
                        ? "—"
                        : `$${row.totalUsd.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Admin wallet balances by type */}
      {showWalletSection ? (
        <section className="space-y-3">
          <SectionHeading
            icon={Wallet}
            title={t("admin_wallet_balances")}
            hint={t("withdrawable_fees")}
          />
          <div className={WALLET_STACK}>
            {loading ? (
              <WalletTypeCard loading />
            ) : (
              walletCards.map(({ type, currencies }) => (
                <WalletTypeCard
                  key={type}
                  type={type}
                  currencies={currencies}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* Fee sources & currencies */}
      {showBreakdowns ? (
        <div className={BREAKDOWN_GRID}>
          {showFeeSources ? (
            <BreakdownCard
              icon={Coins}
              title={t("top_fee_sources")}
              rows={feeSourceRows}
              limit={BREAKDOWN_ROWS}
              loading={loading}
            />
          ) : null}
          {showCurrencies ? (
            <BreakdownCard
              icon={Coins}
              title={t("top_currencies")}
              rows={currencyRows}
              limit={BREAKDOWN_ROWS}
              loading={loading}
            />
          ) : null}
        </div>
      ) : null}

      {showTracking ? (
        // The hairline is load-bearing: without it this caption sits 16px above
        // the table's Filter/Sort/Columns bar and reads as part of the toolbar
        // rather than as the summary's footnote.
        <p className="border-t border-border pt-3 text-xs text-subtle-foreground">
          {t("tracking_since")}{" "}
          <Loadable loading={loading} placeholder={tCommon("january_1") + " 2024"}>
            {trackingSince
              ? new Date(trackingSince).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : null}
          </Loadable>
        </p>
      ) : null}
    </div>
  );
}

export default function AdminProfitPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  /**
   * The frame comes from `DataTable`, not from this page.
   *
   * This was the one admin page that hand-rolled `container pt-24 pb-16` with
   * its own `<h1>` and passed no `title`, which put it in the table's non-hero
   * layout: no hero, a different heading treatment from every sibling under
   * `/admin/finance`, and the overview/analytics switch rendered as a
   * full-width two-column tab strip instead of the pair of buttons in the
   * header. Passing `title` + `design` adopts the house frame — which also owns
   * the 64px of clearance the fixed site header needs — and `alertContent` is
   * the slot the summary belongs in, the same one `/admin/copy-trading/trade`
   * uses for its stats row.
   */
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/profit"
      model="adminProfit"
      permissions={{
        access: "access.admin.profit",
        view: "view.admin.profit",
        create: "create.admin.profit",
        edit: "edit.admin.profit",
        delete: "delete.admin.profit",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete
      canView
      isParanoid={false}
      title={t("profit_management")}
      description={t("track_and_manage_platform_fees_revenue")}
      itemTitle="Profit"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      alertContent={<ProfitSummaryDashboard />}
      design={{
        icon: Wallet,
      }}
    />
  );
}
