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
  Sparkles,
  Coins,
} from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
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
import PoolDetailLoading from "./loading";
import PoolDetailErrorState from "./error-state";
import { useTranslations } from "next-intl";

export default function PoolDetailPage() {
  const t = useTranslations("ext_staking");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
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

  // Show loading state while fetching or if pool is not yet loaded
  if (isLoading || (!pool && !error)) {
    return <PoolDetailLoading />;
  }

  // Show error state if there's an error
  if (error) {
    return (
      <PoolDetailErrorState
        error={error}
        onRetry={() => getPoolById(id)}
      />
    );
  }

  // Show "not found" error only if we're not loading and there's no pool
  if (!pool) {
    return (
      <PoolDetailErrorState
        error="The staking pool you're looking for doesn't exist or has been removed."
      />
    );
  }

  // Calculate percentage of total staked vs available
  const totalAvailable = (pool.totalStaked ?? 0) + (pool.availableToStake ?? 0);
  const percentageStaked = ((pool.totalStaked ?? 0) / totalAvailable) * 100;

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: pool.symbol,
          gradient: `from-violet-500/10 to-indigo-500/10`,
          iconColor: `text-violet-500`,
          textColor: `text-violet-600 dark:text-violet-400`,
        }}
        title={[
          { text: pool.name },
        ]}
        description={pool.description || t("earn_rewards_by_staking")}
        descriptionAsHtml={!!pool.description}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="flex flex-col gap-3">
            <Link href="/staking/pool">
              <Button variant="outline" size="sm" className="border-violet-500/30 hover:bg-violet-500/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tExt("back_to_pools")}
              </Button>
            </Link>
            <div className="flex items-center gap-4 px-6 py-4 rounded-xl bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/20">
                {pool.icon ? (
                  <Lightbox
                    src={pool.icon || "/img/placeholder.svg"}
                    alt={pool.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <span className="font-bold text-violet-500 text-lg">
                    {pool.symbol?.substring(0, 1) || "?"}
                  </span>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {pool.apr}%
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {tCommon("apr")}
                </div>
              </div>
            </div>
          </div>
        }
        background={{
          orbs: [
            {
              color: "#8b5cf6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#6366f1",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#8b5cf6", "#6366f1"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: Coins,
              label: tExt("total_staked"),
              value: `${(pool.totalStaked || 0).toLocaleString()} ${pool.token}`,
              iconColor: `text-violet-500`,
              iconBgColor: `bg-violet-500/10`,
            },
            {
              icon: Clock,
              label: tCommon("lock_period"),
              value: `${pool.lockPeriod} ${tCommon("days")}`,
              iconColor: `text-indigo-500`,
              iconBgColor: `bg-indigo-500/10`,
            },
            {
              icon: Shield,
              label: tExt("minimum_stake"),
              value: `${pool.minStake} ${pool.token}`,
              iconColor: `text-violet-500`,
              iconBgColor: `bg-violet-500/10`,
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
              <TabsTrigger value="details">{tCommon("details")}</TabsTrigger>
              <TabsTrigger value="risks">{t("risks_rewards")}</TabsTrigger>
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
                          {tCommon("annual_percentage_rate")}
                        </span>
                        <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                          {pool.apr}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">
                          {tCommon("lock_period")}
                        </span>
                        <span className="text-2xl font-bold">
                          {pool.lockPeriod} {tCommon("days")}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-sm">
                          {tExt("early_withdrawal_fee")}
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
                          {tExt("minimum_stake")}
                        </span>
                        <span>
                          {pool.minStake} {pool.symbol}
                        </span>
                      </div>
                      {pool.maxStake && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {tExt("maximum_stake")}
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
                          {tCommon("auto_compound")}
                        </span>
                        <span>{pool.autoCompound ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {tExt("admin_fee")}
                        </span>
                        <span>{pool.adminFeePercentage}%</span>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {tExt("total_staked")}
                        </span>
                        <span>
                          {(pool.totalStaked ?? 0).toLocaleString()}{" "}
                          {pool.symbol}
                        </span>
                      </div>
                      <Progress value={percentageStaked} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          0 {pool.symbol}
                        </span>
                        <span>
                          {totalAvailable.toLocaleString()} {pool.symbol}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {pool.description && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>{tCommon("description")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: pool.description }}
                      />
                    </CardContent>
                  </Card>
                )}

                {(pool.profitSource || pool.fundAllocation) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>{tExt("profit_source")}</CardTitle>
                      <CardDescription>
                        {t("how_this_staking_pool_generates_returns")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pool.profitSource && <p>{pool.profitSource}</p>}
                      {pool.fundAllocation && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">
                            {tExt("fund_allocation")}
                          </h4>
                          <p>{pool.fundAllocation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{tExt("staking_details")}</CardTitle>
                    <CardDescription>
                      {t("detailed_information_about_the_staking_process")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <Shield className="h-5 w-5 mr-3 mt-0.5 text-violet-500" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("security_measures")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("your_staked_assets_security_audits")}.{" "}
                            {t("we_implement_industry_leading_your_investment")}
                            .
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Clock className="h-5 w-5 mr-3 mt-0.5 text-indigo-500" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {tCommon("lock_period")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("your_assets_will_be_locked_for")} ({pool.lockPeriod}{" "}
                            {t("days_from_the_time_of_staking")}).{" "}
                            {t("early_withdrawal_is_possible_but_subject_to_a")}{" "}
                            {pool.earlyWithdrawalFee}% {tCommon("fee")}.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <TrendingUp className="h-5 w-5 mr-3 mt-0.5 text-violet-600" />
                        <div>
                          <h3 className="font-semibold mb-1">
                            {t("rewards_distribution")}
                          </h3>
                          <p className="text-muted-foreground">
                            {t("rewards_are_distributed")} {pool.earningFrequency}{" "}
                            {t("and_are_calculated_pools_apr")}.{" "}
                            {pool.autoCompound
                              ? "Rewards are automatically compounded to maximize your returns."
                              : "You can manually compound your rewards by staking them again."}
                          </p>
                        </div>
                      </div>

                      {pool.externalPoolUrl && (
                        <div className="flex items-start">
                          <Info className="h-5 w-5 mr-3 mt-0.5 text-indigo-500" />
                          <div>
                            <h3 className="font-semibold mb-1">
                              {tExt("external_pool")}
                            </h3>
                            <p className="text-muted-foreground">
                              {t("this_staking_pool_generate_yield")}.{" "}
                              {t("you_can_view_the_external_pool_details_at")}{" "}
                              <a
                                href={pool.externalPoolUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-600 dark:text-violet-400 hover:underline"
                              >
                                {(() => {
                                  try {
                                    return new URL(pool.externalPoolUrl).hostname;
                                  } catch {
                                    return pool.externalPoolUrl;
                                  }
                                })()}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{tCommon("fee_structure")}</CardTitle>
                    <CardDescription>
                      {t("breakdown_of_fees_associated_with_this_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>{tExt("admin_fee")}</span>
                        <span>
                          {pool.adminFeePercentage}% {tExt("of_earnings")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{tExt("early_withdrawal_fee")}</span>
                        <span>
                          {pool.earlyWithdrawalFee}% {t("of_staked_amount")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("deposit_fee")}</span>
                        <span>0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("withdrawal_fee_after_lock_period")} ({t("after_lock_period")})</span>
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
                      {tExt("risks")}
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
                      <TrendingUp className="h-5 w-5 mr-2 text-violet-500" />
                      {tExt("rewards")}
                    </CardTitle>
                    <CardDescription>
                      {t("benefits_of_staking_in_this_pool")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{pool.rewards}</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <h4 className="font-semibold mb-2 text-violet-800 dark:text-violet-400">
                          {t("competitive_apr")}
                        </h4>
                        <p className="text-violet-700 dark:text-${'violet'}-300 text-sm">
                          {tExt("earn")} {pool.apr}% {t("apr_on_your_staked")} {pool.symbol}
                          {t("which_is_financial_instruments")}.
                        </p>
                      </div>
                      {pool.earningFrequency && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-${'indigo'}-200 dark:border-indigo-800">
                          <h4 className="font-semibold mb-2 text-indigo-800 dark:text-indigo-400">
                            {pool.earningFrequency.charAt(0).toUpperCase() +
                              pool.earningFrequency.slice(1)}{" "}
                            {tExt("rewards")}
                          </h4>
                          <p className="text-indigo-700 dark:text-${'indigo'}-300 text-sm">
                            {t("receive_rewards")}
                            {pool.earningFrequency}
                            {t("to_watch_your_investment_grow")}.
                          </p>
                        </div>
                      )}
                      {pool.autoCompound && (
                        <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                          <h4 className="font-semibold mb-2 text-violet-800 dark:text-violet-400">
                            {t("auto_compounding")}
                          </h4>
                          <p className="text-violet-700 dark:text-${'violet'}-300 text-sm">
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
    </div>
  );
}
