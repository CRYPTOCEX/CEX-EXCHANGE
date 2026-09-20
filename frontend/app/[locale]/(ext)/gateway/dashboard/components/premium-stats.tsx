"use client";

/**
 * The dashboard KPI row.
 *
 * Rebuilt on `StatsCard` — the one card shell (`components/ui/card/stats-card.tsx`)
 * — rather than a fourth private implementation of it. What was here before had
 * three separate problems, none of them cosmetic:
 *
 * 1. **Two of the four figures were invented.** "Payments (30d)" and "Net
 *    revenue (30d)" carried hardcoded `+12.5%` and `+8.3%` deltas with a green
 *    up-arrow. They were string literals — nothing computed them, and they never
 *    changed whatever the merchant's actual numbers did. A fabricated trend on a
 *    revenue figure is worse than no trend, so they are gone rather than
 *    restyled. The API does not return a prior-period comparison; when it does,
 *    pass it as `change` and `StatsCard` will colour the direction itself.
 *
 * 2. **The gradient classes did not render.** Every tile was
 *    `bg-linear-to-br ${stat.bgGradient}` where `bgGradient` was `bg-success/10`
 *    — a gradient *direction* with no `from-*`/`to-*` stops, so it emitted
 *    `linear-gradient(to bottom right, )`, which is invalid and painted
 *    nothing. Three of the four tiles therefore got a flat tint by accident,
 *    while the fourth (`from-warning/10 to-destructive/10`) had real stops and
 *    rendered a two-hue gradient. One card in a row of four looking unlike the
 *    other three was the visible symptom of a dead class name.
 *
 * 3. `backdrop-blur-sm`, `hover:shadow-xl`, a `blur-3xl` orb and a translating
 *    "shine" layer — four ways of faking elevation on a shell whose elevation is
 *    supposed to be one hairline and one rung (R3).
 *
 * 4. **Three of the four figures were dollars nobody had converted.**
 *    `availableBalance` arrived as `balances.reduce((s, b) => s + b.available, 0)`
 *    over rows that are one per (currency, walletType), and `StatsCard` defaults
 *    `currency` to "USD" — so a merchant holding 40,000 NGN and 0.5 BTC was told
 *    they had "$40,000.50 available", a figure that is not dollars and not naira
 *    and not bitcoin. The 30-day captions said it out loud, running a hardcoded
 *    `toLocaleString("en-US", { currency: "USD" })` over a SQL `SUM(amount)`
 *    taken across every currency the merchant accepts. The first card's own
 *    caption — "Across 3 currencies" — was the code admitting the mix. This row
 *    now prints only figures the server has already converted at each currency's
 *    own rate, and where there is no converted figure it prints the per-currency
 *    breakdown rather than inventing a total.
 */

import { DollarSign, CreditCard, TrendingUp, RefreshCcw } from "lucide-react";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { formatMoney } from "@/utils/currency";
import { useTranslations } from "next-intl";

/** A merchant balance collapsed onto its currency — the wallet types summed. */
export interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface PremiumStatsProps {
  /**
   * Every balance converted at ITS OWN rate and added up, server-side, or
   * `null` when the dashboard route sent no converted figure.
   *
   * `null` is not zero and must not be rendered as one: it means "nobody has
   * priced these", and the tile falls back to `availableByCurrency` below.
   */
  availableBalanceUSD: number | null;
  /**
   * The balances behind that total, one entry per currency. This is what the
   * tile shows when there is no converted total — a real figure in a real unit,
   * which beats a wrong figure with a dollar sign in front of it.
   */
  availableByCurrency: CurrencyAmount[];
  /**
   * Currencies the server holds a balance in but could not price. Their money
   * is MISSING from `availableBalanceUSD`, so the caption says so — an
   * incomplete total the merchant knows is incomplete is not a wrong one.
   */
  unpricedCurrencies?: string[];
  payments30d: number;
  /** 30-day gross, converted server-side. `null` = no converted figure exists. */
  totalAmount30dUSD: number | null;
  /** 30-day net, converted server-side. `null` = no converted figure exists. */
  netRevenue30dUSD: number | null;
  /** 30-day fees, converted server-side. `null` = no converted figure exists. */
  fees30dUSD: number | null;
  pendingRefunds: number;
  /**
   * The dashboard fetch is still out.
   *
   * `StatsCard` keeps its own shell in this state and swaps only the figure, so
   * this row does not need — and must not have — a skeleton of its own. It
   * matters here because the caller defaults the counts to zero and the money
   * to `null`: without the flag the row renders four confident zeroes, and
   * "$0.00 available / 0 payments" on a payments dashboard is not a neutral
   * placeholder, it is the worst news the page can carry, asserted as fact.
   */
  loading?: boolean;
}

/**
 * Dollars. ONLY ever called on a figure the server has converted — the point of
 * this file's fix is that `usd()` no longer decorates a raw cross-currency sum.
 */
const usd = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** One balance line, in its own denomination. `formatMoney` keeps non-ISO codes
 *  ("USDT", "BTC") out of `Intl`'s currency style, which throws on them. */
const inOwnCurrency = ({ currency, amount }: CurrencyAmount) =>
  formatMoney(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });

/**
 * What the balance tile can honestly print.
 *
 * In order of preference: the server's converted total; the single currency the
 * merchant actually holds (a one-currency figure needs no conversion, it just
 * needs its own code carried to the formatter); nothing at all, with the
 * per-currency amounts moved into the caption. The one thing it will not do is
 * add the rows together.
 */
function balanceTile(
  usdTotal: number | null,
  rows: CurrencyAmount[]
): { value: number | string; currency: string; breakdown: string | null } {
  if (usdTotal !== null) return { value: usdTotal, currency: "USD", breakdown: null };
  if (rows.length === 0) return { value: 0, currency: "USD", breakdown: null };
  if (rows.length === 1)
    return { value: rows[0].amount, currency: rows[0].currency, breakdown: null };
  return { value: "—", currency: "USD", breakdown: rows.map(inOwnCurrency).join(" · ") };
}

export function PremiumStats({
  availableBalanceUSD,
  availableByCurrency,
  unpricedCurrencies = [],
  payments30d,
  totalAmount30dUSD,
  netRevenue30dUSD,
  fees30dUSD,
  pendingRefunds,
  loading = false,
}: PremiumStatsProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  /**
   * The captions carry figures too, and `description` is a plain `string` on
   * `StatsCard` — there is nowhere to put a `Loadable` inside it. So the
   * figure is replaced by an em dash while pending rather than printed as a
   * zero: "Across — currencies" says the count is not in yet, "Across 0
   * currencies" says the merchant holds no balances at all. The caption row
   * renders either way, which is what keeps the card's height fixed.
   */
  const figure = (value: string) => (loading ? "—" : value);

  const currencyCount = availableByCurrency.length;
  const balance = balanceTile(availableBalanceUSD, availableByCurrency);

  /* The count caption keeps its old shape, plus the one thing it never said:
     which of those currencies is missing from the figure above it. */
  const countCaption =
    `Across ${figure(String(currencyCount))} ${currencyCount === 1 && !loading ? "currency" : "currencies"}` +
    (unpricedCurrencies.length && !loading
      ? ` · no USD rate for ${unpricedCurrencies.join(", ")}`
      : "");

  /* `loading ||` on both captions so the pending row keeps the money SHAPE
     ("— total") it will settle into. Without it the caption would start as the
     no-conversion prose and be replaced by a figure, resizing the whole KPI row
     — which `StatsCard` goes to some length to avoid. */
  const grossCaption =
    loading || totalAmount30dUSD !== null
      ? `${figure(usd(totalAmount30dUSD ?? 0))} total`
      : "completed in the last 30 days";
  const feesCaption =
    loading || fees30dUSD !== null
      ? `${figure(usd(fees30dUSD ?? 0))} in fees`
      : "mixed currencies — see recent payments";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        label={tCommon("available_balance")}
        value={balance.value}
        isCurrency
        currency={balance.currency}
        icon={DollarSign}
        description={balance.breakdown ?? countCaption}
        index={0}
        loading={loading}
        {...statsCardColors.success}
      />
      <StatsCard
        label="Payments (30d)"
        value={payments30d}
        icon={CreditCard}
        description={grossCaption}
        index={1}
        loading={loading}
        {...statsCardColors.primary}
      />
      <StatsCard
        label="Net revenue (30d)"
        /* A SUM over payments in every currency the merchant accepts is not a
           revenue figure, so it is not printed as one: with no converted total
           this tile shows nothing and says why, rather than putting a "$" on
           naira plus bitcoin. `0` while loading is never seen — the card draws
           a placeholder — and keeps the figure metrics tabular. */
        value={netRevenue30dUSD ?? (loading ? 0 : "—")}
        isCurrency
        icon={TrendingUp}
        description={feesCaption}
        index={2}
        loading={loading}
        {...statsCardColors.info}
      />
      <StatsCard
        label={t("pending_refunds")}
        value={pendingRefunds}
        icon={RefreshCcw}
        description={t("awaiting_processing")}
        index={3}
        loading={loading}
        {...statsCardColors.warning}
      />
    </div>
  );
}
