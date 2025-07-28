"use client";

import { useEffect } from "react";
import HeaderSection from "./components/header";
import KeyMetrics from "./components/metrics";
import AdditionalMetrics from "./components/extra-metrics";
import AdminActivityList from "./components/activity";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useStakingAdminPositionsStore } from "@/store/staking/admin/position";
import { useStakingAdminActivityStore } from "@/store/staking/admin/activity";
import { useStakingAdminAnalyticsStore } from "@/store/staking/admin/analytics";
import { useTranslations } from "next-intl";

export default function StakingOverviewClient() {
  const t = useTranslations("ext");
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
    (state) => state.fetchAnalytics
  );
  const analytics = useStakingAdminAnalyticsStore((state) => state.analytics);
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

  return (
    <div className="space-y-8">
      {isLoading && <div>{t("Loading")}.</div>}
      {/* Optionally use ErrorDisplay if any store exposes errors */}
      <HeaderSection />
      <KeyMetrics analytics={analytics} activePositions={activePositions} />
      <AdditionalMetrics
        avgLockPeriod={avgLockPeriod}
        pendingWithdrawals={pendingWithdrawals}
        analytics={analytics}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AdminActivityList
          adminActivities={adminActivities}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
