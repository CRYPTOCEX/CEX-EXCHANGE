"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Coins,
  DollarSign,
  Percent,
  RefreshCw,
  Wallet,
  TrendingUp,
  History,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useStakingAdminEarningsStore } from "@/store/staking/admin/earnings";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { motion } from "framer-motion";

export function StakingEarningsClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update activeTab when URL changes (if needed)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  // Handle tab change and update URL query parameter
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`?${params.toString()}`, {
      scroll: false,
    });
  };
  const pools = useStakingAdminPoolsStore((state) => state.pools);
  const fetchPools = useStakingAdminPoolsStore((state) => state.fetchPools);

  // Earnings store
  const earningsData = useStakingAdminEarningsStore(
    (state) => state.earningsData
  );
  const fetchEarnings = useStakingAdminEarningsStore(
    (state) => state.fetchEarnings
  );
  const distributeEarnings = useStakingAdminEarningsStore(
    (state) => state.distributeEarnings
  );
  const [selectedPool, setSelectedPool] = useState<string>("all");
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] =
    useState(false);
  const [distributionPool, setDistributionPool] = useState<StakingPool | null>(
    null
  );
  const [distributionAmount, setDistributionAmount] = useState<number>(0);
  const [distributionType, setDistributionType] = useState<"regular" | "bonus">(
    "regular"
  );
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionError, setDistributionError] = useState<string | null>(null);
  const [distributionValidationErrors, setDistributionValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmittedDistribution, setHasSubmittedDistribution] = useState(false);

  // Fetch data when component mounts or when selectedPool changes
  useEffect(() => {
    fetchPools();
    fetchEarnings({
      poolId: selectedPool === "all" ? undefined : selectedPool,
    });
  }, [fetchPools, fetchEarnings, selectedPool]);

  // Destructure aggregated earnings data from the endpoint
  const totals = earningsData?.totals || {
    totalUserEarnings: 0,
    totalAdminEarnings: 0,
    totalEarnings: 0,
  };
  const history = earningsData?.history || [];
  const earningsByPoolData = earningsData?.earningsByPool || [];
  const earningsByTypeData = [
    {
      name: "User Earnings",
      value: totals.totalUserEarnings,
    },
    {
      name: "Admin Earnings",
      value: totals.totalAdminEarnings,
    },
  ];
  const COLORS = ["#8b5cf6", "#6366f1", "#a78bfa", "#818cf8", "#c4b5fd"];
  const handleDistributeEarnings = async () => {
    if (!distributionPool) return;
    setIsDistributing(true);
    setDistributionError(null);
    setDistributionValidationErrors({});
    setHasSubmittedDistribution(true);

    try {
      const result = await distributeEarnings({
        poolId: distributionPool.id,
        amount: distributionAmount,
        distributionType,
      });
      
      // If successful, close dialog and reset state
      setIsDistributionDialogOpen(false);
      setHasSubmittedDistribution(false);
    } catch (error: any) {
      // Handle validation errors if they exist
      if (error.validationErrors) {
        setDistributionValidationErrors(error.validationErrors);
        setDistributionError("Please fix the validation errors below.");
      } else {
        setDistributionError(
          error instanceof Error ? error.message : "Failed to distribute earnings"
        );
      }
    } finally {
      setIsDistributing(false);
    }
  };
  const openDistributionDialog = (pool: StakingPool) => {
    setDistributionPool(pool);
    setDistributionAmount(0);
    setDistributionType("regular");
    setDistributionError(null);
    setDistributionValidationErrors({});
    setHasSubmittedDistribution(false);
    setIsDistributionDialogOpen(true);
  };
  const hasActivePools = pools.some((pool) => pool.status === "ACTIVE");

  // Get the effective error message for distribution form
  const getDistributionErrorMessage = (field: string) => {
    if (hasSubmittedDistribution && distributionValidationErrors[field]) {
      return distributionValidationErrors[field];
    }
    return "";
  };

  const hasDistributionError = (field: string) => {
    return hasSubmittedDistribution && !!distributionValidationErrors[field];
  };
  // Calculate average APR for active pools
  const avgApr = pools.filter((p) => p.status === "ACTIVE").length > 0
    ? pools.reduce((sum, pool) => sum + pool.apr, 0) / pools.filter((p) => p.status === "ACTIVE").length
    : 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("earnings_management"),
          gradient: "bg-gradient-to-r from-violet-500/10 to-indigo-500/10",
          iconColor: "text-violet-500",
          textColor: "text-violet-600 dark:text-violet-400",
        }}
        title={[
          { text: tExt("earnings") + " " },
          { text: tCommon("management"), gradient: "bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400" },
        ]}
        description={t("track_and_distribute_staking_pools")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <Select value={selectedPool} onValueChange={setSelectedPool}>
            <SelectTrigger className="w-[180px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <SelectValue placeholder={t("select_pool")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tExt("all_pools")}</SelectItem>
              {pools.map((pool) => (
                <SelectItem key={pool.id} value={pool.id}>
                  {pool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        rightContentAlign="center"
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
              label: tCommon("total_earnings"),
              value: totals.totalEarnings.toFixed(2),
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
            {
              icon: Wallet,
              label: t("user_earnings"),
              value: totals.totalUserEarnings.toFixed(2),
              iconColor: "text-indigo-500",
              iconBgColor: "bg-indigo-500/10",
            },
            {
              icon: Percent,
              label: t("average_apr"),
              value: `${avgApr.toFixed(2)}%`,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
          <TabsTrigger value="distribution">{t("distribution")}</TabsTrigger>
          <TabsTrigger value="history">{tCommon("history")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {tCommon("total_earnings")}
                </CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totals.totalEarnings.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("combined_user_and_admin_earnings")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("user_earnings")}
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totals.totalUserEarnings.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totals.totalEarnings > 0
                    ? (
                        (totals.totalUserEarnings / totals.totalEarnings) *
                        100
                      ).toFixed(1)
                    : "0"}
                  % {t("of_total_earnings")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin_earnings")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totals.totalAdminEarnings.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totals.totalEarnings > 0
                    ? (
                        (totals.totalAdminEarnings / totals.totalEarnings) *
                        100
                      ).toFixed(1)
                    : "0"}
                  % {t("of_total_earnings")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("average_apr")}
                </CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    pools.reduce((sum, pool) => sum + pool.apr, 0) /
                    (pools.filter((p) => p.status === "ACTIVE").length || 1)
                  ).toFixed(2)}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tCommon("avg")}. {tExt("admin_fee")}{" "}
                  {(
                    pools.reduce(
                      (sum, pool) => sum + pool.adminFeePercentage,
                      0
                    ) / (pools.length || 1)
                  ).toFixed(2)}
                  %
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("earnings_by_pool")}</CardTitle>
                <CardDescription>
                  {t("distribution_of_earnings_across_pools")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {earningsByPoolData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsByPoolData}>
                        <XAxis dataKey="poolName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="totalUserEarnings"
                          name="User Earnings"
                          fill="#8b5cf6"
                        />
                        <Bar
                          dataKey="totalAdminEarnings"
                          name="Admin Earnings"
                          fill="#6366f1"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {t("no_pool_data_available")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("create_staking_pools_across_pools")}.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("earnings_distribution")}</CardTitle>
                <CardDescription>{t("user_vs_admin_earnings")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {totals.totalEarnings > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={earningsByTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8b5cf6"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {earningsByTypeData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            typeof value === "number" ? value.toFixed(4) : value
                          }
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {t("no_earnings_data")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("distribute_earnings_to_admin_earnings")}.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          {hasActivePools ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pools
                .filter((pool) => pool.status === "ACTIVE")
                .map((pool) => {
                  const poolData = earningsByPoolData.find(
                    (data) => data.poolId === pool.id
                  ) || {
                    totalUserEarnings: 0,
                    totalAdminEarnings: 0,
                    totalEarnings: 0,
                  };
                  const activePositions = pool.positions?.filter(
                    (pos) => pos.status === "ACTIVE"
                  );
                  return (
                    <Card key={pool.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{pool.name}</CardTitle>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {pool.symbol.substring(0, 2)}
                          </div>
                        </div>
                        <CardDescription>
                          {activePositions?.length}
                          {tCommon("active_positions")} {pool.earningFrequency}
                          {tExt("earnings")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{tExt("total_staked")}</span>
                            <span className="font-medium">
                              {(pool.totalStaked ?? 0).toFixed(4)} {pool.symbol}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>{tCommon("apr")}</span>
                            <span className="font-medium">
                              {pool.apr.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>{tExt("admin_fee")}</span>
                            <span className="font-medium">
                              {pool.adminFeePercentage.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>{tExt("total_earned")}</span>
                            <span className="font-medium text-green-500">
                              {poolData.totalEarnings.toFixed(4)} {pool.symbol}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{t("next_distribution")}</span>
                            <span className="font-medium">
                              {new Date(
                                Date.now() + 86400000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>{tCommon("auto_compound")}</span>
                            <span className="font-medium">
                              {pool.autoCompound ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => openDistributionDialog(pool)}
                          disabled={activePositions?.length === 0}
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          {t("distribute_earnings")}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center text-center py-16">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  {t("no_active_pools_available")}
                </h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {t("you_need_to_distribute_earnings")}.
                </p>
                <Link href="/admin/staking/new">
                  <Button>{t("create_new_pool")}</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("earnings_distribution_history")}</CardTitle>
              <CardDescription>
                {t("record_of_all_earnings_distributions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((earning) => {
                    const pool = pools.find((p) => p.id === earning.poolId);
                    return (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {pool?.symbol.substring(0, 2) || "??"}
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {pool?.name || "Unknown Pool"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(earning.createdAt).toLocaleDateString()}{" "}
                              •
                              {earning.numberOfPositions || "N/A"}
                              {tCommon("positions")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {tCommon("total")}{" "}
                            {(
                              earning.userEarnings + earning.adminEarnings
                            ).toFixed(4)}{" "}
                            {pool?.symbol || ""}
                          </div>
                          <div className="text-sm">
                            <span className="text-green-500">
                              {tCommon("users")}
                              {earning.userEarnings.toFixed(4)}
                            </span>{" "}
                            •
                            <span className="text-blue-500">
                              {tCommon("admin")}
                              {earning.adminEarnings.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">
                    {t("no_distribution_history")}
                  </h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    {t("you_havent_distributed_any_earnings_yet")}.{" "}
                    {t("once_you_distribute_appear_here")}.
                  </p>
                  {hasActivePools && (
                    <Button
                      variant="outline"
                      onClick={() => handleTabChange("distribution")}
                    >
                      {t("go_to_distribution")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
      </div>

      {/* Distribution Dialog */}
      <Dialog
        open={isDistributionDialogOpen}
        onOpenChange={setIsDistributionDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("distribute_earnings")}</DialogTitle>
            <DialogDescription>
              {distributionPool?.name} - {distributionPool?.symbol}
            </DialogDescription>
          </DialogHeader>

          {distributionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <p>{distributionError}</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            <Input
              type="number"
              step="0.0001"
              min="0"
              title={t("distribution_amount")}
              value={distributionAmount}
              onChange={(e) =>
                setDistributionAmount(Number.parseFloat(e.target.value) || 0)
              }
              placeholder="0.00"
              postfix={distributionPool?.symbol}
              error={hasDistributionError("amount")}
              errorMessage={getDistributionErrorMessage("amount")}
            />
            <Select
              value={distributionType}
              onValueChange={(value: "regular" | "bonus") =>
                setDistributionType(value)
              }
            >
              <SelectTrigger title={t("distribution_type")}>
                <SelectValue placeholder={tExt("select_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">{t("regular_earnings")}</SelectItem>
                <SelectItem value="bonus">{t("bonus_earnings")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tExt("admin_fee")}</label>
              <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                <span>
                  {tCommon("platform_fee")}
                  {distributionPool?.adminFeePercentage}
                  %)
                </span>
                <span className="font-medium">
                  {(
                    (distributionAmount *
                      (distributionPool?.adminFeePercentage || 0)) /
                    100
                  ).toFixed(4)}{" "}
                  {distributionPool?.symbol}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("user_distribution")}
              </label>
              <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                <span>{t("amount_to_users")}</span>
                <span className="font-medium text-green-500">
                  {(
                    distributionAmount -
                    (distributionAmount *
                      (distributionPool?.adminFeePercentage || 0)) /
                      100
                  ).toFixed(4)}{" "}
                  {distributionPool?.symbol}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDistributionDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleDistributeEarnings}
              disabled={isDistributing || distributionAmount <= 0}
              className="gap-2"
            >
              {isDistributing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {tCommon("processing")}.
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  {t("distribute_earnings")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
