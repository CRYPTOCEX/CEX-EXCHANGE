"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { userStakingStore } from "@/store/staking/user";
import StakeForm from "./components/stake-form";
import { useParams } from "next/navigation";
import { Lightbox } from "@/components/ui/lightbox";
import PoolLoading from "./loading";
import { useTranslations } from "next-intl";

export default function PoolDetailPage() {
  const t = useTranslations("ext");
  const { id } = useParams() as { id: string };

  // Subscribe to the store's state
  const pool = userStakingStore((state) => state.pool);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);
  const getPoolById = userStakingStore((state) => state.getPoolById);

  // Fetch the pool by id when id changes
  useEffect(() => {
    if (id) {
      getPoolById(id);
    }
    
    // Cleanup function to clear pool when component unmounts
    return () => {
      userStakingStore.setState({ pool: null, error: null });
    };
  }, [id, getPoolById]);

  if (isLoading) {
    return <PoolLoading />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/staking/pool">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pools
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Pool Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The staking pool you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/staking/pool">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pools
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate percentage of total staked vs available
  const totalAvailable = (pool.totalStaked ?? 0) + (pool.availableToStake ?? 0);
  const percentageStaked = ((pool.totalStaked ?? 0) / totalAvailable) * 100;

  return (
    <div className="">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-start items-center gap-4">
          <Link href="/staking/pool">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 mr-4 flex items-center justify-center">
              {pool.icon ? (
                <Lightbox
                  src={pool.icon || "/img/placeholder.svg"}
                  alt={pool.name}
                  className="w-14 h-14 rounded-full"
                />
              ) : (
                <span className="font-bold text-primary text-xl">
                  {pool.symbol.substring(0, 1)}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{pool.name}</h1>
              <p className="text-muted-foreground">
                {pool.symbol}
                •
                {pool.apr}
                % APR
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="details">{t("Details")}</TabsTrigger>
              <TabsTrigger value="risks">{t("risks_&_rewards")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("pool_overview")}</CardTitle>
                    <CardDescription>
                      {t("key_information_about_this_staking_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">
                          {t("annual_percentage_rate")}
                        </span>
                        <span className="text-2xl font-bold text-green-500">
                          {pool.apr}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">
                          {t("lock_period")}
                        </span>
                        <span className="text-2xl font-bold">
                          {pool.lockPeriod}
                          {t("days")}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">
                          {t("early_withdrawal_fee")}
                        </span>
                        <span className="text-2xl font-bold">
                          {pool.earlyWithdrawalFee}%
                        </span>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("minimum_stake")}
                        </span>
                        <span>
                          {pool.minStake} {pool.symbol}
                        </span>
                      </div>
                      {pool.maxStake && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("maximum_stake")}
                          </span>
                          <span>
                            {pool.maxStake} {pool.symbol}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("earnings_frequency")}
                        </span>
                        <span className="capitalize">
                          {pool.earningFrequency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("Auto-Compound")}
                        </span>
                        <span>{pool.autoCompound ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("admin_fee")}
                        </span>
                        <span>{pool.adminFeePercentage}%</span>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("total_staked")}
                        </span>
                        <span>
                          {(pool.totalStaked ?? 0).toLocaleString()}{" "}
                          {pool.symbol}
                        </span>
                      </div>
                      <Progress value={percentageStaked} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          0
                          {pool.symbol}
                        </span>
                        <span>
                          {totalAvailable.toLocaleString()} {pool.symbol}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("Description")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: pool.description }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("profit_source")}</CardTitle>
                    <CardDescription>
                      {t("how_this_staking_pool_generates_returns")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{pool.profitSource}</p>
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">
                        {t("fund_allocation")}
                      </h4>
                      <p>{pool.fundAllocation}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("staking_details")}</CardTitle>
                    <CardDescription>
                      {t("detailed_information_about_the_staking_process")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <Shield className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("security_measures")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("your_staked_assets_security_audits")}.{" "}
                            {t("we_implement_industry-leading_your_investment")}
                            .
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Clock className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("lock_period")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("your_assets_will_be_locked_for")}
                            {pool.lockPeriod}{" "}
                            {t("days_from_the_time_of_staking")}.{" "}
                            {t("early_withdrawal_is_possible_but_subject_to_a")}
                            {pool.earlyWithdrawalFee}
                            {t("%_fee")}.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <TrendingUp className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("rewards_distribution")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("rewards_are_distributed")}
                            {pool.earningFrequency}
                            {t("and_are_calculated_pools_apr")}.{" "}
                            {pool.autoCompound
                              ? "Rewards are automatically compounded to maximize your returns."
                              : "You can manually compound your rewards by staking them again."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Info className="h-5 w-5 mr-3 mt-0.5 text-primary" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("external_pool")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("this_staking_pool_generate_yield")}.{" "}
                            {t("you_can_view_the_external_pool_details_at")}{" "}
                            <a
                              href={pool.externalPoolUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {new URL(pool.externalPoolUrl).hostname}
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{t("fee_structure")}</CardTitle>
                    <CardDescription>
                      {t("breakdown_of_fees_associated_with_this_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>{t("admin_fee")}</span>
                        <span>
                          {pool.adminFeePercentage}
                          {t("%_of_earnings")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("early_withdrawal_fee")}</span>
                        <span>
                          {pool.earlyWithdrawalFee}
                          {t("%_of_staked_amount")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("deposit_fee")}</span>
                        <span>0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("withdrawal_fee_(after_lock_period)")}</span>
                        <span>0%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      {t("Risks")}
                    </CardTitle>
                    <CardDescription>
                      {t("potential_risks_associated_with_this_staking_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{pool.risks}</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">
                          {t("market_volatility_risk")}
                        </h4>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                          {t("the_value_of_market_conditions")}.{" "}
                          {t("while_your_staked_may_vary")}.
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">
                          {t("smart_contract_risk")}
                        </h4>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                          {t("while_our_smart_contract_technology")}.
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">
                          {t("regulatory_risk")}
                        </h4>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">
                          {t("changes_in_regulatory_staking_operations")}.{" "}
                          {t("we_continuously_monitor_regulatory_changes")}.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                      {t("Rewards")}
                    </CardTitle>
                    <CardDescription>
                      {t("benefits_of_staking_in_this_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{pool.rewards}</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold mb-2 text-green-800 dark:text-green-400">
                          {t("competitive_apr")}
                        </h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          {t("Earn")}
                          {pool.apr}
                          {t("%_apr_on_your_staked")}
                          {pool.symbol}
                          {t("which_is_financial_instruments")}.
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold mb-2 text-green-800 dark:text-green-400">
                          {pool.earningFrequency.charAt(0).toUpperCase() +
                            pool.earningFrequency.slice(1)}{" "}
                          {t("Rewards")}
                        </h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          {t("receive_rewards")}
                          {pool.earningFrequency}
                          {t("to_watch_your_investment_grow")}.
                        </p>
                      </div>
                      {pool.autoCompound && (
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <h4 className="font-semibold mb-2 text-green-800 dark:text-green-400">
                            {t("Auto-Compounding")}
                          </h4>
                          <p className="text-green-700 dark:text-green-300 text-sm">
                            {t("your_rewards_are_compound_interest")}.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div id="stake-form">
          <div className="sticky top-20">
            <StakeForm pool={pool} />
          </div>
        </div>
      </div>
    </div>
  );
}
