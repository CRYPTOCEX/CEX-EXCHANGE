"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight, Wallet, TrendingUp, Clock, Plus, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userStakingStore } from "@/store/staking/user";
import PositionCard from "./components/position-card";
import { useTranslations } from "next-intl";
import DashboardLoading from "./loading";
import DashboardErrorState from "./error-state";
import { motion } from "framer-motion";

export default function StakingDashboard() {
  const t = useTranslations("ext_staking");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  // Subscribe to the store state directly
  const positions = userStakingStore((state) => state.positions);
  const summary = userStakingStore((state) => state.userSummary);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);

  // Grab the actions from the store
  const getUserPositions = userStakingStore((state) => state.getUserPositions);
  const getUserSummary = userStakingStore((state) => state.getUserSummary);

  useEffect(() => {
    // Trigger data loading on mount
    getUserPositions();
    getUserSummary();
  }, [getUserPositions, getUserSummary]);

  // Filter positions by status
  const activePositions = positions.filter((p) => p.status === "ACTIVE");
  const pendingWithdrawalPositions = positions.filter(
    (p) => p.status === "PENDING_WITHDRAWAL"
  );
  const completedPositions = positions.filter((p) => p.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-700/50 pt-28 pb-12">
        {/* Background effects - Purple/Fuchsia theme */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            <div>
              <Badge
                variant="outline"
                className="mb-4 px-3 py-1 bg-violet-500/5 border-violet-500/20"
              >
                <Sparkles className="w-3 h-3 mr-1.5 text-violet-500" />
                <span className="text-violet-600 dark:text-violet-400 font-medium">Dashboard</span>
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                <span className="bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                  {t("staking_dashboard")}
                </span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 max-w-xl">
                {t("manage_your_staking_your_rewards")}
              </p>
            </div>
            <Link href="/staking/pool">
              <Button className="h-12 px-6 rounded-xl bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 hover:shadow-xl shadow-lg shadow-violet-500/20 dark:shadow-${'violet'}-900/20 text-white">
                <Plus className="mr-2 h-4 w-4" />
                {tCommon("stake_more")}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto py-8">
        {isLoading ? (
          <DashboardLoading />
        ) : error ? (
          <DashboardErrorState
            error={error}
            onRetry={() => {
              getUserPositions();
              getUserSummary();
            }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50 shadow-xl backdrop-blur-sm overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="h-6 w-6 text-violet-500" />
                  </div>
                  <CardTitle className="text-lg text-zinc-600 dark:text-zinc-400">{tExt("total_staked")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                    {summary?.totalStaked?.toFixed(4) || "0"}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {tCommon("across")} {summary?.activePositions || 0} {tCommon("active_positions")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50 shadow-xl backdrop-blur-sm overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-indigo-500" />
                  </div>
                  <CardTitle className="text-lg text-zinc-600 dark:text-zinc-400">{tExt("total_rewards")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {summary?.totalRewards?.toFixed(4) || "0"}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t("earned_from_all_positions")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50 shadow-xl backdrop-blur-sm overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-600/20 to-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-violet-600" />
                  </div>
                  <CardTitle className="text-lg text-zinc-600 dark:text-zinc-400">
                    {tCommon("active_positions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                    {summary?.activePositions || 0}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t("currently_earning_rewards")}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50 shadow-xl backdrop-blur-sm overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-indigo-500" />
                  </div>
                  <CardTitle className="text-lg text-zinc-600 dark:text-zinc-400">{tCommon("completed")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                    {summary?.completedPositions || 0}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t("successfully_completed_positions")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Positions Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Tabs defaultValue="active" className="mt-6">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                  <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                    {tCommon("active")}
                    {activePositions.length}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                    {tExt("pending_withdrawal")}
                    {pendingWithdrawalPositions.length}
                    )
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                    {tCommon("completed")}
                    {completedPositions.length}
                    )
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                  {activePositions.length === 0 ? (
                    <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50">
                      <CardContent className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                          <Wallet className="h-8 w-8 text-violet-500" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2 text-zinc-900 dark:text-white">
                          {tCommon("no_active_positions")}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                          {t("you_dont_have_any_active_staking_positions_yet")}.
                        </p>
                        <Link href="/staking/pool">
                          <Button className="rounded-xl">
                            {t("start_staking")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activePositions.map((position) => (
                        <PositionCard key={position.id} position={position} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pending">
                  {pendingWithdrawalPositions.length === 0 ? (
                    <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50">
                      <CardContent className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2 text-zinc-900 dark:text-white">
                          {t("no_pending_withdrawals")}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                          {t("you_dont_have_any_positions_pending_withdrawal")}.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingWithdrawalPositions.map((position) => (
                        <PositionCard key={position.id} position={position} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  {completedPositions.length === 0 ? (
                    <Card className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50">
                      <CardContent className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-violet-600/10 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-violet-600" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2 text-zinc-900 dark:text-white">
                          {t("no_completed_positions")}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                          {t("you_dont_have_any_completed_staking_positions_yet")}.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {completedPositions.map((position) => (
                        <PositionCard key={position.id} position={position} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
