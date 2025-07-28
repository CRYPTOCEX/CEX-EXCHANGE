"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  DollarSign,
  Wallet,
  PlusCircle,
  CheckCircle,
  Bell,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useForexStore } from "@/store/forex/user";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

import { useUserStore } from "@/store/user";
import ForexAccounts from "./components/account";
import DataTable from "@/components/blocks/data-table";
import { forexInvestmentColumns } from "./components/columns";
import { forexInvestmentAnalytics } from "./components/analytics";
import { useTranslations } from "next-intl";

export default function DashboardClient() {
  const t = useTranslations("ext");
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
  }, [user, hasFetchedPlans, hasFetchedAccounts, fetchPlans, fetchAccounts, fetchDashboardData]);

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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">
      <main className="flex-1 container mx-auto px-4 py-8 pb-12">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("Dashboard")}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t("manage_your_investments_and_trading_accounts")}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="mb-6 bg-white p-1 border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-700">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            >
              {t("Overview")}
            </TabsTrigger>
            <TabsTrigger
              value="investments"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            >
              {t("Investments")}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:bg-gradient-to-r dark:from-zinc-900 dark:to-zinc-700 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {t("welcome_back")}, {user?.firstName}!
                    </h2>
                    <p className="text-blue-100 dark:text-zinc-200">
                      {t("your_portfolio_is")} {" "}
                      {totalProfit > 0
                        ? t("performing_well")
                        : t("waiting_for_growth")}
                      . {activeInvestments.length > 0
                        ? ` ${t("you_have")} ${activeInvestments.length} ${t("active_investments")}.`
                        : ` ${t("consider_starting_a_new_investment_today")}.`}
                    </p>
                  </div>
                  <Button onClick={() => router.push("/forex/plan")}>
                    {t("new_investment")}
                    <PlusCircle className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {t("Balance")}
                    </h3>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center dark:bg-white dark:text-black">
                      <Wallet className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold dark:text-white">
                    {formatCurrency(liveAccount?.balance || 0)}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-300">
                    {liveAccount ? t("live_account") : t("no_live_account_yet")}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {t("total_invested")}
                    </h3>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center dark:bg-white dark:text-black">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold dark:text-white">
                    {formatCurrency(totalInvested)}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-300">
                    {t("Across")} {investments.length} {t("investments")}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {t("total_profit")}
                    </h3>
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center dark:bg-white dark:text-black">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold dark:text-white">
                    {formatCurrency(totalProfit)}
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <Badge
                      className={`${profitPercentage > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} font-normal`}
                    >
                      {formatPercentage(profitPercentage)} {t("return")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {t("active_investments")}
                    </h3>
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center dark:bg-white dark:text-black">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold dark:text-white">
                    {activeInvestments.length}
                  </div>
                  <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-300">
                    {completedInvestments.length} {t("completed")}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* MT5 Accounts Section */}
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <Card className="p-6 text-center border-none shadow-md dark:bg-zinc-800 dark:text-white">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {t("creating_your_trading_account")}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md">
                      {t("your_trading_account_is_being_created_by_our_team")}. {" "}
                      {t("you_will_receive_an_email_once_it_is_ready")}.
                    </p>
                    <div className="flex items-center space-x-2 text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{t("processing_request")}.</span>
                    </div>
                  </div>
                </Card>
              ) : (
                <ForexAccounts accounts={accounts} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="investments" className="space-y-6">
            <DataTable
              apiEndpoint="/api/forex/investment"
              model="forexInvestment"
              userAnalytics={true}
              pageSize={10}
              canEdit={false}
              canView
              canCreate={false}
              isParanoid={false}
              title={t("forex_investments")}
              itemTitle={t("Investment")}
              columns={forexInvestmentColumns}
              analytics={forexInvestmentAnalytics}
              viewLink="/forex/investment/[id]"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
