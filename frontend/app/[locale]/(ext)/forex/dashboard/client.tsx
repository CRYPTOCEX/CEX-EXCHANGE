"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  Wallet,
  PlusCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Sparkles,
  Target,
  Info,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { m } from "framer-motion";

import { useUserStore } from "@/store/user";
import ForexAccounts from "./components/account";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
export default function DashboardClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  const {
    accounts,
    investments,
    dashboardData,
    fetchDashboardData,
    fetchAccounts,
    fetchPlans,
    fetchInvestments,
    hasFetchedPlans,
    hasFetchedAccounts,
    hasFetchedInvestments,
  } = useForexStore();

  // The account payload carries the currency its `balance` is denominated in;
  // the shared `ForexAccount` type predates that column.
  const liveAccount = Object.values(accounts).find(
    (acc) => acc.type === "LIVE"
  ) as (ForexAccount & { currency?: string | null }) | undefined;

  const [isLoading, setIsLoading] = useState(false);

  // Fetch dashboard data when user is available
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (!hasFetchedPlans) {
          await fetchPlans();
        }
        if (!hasFetchedAccounts) {
          await fetchAccounts();
        }
        // The recent-investment list below reads this array, and nothing else
        // on the page was filling it.
        if (!hasFetchedInvestments) {
          await fetchInvestments();
        }
        if (user) {
          await fetchDashboardData("1y");
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    user,
    hasFetchedPlans,
    hasFetchedAccounts,
    hasFetchedInvestments,
    fetchPlans,
    fetchAccounts,
    fetchInvestments,
    fetchDashboardData,
  ]);

  // Every figure below comes from `dashboardData.overview`, which the backend
  // computes across ALL of the user's investments and which this page already
  // fetches.
  //
  // They used to be reduced from the `investments` array — which nothing on
  // this page ever populated, and which the store filled from the wrong
  // response key even when something did. The result was a dashboard that told
  // a user with three active investments and $25,000 at work that they had
  // invested $0, earned $0 and held 0 investments, alongside a banner
  // suggesting they start one.
  //
  // `overview.totalInvested` / `.totalProfit` are the only figures on this page
  // that are genuinely dollars: the backend prices each plan's own currency
  // before it adds anything up. The local `reduce` below is a mixed-unit sum and
  // is a fallback for the window before the overview lands, not a second source
  // of truth — do not promote it.
  const overview = dashboardData?.overview;
  const localActive = investments.filter((inv) => inv.status === "ACTIVE");
  const localCompleted = investments.filter((inv) => inv.status === "COMPLETED");

  const totalInvested =
    overview?.totalInvested ??
    investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalProfit =
    overview?.totalProfit ??
    investments.reduce((sum, inv) => sum + (inv.profit || 0), 0);
  // `?? ` is deliberately NOT used on `profitPercentage`. The backend sends
  // null on purpose — a return on nothing has no percentage — and `??` reads
  // that null as "the overview has not answered" and falls through to the local
  // fallback, which computes 0 and presents it as a flat 0.00% return. Null has
  // to survive as far as the badge, which is then not drawn at all.
  const profitPercentage = overview
    ? overview.profitPercentage
    : totalInvested > 0
      ? (totalProfit / totalInvested) * 100
      : null;
  // Currencies the backend could not price into USD. While this is non-empty
  // the two dollar figures above are a LOWER BOUND, not the total, and the note
  // under the cards is the only thing that says so.
  const unpricedCurrencies = overview?.unpricedCurrencies ?? [];
  const activeCount = overview?.activeInvestments ?? localActive.length;
  const completedCount = overview?.completedInvestments ?? localCompleted.length;
  const investmentCount = activeCount + completedCount;

  const activeInvestments = localActive;
  const completedInvestments = localCompleted;

  const statsCards = [
    {
      title: tCommon("balance"),
      // A forex account's balance is in the ACCOUNT's currency. Called with no
      // currency at all, `formatCurrency` defaults to USD, so this card put a
      // "$" on a 40,000 NGN balance and read "$40,000.00" — about $29 — while
      // the account card further down the same page had already been fixed to
      // print "40,000.00 NGN". Empty rather than "USD" when the currency is
      // unbound: that is only true before the first deposit, when the balance is
      // 0 anyway, and an invented unit is the thing being undone here.
      value: formatCurrency(
        liveAccount?.balance || 0,
        liveAccount?.currency ?? ""
      ),
      subtitle: liveAccount ? t("live_account") : t("no_live_account_yet"),
      icon: Wallet,
      color: "primary",
    },
    {
      title: tCommon("total_invested"),
      value: formatCurrency(totalInvested),
      subtitle: `${tCommon("across")} ${investmentCount} ${tCommon("investments")}`,
      icon: DollarSign,
      color: "secondary",
    },
    {
      title: tCommon("total_profit"),
      value: formatCurrency(totalProfit),
      // No badge when there is no percentage to put in it. A user who has never
      // invested was shown a "0.00% Return" chip, which is a claim about a
      // return that does not exist.
      badge:
        profitPercentage === null
          ? undefined
          : {
              value: formatPercentage(profitPercentage),
              positive: profitPercentage > 0,
            },
      subtitle: tCommon("no_investments_yet"),
      icon: TrendingUp,
      color: "primary",
    },
    {
      title: tCommon("active_investments"),
      value: activeCount.toString(),
      subtitle: `${completedCount} ${tCommon("completed")}`,
      icon: Clock,
      color: "secondary",
    },
  ];

  return (
    /* The root is transparent on purpose. `HeroSection` mounts
       `WorkspaceGround` (`fixed inset-0 -z-10`); the opaque page wash that
       used to be on this line painted over it, so the hairline grid, the
       surface-ramp step and the 4% accent stop were composited and thrown
       away. Only `min-h-screen` is load-bearing here — the ground is `fixed`,
       so the root still has to be tall enough to own the viewport. */
    <div className="min-h-screen">
      {/* Premium Hero Header */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Forex Trading",
        }}
        title={tExt("forex_dashboard")}
        titleClassName="text-3xl md:text-4xl"
        description={t("manage_your_investments_and_trading_accounts")}
        paddingBottom="pb-8"
        layout="split"
        rightContent={
          liveAccount ? (
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Link href={`/forex/account/${liveAccount.id}/deposit`}>
                <Button
                  size="lg"
                  className={`w-full sm:w-48 bg-success hover:bg-success text-success-foreground font-semibold rounded-xl shadow-lg`}
                >
                  <Wallet className="mr-2 h-5 w-5" />
                  {tCommon("deposit")}
                </Button>
              </Link>
              <Link href={`/forex/account/${liveAccount.id}/withdraw`}>
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full sm:w-48 border-2 border-success text-success hover:bg-success/5 hover:text-success-ink dark:hover:bg-success/10 font-semibold rounded-xl shadow-lg`}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  {tCommon("withdraw")}
                </Button>
              </Link>
            </div>
          ) : null
        }
      />

      <main className="pb-24">
        <div className="container mx-auto py-8">
          {/* Overview Content */}
          <div className="space-y-8">
            {/* Welcome Card */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card
                className={`relative overflow-hidden rounded-lg border border-border bg-success`}
              >
                <CardContent className="relative p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
                        {tCommon("welcome_back")}, {user?.firstName}!
                      </h2>
                      <p className="text-primary-foreground/80 text-lg">
                        {t("your_portfolio_is")}{" "}
                        {totalProfit > 0
                          ? t("performing_well")
                          : t("waiting_for_growth")}
                        .{" "}
                        {activeInvestments.length > 0
                          ? ` ${tExt("you_have")} ${activeInvestments.length} ${tCommon("active_investments")}.`
                          : ` ${t("consider_starting_a_new_investment_today")}.`}
                      </p>
                    </div>
                    <Link href="/forex/plan">
                      <Button
                        size="lg"
                        className={`bg-card text-success hover:bg-card/90 font-semibold rounded-lg `}
                      >
                        {tCommon("new_investment")}
                        <PlusCircle className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </m.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat, index) => (
                <m.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <Card className="rounded-lg border border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="truncate text-xs font-medium text-muted-foreground">
                          {stat.title}
                        </h3>
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                          <stat.icon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="text-2xl font-semibold leading-tight tracking-tight font-mono tabular-nums text-foreground">
                        {stat.value}
                      </div>
                      {stat.badge ? (
                        <Badge
                          className={`mt-1.5 ${stat.badge.positive ? `bg-success/10 text-success dark:bg-success/20` : "bg-destructive/10 text-destructive dark:bg-destructive/20"} font-medium`}
                        >
                          {stat.badge.value} {tCommon("return")}
                        </Badge>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-subtle-foreground">
                          {stat.subtitle}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </m.div>
              ))}
            </div>

            {/* The two dollar cards above are a LOWER BOUND whenever the backend
                could not price a plan's currency: those amounts are left out
                rather than folded in as zero, and without this line the shortfall
                is invisible — the user reads an under-count as their total. */}
            {unpricedCurrencies.length > 0 && (
              <p className="flex w-fit items-center gap-1.5 text-[11px] text-warning-ink">
                <Info className="h-3 w-3 shrink-0" />
                {tExt("excludes_currencies_with_no_usd_rate", {
                  currencies: unpricedCurrencies.join(", "),
                })}
              </p>
            )}

            {/* MT5 Accounts Section */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {accounts.length === 0 ? (
                <Card className="rounded-lg border border-border bg-card">
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div
                        className={`w-20 h-20 rounded-lg bg-success/15 flex items-center justify-center`}
                      >
                        <BarChart3
                          className={`h-10 w-10 text-success`}
                        />
                      </div>
                      <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                        {t("creating_your_trading_account")}
                      </h3>
                      <p className="text-muted-foreground max-w-md">
                        {t("your_trading_account_is_being_created_by_our_team")}.{" "}
                        {t("you_will_receive_an_email_once_it_is_ready")}.
                      </p>
                      <div
                        className={`flex items-center space-x-2 text-success`}
                      >
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="font-medium">
                          {tCommon("processing_request")}.
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ForexAccounts accounts={accounts} />
              )}
            </m.div>
          </div>
        </div>
      </main>
    </div>
  );
}
