"use client";

import { useEffect } from "react";
import KeyMetrics from "./components/metrics";
import AdditionalMetrics from "./components/extra-metrics";
import AdminActivityList from "./components/activity";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useStakingAdminPositionsStore } from "@/store/staking/admin/position";
import { useStakingAdminActivityStore } from "@/store/staking/admin/activity";
import { useStakingAdminAnalyticsStore } from "@/store/staking/admin/analytics";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { Sparkles, Layers, TrendingUp, Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";

export default function StakingOverviewClient() {
  const t = useTranslations("common");
  const tAdmin = useTranslations("ext_admin");
  // Pools store
  const fetchPools = useStakingAdminPoolsStore((state) => state.fetchPools);
  const pools = useStakingAdminPoolsStore((state) => state.pools);
  const poolsLoading = useStakingAdminPoolsStore((state) => state.isLoading);

  // Positions store
  const fetchPositions = useStakingAdminPositionsStore(
    (state) => state.fetchPositions
  );
  const positions = useStakingAdminPositionsStore((state) => state.positions);
  const positionsLoading = useStakingAdminPositionsStore(
    (state) => state.isLoading
  );

  // Earnings store (we include analytics here)
  const fetchAnalytics = useStakingAdminAnalyticsStore(
    (state) => state.fetchOverallAnalytics
  );
  const analytics = useStakingAdminAnalyticsStore((state) => state.overallAnalytics);
  const earningsLoading = useStakingAdminAnalyticsStore(
    (state) => state.isLoading
  );

  // Admin Activity store
  const fetchAdminActivities = useStakingAdminActivityStore(
    (state) => state.fetchAdminActivities
  );
  const adminActivities = useStakingAdminActivityStore(
    (state) => state.adminActivities
  );
  const adminActivityLoading = useStakingAdminActivityStore(
    (state) => state.isLoading
  );

  // Combine loading flags if any store is still loading
  const isLoading =
    poolsLoading || positionsLoading || earningsLoading || adminActivityLoading;

  useEffect(() => {
    fetchPools();
    fetchPositions();
    fetchAnalytics();
    fetchAdminActivities();
  }, [fetchPools, fetchPositions, fetchAnalytics, fetchAdminActivities]);

  const activePositions = positions.filter((p) => p.status === "ACTIVE").length;
  const pendingWithdrawals = positions.filter(
    (p) => p.withdrawalRequested
  ).length;
  const totalEarnings = positions.reduce(
    (sum, pos) => sum + (pos.earningsToDate || 0),
    0
  );
  const avgLockPeriod =
    pools.reduce((sum, pool) => sum + pool.lockPeriod, 0) / (pools.length || 1);

  // Calculate total staked and total pools for hero stats
  const totalPools = pools.length;
  const activePools = pools.filter(p => p.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: tAdmin("staking_administration"),
          gradient: "bg-gradient-to-r from-violet-500/10 to-indigo-500/10",
          iconColor: "text-violet-500",
          textColor: "text-violet-600 dark:text-violet-400",
        }}
        title={[
          { text: t("staking") + " " },
          { text: t("overview"), gradient: "bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400" },
        ]}
        description={tAdmin("monitor_performance_and_staking_platform")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <Link href="/admin/staking/pool/new">
            <Button className="bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25">
              <Plus className="mr-2 h-4 w-4" />
              {tAdmin("new_pool")}
            </Button>
          </Link>
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
              icon: Layers,
              label: t("active_pools"),
              value: activePools,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
            {
              icon: Target,
              label: t("active_positions"),
              value: activePositions,
              iconColor: "text-indigo-500",
              iconBgColor: "bg-indigo-500/10",
            },
            {
              icon: TrendingUp,
              label: t("total_earnings"),
              value: `$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-8">
        {isLoading && <div>{t("loading")}.</div>}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <KeyMetrics analytics={analytics} activePositions={activePositions} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AdditionalMetrics
            avgLockPeriod={avgLockPeriod}
            pendingWithdrawals={pendingWithdrawals}
            analytics={analytics}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <AdminActivityList
            adminActivities={adminActivities}
            isLoading={isLoading}
          />
        </motion.div>
      </div>
    </div>
  );
}
