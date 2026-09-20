"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loadable } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Eye,
  Info,
  RefreshCcw,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { statusTone } from "@/lib/status-tone";
import { useMerchantMode } from "../context/merchant-mode";
import { useTranslations } from "next-intl";
import { useAddonDisplayName } from "@/hooks/use-addon-display-name";
import { PayoutHero } from "./components/payout-hero";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";

/**
 * `GET /api/gateway/balance` returns `{ currency, walletType, available, ... }`
 * and has never returned an `id` — see
 * `backend/src/api/(ext)/gateway/balance/index.get.ts`, which projects the
 * columns by hand. The interface declared one anyway, so `balance.id` was
 * `undefined` on every row and React fell back to the index-key warning
 * ("Each child in a list should have a unique key prop").
 *
 * The rows are one per wallet type per currency, so that pair IS the identity.
 */
interface Balance {
  currency: string;
  walletType: string;
  available: number;
  pending: number;
  reserved: number;
  totalReceived: number;
  totalRefunded: number;
  totalFees: number;
  totalPaidOut: number;
}

/**
 * The `summary` block of the same response.
 *
 * `summary.totalAvailable` is deliberately NOT read here, and neither is
 * `totalPending` or `totalReserved`: each is `Σ` over the rows above, which are
 * one per (currency, walletType), so a merchant settling in naira, bitcoin and
 * USDT gets one scalar that is none of those three. Only the `*USD` fields —
 * each row converted at its own rate, server-side, where the rate table lives —
 * can be printed as money. They are optional because a backend that has not
 * shipped them yet must degrade to the per-currency breakdown, not to a wrong
 * number.
 */
interface BalanceTotals {
  totalAvailableUSD?: number | null;
  totalPendingUSD?: number | null;
  totalPaidOutUSD?: number | null;
  /** Held currencies with no usable rate. Their money is NOT in the totals. */
  unpricedCurrencies?: string[];
}

/** A balance collapsed onto its currency, the wallet types summed. */
interface CurrencyAmount {
  currency: string;
  amount: number;
}

/**
 * Collapse the balance rows onto currency alone. Two USD rows (one FIAT, one
 * SPOT) are the same unit, so adding them is arithmetic; adding a USD row to an
 * NGN row is not, and nothing below does it.
 */
function sumByCurrency(
  rows: Balance[],
  pick: (row: Balance) => number
): CurrencyAmount[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + (Number(pick(row)) || 0));
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
}

interface MoneyTile {
  value: number | string;
  currency: string;
  /** Set only when there is no single unit to print — the per-currency list. */
  note: string | null;
}

/**
 * What a KPI tile can honestly print, in order of preference: the server's
 * converted total; the one currency the merchant actually holds (which needs no
 * conversion, only its own code carried to the formatter); or no total at all,
 * with the individual amounts moved into the caption.
 *
 * All three tiles used to take a fourth option — add the rows up and prefix a
 * literal "$" — which is what put "$40,025.50 available" in front of a merchant
 * holding ₦40,000, 0.5 BTC and 25 USDT.
 */
function moneyTile(
  usdTotal: number | null | undefined,
  rows: CurrencyAmount[],
  format: (amount: number, currency: string) => string
): MoneyTile {
  if (typeof usdTotal === "number") return { value: usdTotal, currency: "USD", note: null };
  if (rows.length === 0) return { value: 0, currency: "USD", note: null };
  if (rows.length === 1) return { value: rows[0].amount, currency: rows[0].currency, note: null };
  return {
    value: "—",
    currency: "USD",
    note: rows.map((r) => format(r.amount, r.currency)).join(" · "),
  };
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  walletType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  paymentCount: number;
  refundCount: number;
  createdAt: string;
}

/**
 * Icon + label only; the hue comes from `statusTone()`. Decided locally before,
 * and it disagreed with the shared table on two of five: `PROCESSING` wore the
 * accent (R2 reserves it for things you click) and `CANCELLED` was grey where
 * the platform says destructive.
 */
const STATUS_CONFIG: Record<string, { icon: any; label: string }> = {
  PENDING: { icon: Clock, label: "Pending" },
  PROCESSING: { icon: RefreshCcw, label: "Processing" },
  COMPLETED: { icon: CheckCircle2, label: "Completed" },
  FAILED: { icon: XCircle, label: "Failed" },
  CANCELLED: { icon: XCircle, label: "Cancelled" },
};

/** The `soft` chip recipe, for the status chips that are not Badges. */
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

const DEFAULT_WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  FIAT: { label: "Fiat", icon: Banknote, color: "text-success" },
  SPOT: { label: "Spot", icon: Coins, color: "text-warning" },
  ECO: { label: "Ecosystem", icon: CircleDollarSign, color: "text-primary" },
};

/**
 * Placeholder rows for the two lists on this page.
 *
 * Neither list has a knowable length, so these reserve a container of a
 * plausible size and accept that the count settles — which is the doc's advice
 * and a great deal better than what was here, where both lists rendered their
 * EMPTY state during the fetch and then jumped.
 *
 * Every field is replaced by a placeholder at render time; the objects exist
 * only to give the map something to iterate.
 */
const PENDING_BALANCES: Balance[] = ["FIAT", "SPOT"].map((walletType) => ({
  /* A REAL currency code, not a marker string: `MoneyFigure` splits the unit off
     the value it is given and keeps it visible while the digits are pending, so
     a placeholder row reading `▁▁▁▁ USD` is the shape the real row will have.
     The wallet type doubles as the row key, so the two differ. */
  currency: "USD",
  walletType,
  available: 0,
  pending: 0,
  reserved: 0,
  totalReceived: 0,
  totalRefunded: 0,
  totalFees: 0,
  totalPaidOut: 0,
}));

const PENDING_PAYOUTS: Payout[] = Array.from({ length: 3 }, (_, i) => ({
  id: `pending-${i}`,
  amount: 0,
  currency: "USD",
  walletType: "FIAT",
  status: "PENDING",
  periodStart: new Date().toISOString(),
  periodEnd: new Date().toISOString(),
  grossAmount: 0,
  feeAmount: 0,
  netAmount: 0,
  paymentCount: 0,
  refundCount: 0,
  createdAt: new Date().toISOString(),
}));

export default function PayoutsClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { mode } = useMerchantMode();
  const { getWalletTypeLabel } = useAddonDisplayName();

  const WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    ...DEFAULT_WALLET_CONFIG,
    ECO: { ...DEFAULT_WALLET_CONFIG.ECO, label: getWalletTypeLabel("ECO", "Ecosystem") },
  };
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [balanceTotals, setBalanceTotals] = useState<BalanceTotals | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchData();
  }, [mode]);

  const fetchData = async () => {
    setLoading(true);

    // Check merchant first
    const merchantRes = await $fetch({
      url: "/api/gateway/merchant",
      silent: true,
    });

    if (merchantRes.error || !merchantRes.data?.merchant) {
      setNeedsRegistration(true);
      setLoading(false);
      return;
    }

    // Fetch balances and payouts in parallel
    const [balancesRes, payoutsRes] = await Promise.all([
      $fetch({ url: "/api/gateway/balance", silent: true }),
      $fetch({ url: "/api/gateway/payout", silent: true }),
    ]);

    if (balancesRes.data) {
      setBalances(balancesRes.data.balances || balancesRes.data || []);
      /* `?? null` and not `|| {}`: an absent summary must read as "no converted
         total exists" so the KPI tiles fall back to the per-currency figures,
         which is a different thing from a summary whose totals are zero. */
      setBalanceTotals(balancesRes.data.summary ?? null);
    }

    if (payoutsRes.data) {
      setPayouts(payoutsRes.data.items || payoutsRes.data || []);
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number, currency: string, decimals = 2) => {
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: Math.max(decimals, 8)
    })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  /**
   * THE THREE KPI FIGURES, IN UNITS THAT EXIST.
   *
   * These were `balances.reduce((sum, b) => sum + b.available, 0)` and two more
   * like it, each rendered as `` `$${total.toLocaleString(...)}` `` — a literal
   * dollar sign in front of a number that had ₦40,000 and 0.5 BTC and 25 USDT
   * added together. The merchant was shown "$40,025.50 ready for payout" for a
   * balance that contained about $70,000 of bitcoin and no dollars at all, and
   * the card immediately below on the same page listed the real per-currency
   * amounts, so the page contradicted itself.
   *
   * `moneyTile` prefers the server's converted total, falls back to the single
   * currency when there is only one (no conversion needed — the figure just has
   * to carry its own code to the formatter), and otherwise prints no total and
   * moves the per-currency amounts into the caption.
   */
  const availableTile = moneyTile(
    balanceTotals?.totalAvailableUSD,
    sumByCurrency(balances, (b) => b.available),
    formatCurrency
  );
  const pendingTile = moneyTile(
    balanceTotals?.totalPendingUSD,
    sumByCurrency(balances, (b) => b.pending),
    formatCurrency
  );
  const paidOutTile = moneyTile(
    balanceTotals?.totalPaidOutUSD,
    sumByCurrency(balances, (b) => b.totalPaidOut),
    formatCurrency
  );

  /* A converted total that silently drops the currencies nobody could price
     under-reports the merchant's money. Saying which ones is the difference
     between an incomplete figure and a wrong one. */
  const unpriced = balanceTotals?.unpricedCurrencies ?? [];
  const caption = (base: string, tile: MoneyTile) =>
    tile.note ??
    (unpriced.length && !loading ? `${base} · no USD rate for ${unpriced.join(", ")}` : base);

  // Filter payouts by status
  const filteredPayouts = activeTab === "all"
    ? payouts
    : payouts.filter(p => p.status === activeTab.toUpperCase());

  /**
   * NO `if (loading) return <PayoutsLoading/>`.
   *
   * `./loading.tsx` is five grey boxes in a column. The real page is a hero
   * with a refresh button and a three-up KPI row, a balances card, an
   * information alert, and a history card with a four-tab bar — none of which
   * needs the fetch to be drawn, and all of which the imported skeleton
   * replaced wholesale. The tab bar in particular is pure chrome: its labels
   * are literals in this file, and it was being withheld for the length of two
   * network round trips.
   *
   * `loading` now reaches the values instead. The two lists below get
   * placeholder ROWS rather than their empty states, because "we have not
   * asked yet" and "you have no payouts" are different things to say.
   */
  const balanceRows = loading ? PENDING_BALANCES : balances;
  const payoutRows = loading ? PENDING_PAYOUTS : filteredPayouts;

  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant_1")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <PayoutHero
        rightContent={
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
        bottomSlot={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* The three captions are static strings this file already holds,
                so they render in both states; `loading` swaps only the figure
                inside the card's own typography. Without it these read "$0.00
                available / $0.00 all time", which on a payouts page is a
                statement about the merchant's money, not a placeholder. */}
            {/* `isCurrency` + `currency` rather than a hand-built "$" string:
                the card runs the figure through `formatMoney`, which is the one
                formatter that will not throw on a four-letter crypto ticker and
                will not force "USDT" through Intl's dollar path. */}
            <StatsCard
              label={tCommon("available_balance")}
              value={availableTile.value}
              isCurrency
              currency={availableTile.currency}
              icon={Wallet}
              description={caption(t("ready_for_payout"), availableTile)}
              index={0}
              loading={loading}
              {...statsCardColors.success}
            />

            <StatsCard
              label={t("pending_balance")}
              value={pendingTile.value}
              isCurrency
              currency={pendingTile.currency}
              icon={Clock}
              description={caption(t("processing_payments"), pendingTile)}
              index={1}
              loading={loading}
              {...statsCardColors.warning}
            />

            <StatsCard
              label={tExt("total_paid_out")}
              value={paidOutTile.value}
              isCurrency
              currency={paidOutTile.currency}
              icon={TrendingUp}
              description={caption(tCommon("all_time"), paidOutTile)}
              index={2}
              loading={loading}
              {...statsCardColors.primary}
            />
          </div>
        }
      />

      <div className="container mx-auto space-y-6 pb-6 pt-8">

      {/* Balance Breakdown by Wallet Type. Gated on the ROWS, so the card is
          present while they are pending and absent only when the merchant
          genuinely holds no balances — it used to be absent for both. */}
      {balanceRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("balance_by_wallet")}
            </CardTitle>
            <CardDescription>{t("your_balance_breakdown_across_different_wallet")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balanceRows.map((balance) => {
                const walletConfig = WALLET_CONFIG[balance.walletType] || WALLET_CONFIG.FIAT;
                const WalletIcon = walletConfig.icon;

                return (
                  <div
                    key={`${balance.walletType}-${balance.currency}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface-2"
                  >
                    <div className="flex items-center gap-4">
                      {/* One rung ABOVE the row it sits on. It was `bg-background`,
                          i.e. the page ground, which reads as a hole punched in
                          the row rather than as a raised tile (R3). */}
                      <div className="p-2 rounded-lg bg-surface-3">
                        <WalletIcon className={`h-5 w-5 ${walletConfig.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{walletConfig.label} Wallet</span>
                          <Badge variant="outline">
                            <Loadable loading={loading} placeholder="USD">
                              {balance.currency}
                            </Loadable>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{tExt("received")}: <Loadable loading={loading} placeholder="1,234.00 USD">{formatCurrency(balance.totalReceived, balance.currency)}</Loadable></span>
                          <span>{tCommon("fees")}: <Loadable loading={loading} placeholder="12.00 USD">{formatCurrency(balance.totalFees, balance.currency)}</Loadable></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        <MoneyFigure
                          loading={loading}
                          figurePlaceholder="1,234.00"
                          value={formatCurrency(balance.available, balance.currency)}
                        />
                      </p>
                      {balance.pending > 0 && (
                        <p className="text-sm text-warning">
                          +{formatCurrency(balance.pending, balance.currency)} pending
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Schedule Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("payouts_are_processed_automatically_based_on")} {t("available_balance_is_transferred_to_your")}
        </AlertDescription>
      </Alert>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("payout_history")}
          </CardTitle>
          <CardDescription>{t("your_past_and_pending_payouts")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {/* `loading` is not `empty`: this branch used to show "No payouts
                  found" for the whole fetch and then replace it with the list. */}
              {payoutRows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">{t("no_payouts_found")}</p>
                  <p className="text-sm">
                    {activeTab === "all"
                      ? t("payouts_will_appear_here_once_you")
                      : t("no_payouts_at_the_moment", { activeTab: String(activeTab) })}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutRows.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PENDING;
                    /* Neutral while pending — a status chip is a claim about a
                       payout, and these rows do not have one yet. */
                    const tone = loading ? ("neutral" as BadgeTone) : statusTone(payout.status);
                    const StatusIcon = loading ? Wallet : statusConfig.icon;
                    const walletConfig = WALLET_CONFIG[payout.walletType] || WALLET_CONFIG.FIAT;
                    const WalletIcon = walletConfig.icon;

                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border transition-colors hover:border-border-strong hover:bg-surface-2"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${TONE_SURFACE[tone]} border`}>
                            <StatusIcon className={`h-5 w-5 ${TONE_INK[tone]}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {`${`${tCommon("payout")}:`} #`}
                                <Loadable loading={loading} chars={8}>
                                  {payout.id.slice(-8)}
                                </Loadable>
                              </span>
                              <Badge tone={tone} appearance="soft">
                                <Loadable loading={loading} placeholder="Completed">
                                  {statusConfig.label}
                                </Loadable>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <Loadable loading={loading} placeholder={t("jan_1_2026_jan_31") + " 2026"}>
                                  {formatDateRange(payout.periodStart, payout.periodEnd)}
                                </Loadable>
                              </span>
                              <span className="flex items-center gap-1">
                                <WalletIcon className="h-3 w-3" />
                                {walletConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>
                                <Loadable loading={loading} chars={2}>
                                  {payout.paymentCount}
                                </Loadable>{" "}
                                payments
                              </span>
                              {payout.refundCount > 0 && (
                                <span className="text-destructive">{payout.refundCount} refunds</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              <MoneyFigure
                                loading={loading}
                                figurePlaceholder="1,234.00"
                                value={formatCurrency(payout.netAmount, payout.currency)}
                              />
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{t("gross")}: <Loadable loading={loading} placeholder="1,234.00 USD">{formatCurrency(payout.grossAmount, payout.currency)}</Loadable></span>
                              <span className="text-destructive">-<Loadable loading={loading} placeholder="12.00 USD">{formatCurrency(payout.feeAmount, payout.currency)}</Loadable></span>
                            </div>
                          </div>
                          {/*
                            ONE node in both states. The row's control is 40px
                            of the row's width (`size="icon"` is h-10 w-10) and
                            it keeps that box throughout — but a pending row has
                            a placeholder id, so it must not link anywhere yet.

                            This was `loading ? <Button disabled/> : <Link><Button/></Link>`:
                            two different roots for one control, and the
                            resolved half nested a `<button>` inside an `<a>`.
                            Interactive content inside a link is invalid HTML
                            and gives the row two tab stops for one affordance.
                            `asChild` puts the button's box on the anchor
                            itself, so there is no second element to measure.

                            Inert while pending via `disabled`, which on an
                            asChild Button becomes `aria-disabled` (an anchor
                            has no `disabled` attribute) and from there
                            `pointer-events-none` in the base styles — plus
                            `tabIndex={-1}`, because that stops the mouse and
                            not the keyboard.
                          */}
                          <Button variant="ghost" size="icon" asChild disabled={loading}>
                            <Link
                              href={loading ? "#" : `/gateway/payouts/${payout.id}`}
                              tabIndex={loading ? -1 : undefined}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
