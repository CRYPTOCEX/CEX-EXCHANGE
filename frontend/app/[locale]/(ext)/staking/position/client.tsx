"use client";

import { useState, useEffect, useMemo } from "react";
import { userStakingStore } from "@/store/staking/user";
import { PositionsFilters } from "./components/positions-filters";
import { PositionsSummary } from "./components/positions-summary";
import { PositionsEmptyState } from "./components/positions-empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Layers, Sparkles, TrendingUp, Shield } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { useToast } from "@/hooks/use-toast";
import { PositionCard } from "./components/position-card";
import PositionsLoading from "./loading";
import PositionsErrorState from "./error-state";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

type PositionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING_WITHDRAWAL"
  | "all";

export function StakingPositionsPage() {
  const t = useTranslations("common");
  const tExtStaking = useTranslations("ext_staking");
  const tExt = useTranslations("ext");
  const { toast } = useToast();

  // Subscribe to global store state.
  const positions = userStakingStore((state) => state.positions);
  const isLoading = userStakingStore((state) => state.isLoading);
  const error = userStakingStore((state) => state.error);
  const getUserPositions = userStakingStore((state) => state.getUserPositions);
  // Subscribe to earnings mapped by position id.
  const earningsByPosition = userStakingStore(
    (state) => state.positionEarnings
  );

  // Local filter states.
  const [activeTab, setActiveTab] = useState<PositionStatus>("ACTIVE");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [poolFilter, setPoolFilter] = useState<string | null>(null);

  useEffect(() => {
    getUserPositions();
  }, []);

  // Compute filtered positions.
  const filteredPositions = useMemo(() => {
    let result = [...positions];

    // Filter by status if not "all".
    if (activeTab !== "all") {
      result = result.filter((position) => position.status === activeTab);
    }

    // Filter by pool if a poolFilter is set.
    if (poolFilter) {
      result = result.filter((position) => position.poolId === poolFilter);
    }

    // Filter by search term.
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (position) =>
          position.id.toLowerCase().includes(term) ||
          (position.pool?.name?.toLowerCase().includes(term) ?? false) ||
          (position.pool?.symbol?.toLowerCase().includes(term) ?? false)
      );
    }

    // Apply sorting.
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
        );
        break;
      case "highest-amount":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "lowest-amount":
        result.sort((a, b) => a.amount - b.amount);
        break;
      case "highest-rewards":
        // Updated: sort by the pending rewards coming from the backend earnings data directly
        result.sort(
          (a, b) => (b.earnings?.unclaimed || 0) - (a.earnings?.unclaimed || 0)
        );
        break;
      default:
        break;
    }

    return result;
  }, [
    positions,
    activeTab,
    sortBy,
    searchTerm,
    poolFilter,
    earningsByPosition,
  ]);

  // Compute unique pools for the filter dropdown.
  const uniquePools = useMemo(() => {
    return positions.reduce(
      (acc, position) => {
        if (!acc.some((pool) => pool.id === position.poolId)) {
          acc.push({
            id: position.poolId,
            name: position.pool?.name || "Unknown Pool",
          });
        }
        return acc;
      },
      [] as { id: string; name: string }[]
    );
  }, [positions]);

  if (isLoading) {
    return <PositionsLoading />;
  }

  if (error) {
    return (
      <PositionsErrorState
        error={error}
        onRetry={() => getUserPositions()}
      />
    );
  }

  // Calculate summary stats
  const totalActivePositions = positions.filter(p => p.status === "ACTIVE").length;
  const totalStakedAmount = positions
    .filter(p => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPendingRewards = positions
    .filter(p => p.status === "ACTIVE")
    .reduce((sum, p) => sum + (p.earnings?.unclaimed || 0), 0);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: tExtStaking("my_positions"),
          gradient: `bg-gradient-to-r from-violet-500/10 to-indigo-500/10`,
          iconColor: `text-violet-500`,
          textColor: `text-violet-600 dark:text-violet-400`,
        }}
        title={[
          { text: tExtStaking("my") + " " },
          { text: t("staking_positions"), gradient: `bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400` },
        ]}
        description={tExtStaking("manage_your_staking_your_assets")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="default"
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
              label: `${t("active_positions")} •`,
              value: totalActivePositions,
              iconColor: `text-violet-500`,
              iconBgColor: `bg-violet-500/10`,
            },
            {
              icon: TrendingUp,
              label: tExt("total_staked"),
              value: `$${totalStakedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              iconColor: `text-indigo-500`,
              iconBgColor: `bg-indigo-500/10`,
            },
            {
              icon: Shield,
              label: tExt("pending_rewards"),
              value: `$${totalPendingRewards.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              iconColor: `text-violet-500`,
              iconBgColor: `bg-violet-500/10`,
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PositionsSummary positions={positions} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <Tabs
            defaultValue="ACTIVE"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PositionStatus)}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                <TabsTrigger value="ACTIVE" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                  {t("active")}
                </TabsTrigger>
                <TabsTrigger value="PENDING_WITHDRAWAL" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                  {t("pending")}
                </TabsTrigger>
                <TabsTrigger value="COMPLETED" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                  {t("completed")}
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                  {t("all")}
                </TabsTrigger>
              </TabsList>

              <PositionsFilters
                pools={uniquePools}
                selectedPool={poolFilter}
                onPoolChange={setPoolFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {filteredPositions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPositions.map((position, index) => (
                    <motion.div
                      key={position.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <PositionCard position={position} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <PositionsEmptyState tab={activeTab} />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
