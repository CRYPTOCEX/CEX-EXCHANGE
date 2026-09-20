"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
import { statusTone } from "@/lib/status-tone";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Key,
  Settings,
  FileText,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Banknote,
  Coins,
  CircleDollarSign,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMoney } from "@/utils/currency";
import $fetch from "@/lib/api";
import { useMerchantMode } from "../context/merchant-mode";
import { GatewayDashboardHero } from "./components/dashboard-hero";
import { PremiumStats, type CurrencyAmount } from "./components/premium-stats";

interface MerchantDashboard {
  merchant: {
    id: string;
    name: string;
    slug: string;
    email: string;
    logo?: string;
    status: string;
    verificationStatus: string;
    testMode: boolean;
    createdAt: string;
  };
  /**
   * ONE ROW PER (currency, walletType). These are not addable — see
   * `availableByCurrency` below.
   */
  balances: Array<{
    currency: string;
    walletType: string;
    available: number;
    pending: number;
    reserved: number;
  }>;
  /**
   * The USD figures, converted server-side where the rate helpers live.
   *
   * All optional and all read with `??`: the route only started sending them
   * recently, and an older backend (or a deploy where the two halves land out of
   * order) must degrade to the per-currency breakdown rather than to a number
   * that is the sum of naira and bitcoin.
   */
  totalAvailableUSD?: number | null;
  totalPendingUSD?: number | null;
  /** Currencies with no usable rate — their balances are NOT in the totals above. */
  unpricedCurrencies?: string[];
  stats: {
    last30Days: {
      paymentCount: number;
      /**
       * NATIVE-UNIT SUMS — AND THE ROUTE NO LONGER SENDS THEM.
       *
       * These were flat SQL sums over every payment in the period WHATEVER its
       * currency: the shape that reported a month of ₦40,000 + 0.5 BTC + 25 USDT
       * as "$40,025.50". The route now buckets by currency, converts each at its
       * own rate and returns only the `*USD` fields below, so against a current
       * backend all four of these are `undefined` — hence optional. Still
       * rendered nowhere: an older backend would put them back, and they are no
       * more addable now than they were then.
       */
      totalAmount?: number;
      totalRefunded?: number;
      totalFees?: number;
      totalNet?: number;
      /** The same three sums, each payment converted at its own rate. */
      totalAmountUSD?: number | null;
      totalFeesUSD?: number | null;
      totalNetUSD?: number | null;
    };
    pendingRefunds: number;
  };
  recentPayments: Array<{
    id: string;
    orderId?: string;
    amount: number;
    currency: string;
    walletType: string;
    feeAmount: number;
    description?: string;
    status: string;
    customer?: {
      name: string;
      email: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
  mode: "LIVE" | "TEST";
}

/**
 * Icon + label only. The hue comes from `statusTone()` so this view cannot
 * disagree with the rest of the app about what `PROCESSING` or `CANCELLED`
 * mean.
 */
const STATUS_CONFIG: Record<string, { icon: any; label: string }> = {
  COMPLETED: { icon: CheckCircle, label: "Completed" },
  PENDING: { icon: Clock, label: "Pending" },
  PROCESSING: { icon: Clock, label: "Processing" },
  FAILED: { icon: XCircle, label: "Failed" },
  CANCELLED: { icon: XCircle, label: "Cancelled" },
  EXPIRED: { icon: AlertCircle, label: "Expired" },
  REFUNDED: { icon: RefreshCcw, label: "Refunded" },
  PARTIALLY_REFUNDED: { icon: RefreshCcw, label: "Partially Refunded" },
};

/**
 * The icon chip is not a Badge, so it derives its surface from the same tone
 * the pill beside it uses — the `soft` recipe, not a second opinion.
 */
const TONE_SURFACE: Record<BadgeTone, string> = {
  primary: "bg-primary/10 border-primary/20 text-primary-ink",
  secondary: "bg-secondary border-transparent text-secondary-foreground",
  success: "bg-success/10 border-success/20 text-success-ink",
  warning: "bg-warning/10 border-warning/20 text-warning-ink",
  destructive: "bg-destructive/10 border-destructive/20 text-destructive-ink",
  info: "bg-info/10 border-info/20 text-info-ink",
  neutral: "bg-muted border-transparent text-muted-foreground",
};

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const WALLET_COLORS: Record<string, string> = {
  FIAT: "text-success-ink bg-success/10",
  SPOT: "text-warning-ink bg-warning/10",
  ECO: "text-primary-ink bg-primary/10",
};

/**
 * Rows to draw while the payment list is in flight.
 *
 * A list has no knowable length, so this reserves a CONTAINER of three rows and
 * accepts that the count settles — the alternative the page used, rendering
 * nothing at all, made the card collapse to its empty state and then jump to
 * full height. Every value in these objects is replaced by a placeholder at
 * render time; they exist only to give the map something to iterate.
 */
const PENDING_PAYMENT_ROWS: MerchantDashboard["recentPayments"] = Array.from(
  { length: 3 },
  (_, i) => ({
    id: `pending-${i}`,
    amount: 0,
    currency: "USD",
    walletType: "FIAT",
    feeAmount: 0,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  })
);

/**
 * Collapse the balance rows onto currency alone.
 *
 * The route returns one row per (currency, walletType), so a merchant holding
 * USD in FIAT and USD in SPOT has two USD rows. Adding those two IS arithmetic —
 * they are the same unit — which is the only addition anywhere near this page
 * that is not a category error.
 */
function sumByCurrency(
  rows: MerchantDashboard["balances"] | undefined,
  pick: (row: MerchantDashboard["balances"][number]) => number
): CurrencyAmount[] {
  const totals = new Map<string, number>();
  for (const row of rows ?? []) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + (Number(pick(row)) || 0));
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function MerchantDashboardClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { mode, isTestMode } = useMerchantMode();
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [mode]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await $fetch({
        url: `/api/gateway/merchant?mode=${mode}`,
        silent: true,
      });

      if (fetchError || !data?.merchant) {
        setNeedsRegistration(true);
        return;
      }

      setDashboard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * NO `if (loading) return <GatewayDashboardLoading/>` — that was a whole-page
   * swap wearing an import.
   *
   * `./loading.tsx` is three grey rectangles: `h-32`, `h-64`, `h-96`. The real
   * page is a hero with a badge, a title, two buttons and a four-up KPI row,
   * then a bordered card with a header, a "View all" button and a list. Nothing
   * about the second shape predicts the first, so every dashboard load painted
   * one layout and then replaced it wholesale with an unrelated one — and
   * because the skeleton is a separate file, no edit to this page could ever
   * keep the two in agreement.
   *
   * All of that chrome is knowable before the fetch resolves. It renders now,
   * and `loading` is passed down to the values instead.
   */
  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 pt-20">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      // `pt-20`, matching the `needsRegistration` branch directly above: both
      // replace the page, so both have to clear the `fixed top-0` header. Only
      // one of them did, which is why the two states sat at different heights.
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 pt-20">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-xl font-semibold">{tCommon('error_loading_dashboard')}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchDashboard}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  /**
   * BALANCES ARE PER CURRENCY, SO THEY DO NOT ADD UP.
   *
   * This was `balances.reduce((sum, b) => sum + b.available, 0)`, handed to a
   * `StatsCard` with `isCurrency` — and that card defaults `currency` to "USD",
   * which is where the dollar sign came from without a "$" appearing anywhere in
   * this file. A merchant holding ₦40,000, 0.5 BTC and 25 USDT read
   * "$40,025.50 available". The rows are one per (currency, walletType), so the
   * only two honest things to do with them are convert each at its own rate —
   * which happens on the server, where the rate table is — or show them
   * separately. This collapses the wallet types onto the currency (a merchant
   * does not care that 300 of their USD is in SPOT and 200 in FIAT when they are
   * reading a total) and hands both the converted figure and the breakdown to
   * the KPI row, which prefers the first and falls back to the second.
   */
  const availableByCurrency = sumByCurrency(dashboard?.balances, (b) => b.available);
  const totalAvailableUSD = dashboard?.totalAvailableUSD ?? null;
  const totalPendingUSD = dashboard?.totalPendingUSD ?? null;

  // Calculate stats for hero
  const totalPayments = dashboard?.stats.last30Days.paymentCount || 0;
  /* `GatewayDashboardHero` destructures both of these and renders neither, so
     nobody has ever seen them — but they are typed `number`, and the previous
     expressions (`totalNet`, a cross-currency SQL SUM, and a reduce over the
     balance rows) were not numbers in any denomination. They carry the converted
     figures, or 0 when the server sent none. */
  const totalRevenue = dashboard?.stats.last30Days.totalNetUSD ?? 0;
  const pendingAmount = totalPendingUSD ?? 0;
  const successRate = totalPayments > 0
    ? Math.round(((totalPayments - (dashboard?.stats.pendingRefunds || 0)) / totalPayments) * 100)
    : 0;

  /* One list, two states: placeholder rows while the fetch is out, real rows
     after. The empty state below is then reachable only when the merchant
     genuinely has no payments. */
  const paymentRows = loading
    ? PENDING_PAYMENT_ROWS
    : dashboard?.recentPayments ?? [];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <GatewayDashboardHero
        totalPayments={totalPayments}
        totalRevenue={totalRevenue}
        pendingAmount={pendingAmount}
        successRate={successRate}
        merchantStatus={dashboard?.merchant.status || "PENDING"}
        /* The hero's badge PRINTS the account status, so it must not fall back
           to "Pending Approval" while the merchant is still loading — that is
           an active merchant being told, for as long as the fetch takes, that
           their account is awaiting approval. */
        loading={loading}
        rightContent={
          <div className="flex gap-2">
            <Link href="/gateway/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Link href="/gateway/settings?tab=api-keys">
              <Button variant="outline">
                <Key className="h-4 w-4 mr-2" />
                {tCommon("api_keys")}
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <PremiumStats
            availableBalanceUSD={totalAvailableUSD}
            availableByCurrency={availableByCurrency}
            unpricedCurrencies={dashboard?.unpricedCurrencies ?? []}
            payments30d={dashboard?.stats.last30Days.paymentCount || 0}
            /* `?? null`, never `|| 0`: a missing conversion and a genuine zero
               are different facts, and only the second one can be printed with
               a dollar sign. */
            totalAmount30dUSD={dashboard?.stats.last30Days.totalAmountUSD ?? null}
            netRevenue30dUSD={dashboard?.stats.last30Days.totalNetUSD ?? null}
            fees30dUSD={dashboard?.stats.last30Days.totalFeesUSD ?? null}
            pendingRefunds={dashboard?.stats.pendingRefunds || 0}
            /* Without this the KPI row would render four confident zeroes —
               "$0.00 available", "0 payments" — which is not a neutral
               placeholder on a payments dashboard, it is the worst possible
               news, stated as fact. */
            loading={loading}
          />
        }
      />

      <div className="container mx-auto space-y-6 pb-6 pt-8">

      {/* Status Warning */}
      {dashboard?.merchant.status === "PENDING" && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">{tExt("account_pending_approval")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("your_merchant_account_is_pending_approval")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{tExt("recent_payments")}</CardTitle>
            <CardDescription>{t("your_latest_payment_transactions")}</CardDescription>
          </div>
          <Link href="/gateway/payment">
            <Button variant="outline" size="sm">
              {tCommon("view_all")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/*
            `loading` and `empty` are different states and this card used to
            conflate them: `recentPayments.length > 0` is false while the fetch
            is in flight, so a merchant with a busy account was shown "No
            payments yet" — a 12-row-tall empty state — until the data landed,
            at which point the card grew by several hundred pixels.

            The pending rows below are the SAME row markup driven by
            placeholder objects, not a second layout.
          */}
          {paymentRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              {paymentRows.map((payment) => {
                // Unknown statuses have always rendered as PENDING here; keep
                // that so the label and the hue stay in agreement.
                const statusKey = STATUS_CONFIG[payment.status]
                  ? payment.status
                  : "PENDING";
                const statusConfig = STATUS_CONFIG[statusKey];
                /* A pending row must not assert a status: the tone is neutral
                   and the glyph is the generic payment mark, so nothing in it
                   reads as "this payment is pending". */
                const tone = loading ? ("neutral" as BadgeTone) : statusTone(statusKey);
                const StatusIcon = loading ? CreditCard : statusConfig.icon;
                const WalletIcon = loading ? Wallet : WALLET_ICONS[payment.walletType] || Wallet;
                // `bg-muted/10` was a 10% wash of a near-neutral over an already
                // near-neutral row — an invisible chip. An unknown wallet type
                // gets the ramp step instead.
                const walletColor =
                  WALLET_COLORS[payment.walletType] || "text-muted-foreground bg-surface-3";

                const row = (
                  /* `bg-card` INSIDE a `<Card>` is the same fill as its own
                     parent, so the row had no elevation and only its border
                     told you it was a row. One rung up (R3). */
                  <div className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-border-strong hover:bg-surface-3">
                    {/* Status Indicator */}
                    <div
                      className={`p-2 rounded-lg border ${TONE_SURFACE[tone]}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">
                          <Loadable loading={loading} placeholder="1,234.00 USD">
                            {`${payment.amount.toFixed(2)} ${payment.currency}`}
                          </Loadable>
                        </span>
                        <Badge tone={tone}>
                          <Loadable loading={loading} placeholder="Completed">
                            {statusConfig.label}
                          </Loadable>
                        </Badge>
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${walletColor}`}
                        >
                          <WalletIcon className="h-3 w-3" />
                          <Loadable loading={loading} placeholder="FIAT">
                            {payment.walletType}
                          </Loadable>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          <Loadable loading={loading} chars={24}>
                            {payment.id}
                          </Loadable>
                        </code>
                        {payment.description && (
                          <span className="truncate max-w-[200px]">
                            {payment.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer */}
                    {payment.customer && (
                      <div className="hidden md:flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={payment.customer.avatar}
                            alt={payment.customer.name}
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
                            Customer
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fee & Time */}
                    <div className="text-right shrink-0">
                      {/* THE "$" WAS INSIDE THE TRANSLATION.
                          `ext.fee_1` is the literal string "Fee: $", so a ₦2,500
                          fee on a naira payment printed as "Fee: $2500.00" —
                          right next to the line above, which correctly says
                          "2500.00 NGN". `fee_1` itself stays as it is: its other
                          caller, the landing fee calculator, quotes a genuinely
                          dollar-denominated example. This row uses the plain
                          `common.fee` label and hands the amount to `formatMoney`
                          with the payment's own currency, which also keeps
                          non-ISO codes ("USDT", "BTC") out of Intl's currency
                          style instead of forcing them into a "$". */}
                      <p className="text-sm font-medium text-muted-foreground">
                        {tCommon("fee")}:{" "}
                        <Loadable loading={loading} placeholder="0.00">
                          {formatMoney(payment.feeAmount ?? 0, payment.currency, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8,
                          })}
                        </Loadable>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Loadable loading={loading} placeholder="12m ago">
                          {formatTimeAgo(payment.createdAt)}
                        </Loadable>
                      </p>
                    </div>

                    {/* Arrow */}
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                );

                /*
                  ONE `<Link>` in both states, made inert while pending.

                  A pending row is genuinely not a destination — its id is a
                  placeholder, so navigating would open a payment that does not
                  exist — but the previous spelling bought that with
                  `loading ? <div>{row}</div> : <Link>{row}</Link>`, two
                  different wrapper elements around the same child. React
                  reconciles by type, so the entire row unmounted and remounted
                  when the fetch landed, and the two wrappers were not in fact
                  interchangeable: a `<div>` is block and an `<a>` is inline, so
                  the pending row and the real row were being laid out by
                  different rules and only agreed by accident of the block child
                  inside them.

                  `block` puts both on the same footing explicitly. Inertness is
                  spelled out three ways because each covers a different door:
                  `pointer-events-none` for the mouse (which also suppresses the
                  row's `cursor-pointer` and its hover tint, so a pending row
                  does not offer itself), `tabIndex={-1}` for the keyboard, and
                  `aria-disabled` for anything reading the page aloud.
                */
                return (
                  <Link
                    key={payment.id}
                    href={loading ? "#" : `/gateway/payment/${payment.id}`}
                    aria-disabled={loading || undefined}
                    tabIndex={loading ? -1 : undefined}
                    className={`block ${loading ? "pointer-events-none" : ""}`}
                  >
                    {row}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 rounded-full bg-surface-2 w-fit mx-auto mb-4">
                <CreditCard className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">{tExt("no_payments_yet")}</p>
              <p className="text-sm mt-1">
                {t("payments_will_appear_here_once_you")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      </div>
    </div>
  );
}
