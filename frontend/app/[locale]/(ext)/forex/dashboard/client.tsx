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
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { motion } from "framer-motion";

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
    fetchDashboardData,
    fetchAccounts,
    fetchPlans,
    hasFetchedPlans,
    hasFetchedAccounts,
  } = useForexStore();

  const liveAccount = Object.values(accounts).find(
    (acc) => acc.type === "LIVE"
  );

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
    fetchPlans,
    fetchAccounts,
    fetchDashboardData,
  ]);

  const activeInvestments = investments.filter(
    (inv) => inv.status === "ACTIVE"
  );
  const completedInvestments = investments.filter(
    (inv) => inv.status === "COMPLETED"
  );

  // Fallback totals (if needed)
  const totalInvested = investments.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0
  );
  const totalProfit = investments.reduce(
    (sum, inv) => sum + (inv.profit || 0),
    0
  );
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const statsCards = [
    {
      title: tCommon("balance"),
      value: formatCurrency(liveAccount?.balance || 0),
      subtitle: liveAccount ? t("live_account") : t("no_live_account_yet"),
      icon: Wallet,
      color: "primary",
    },
    {
      title: tCommon("total_invested"),
      value: formatCurrency(totalInvested),
      subtitle: `${tCommon("across")} ${investments.length} ${tCommon("investments")}`,
      icon: DollarSign,
      color: "secondary",
    },
    {
      title: tExt("total_profit"),
      value: formatCurrency(totalProfit),
      badge: {
        value: formatPercentage(profitPercentage),
        positive: profitPercentage > 0,
      },
      icon: TrendingUp,
      color: "primary",
    },
    {
      title: tCommon("active_investments"),
      value: activeInvestments.length.toString(),
      subtitle: `${completedInvestments.length} ${tCommon("completed")}`,
      icon: Clock,
      color: "secondary",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Premium Hero Header */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "Forex Trading",
          gradient: `from-emerald-500/10 to-teal-500/10`,
          iconColor: `text-emerald-600`,
          textColor: `text-emerald-600 dark:text-emerald-400`,
          borderColor: `border-emerald-600/20`,
        }}
        title={[
          { text: "Forex" },
          {
            text: "Dashboard",
            gradient: `from-emerald-600 via-teal-500 to-emerald-600`,
          },
        ]}
        titleClassName="text-3xl md:text-4xl"
        description={t("manage_your_investments_and_trading_accounts")}
        paddingTop="pt-24"
        paddingBottom="pb-8"
        layout="split"
        background={{
          orbs: [
            {
              color: "#10b981",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#14b8a6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#10b981", "#14b8a6"],
          size: 8,
        }}
        rightContent={
          liveAccount ? (
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Link href={`/forex/account/${liveAccount.id}/deposit`}>
                <Button
                  size="lg"
                  className={`w-full sm:w-48 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl shadow-lg`}
                >
                  <Wallet className="mr-2 h-5 w-5" />
                  {tCommon("deposit")}
                </Button>
              </Link>
              <Link href={`/forex/account/${liveAccount.id}/withdraw`}>
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full sm:w-48 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600/5 dark:hover:bg-emerald-600/10 font-semibold rounded-xl shadow-lg`}
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card
                className={`relative overflow-hidden border-0 bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 shadow-2xl shadow-emerald-500/20`}
              >
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
                </div>
                <CardContent className="relative p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {tCommon("welcome_back")}, {user?.firstName}!
                      </h2>
                      <p className="text-white/80 text-lg">
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
                        className={`bg-white text-emerald-600 hover:bg-white/90 font-semibold rounded-xl shadow-lg`}
                      >
                        {tCommon("new_investment")}
                        <PlusCircle className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                          {stat.title}
                        </h3>
                        <div
                          className={`w-12 h-12 rounded-xl ${stat.color === "primary" ? `bg-emerald-500/10` : `bg-teal-500/10`} flex items-center justify-center`}
                        >
                          <stat.icon
                            className={`h-6 w-6 ${stat.color === "primary" ? `text-emerald-500` : `text-teal-500`}`}
                          />
                        </div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                        {stat.value}
                      </div>
                      {stat.badge ? (
                        <Badge
                          className={`${stat.badge.positive ? `bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400` : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"} font-medium`}
                        >
                          {stat.badge.value} {t("return")}
                        </Badge>
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {stat.subtitle}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* MT5 Accounts Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {accounts.length === 0 ? (
                <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center`}
                      >
                        <BarChart3
                          className={`h-10 w-10 text-emerald-500`}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {t("creating_your_trading_account")}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
                        {t("your_trading_account_is_being_created_by_our_team")}.{" "}
                        {t("you_will_receive_an_email_once_it_is_ready")}.
                      </p>
                      <div
                        className={`flex items-center space-x-2 text-emerald-600 dark:text-emerald-400`}
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
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
