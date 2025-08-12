"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight, Wallet, TrendingUp, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userStakingStore } from "@/store/staking/user";
import PositionCard from "./components/position-card";
import { useTranslations } from "next-intl";

export default function StakingDashboard() {
  const t = useTranslations("ext");
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
    <div className="container px-4 md:px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t("staking_dashboard")}
          </h1>
          <p className="text-muted-foreground">
            {t("manage_your_staking_your_rewards")}
          </p>
        </div>
        <Link href="/staking/pool">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("stake_more")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-12">
          <p>
            {t("error_loading_dashboard")}
            {error}
          </p>
          <Button variant="link" onClick={() => window.location.reload()}>
            {t("Retry")}
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{t("total_staked")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {summary?.totalStaked?.toFixed(4) || "0"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("Across")}
                  {summary?.activePositions || 0}
                  {t("active_positions")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{t("total_rewards")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {summary?.totalRewards?.toFixed(4) || "0"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("earned_from_all_positions")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">
                  {t("active_positions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {summary?.activePositions || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("currently_earning_rewards")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{t("Completed")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {summary?.completedPositions || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("successfully_completed_positions")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Positions Tabs */}
          <Tabs defaultValue="active" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="active">
                {t("active_(")}
                {activePositions.length}
                )
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t("pending_withdrawal_(")}
                {pendingWithdrawalPositions.length}
                )
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t("completed_(")}
                {completedPositions.length}
                )
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activePositions.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {t("no_active_positions")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("you_dont_have_any_active_staking_positions_yet")}.
                  </p>
                  <Link href="/staking/pool">
                    <Button>
                      {t("start_staking")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
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
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {t("no_pending_withdrawals")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("you_dont_have_any_positions_pending_withdrawal")}.
                  </p>
                </div>
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
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">
                    {t("no_completed_positions")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("you_dont_have_any_completed_staking_positions_yet")}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedPositions.map((position) => (
                    <PositionCard key={position.id} position={position} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
