"use client";

import { useState, useEffect, useMemo } from "react";
import { userStakingStore } from "@/store/staking/user";
import { PositionsFilters } from "./components/positions-filters";
import { PositionsSummary } from "./components/positions-summary";
import { PositionsEmptyState } from "./components/positions-empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PositionCard } from "./components/position-card";
import PositionsLoading from "./loading";
import { useTranslations } from "next-intl";

type PositionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING_WITHDRAWAL"
  | "all";

export function StakingPositionsPage() {
  const t = useTranslations("ext");
  const { toast } = useToast();

  // Subscribe to global store state.
  const positions = userStakingStore((state) => state.positions);
  const isLoading = userStakingStore((state) => state.isLoading);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("my_staking_positions")}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t("manage_your_staking_your_assets")}.
        </p>
      </div>

      <>
        <PositionsSummary positions={positions} />

        <div className="space-y-6">
          <Tabs
            defaultValue="ACTIVE"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PositionStatus)}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="ACTIVE">{t("Active")}</TabsTrigger>
                <TabsTrigger value="PENDING_WITHDRAWAL">
                  {t("Pending")}
                </TabsTrigger>
                <TabsTrigger value="COMPLETED">{t("Completed")}</TabsTrigger>
                <TabsTrigger value="all">{t("All")}</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPositions.map((position) => (
                    <PositionCard key={position.id} position={position} />
                  ))}
                </div>
              ) : (
                <PositionsEmptyState tab={activeTab} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </>
    </div>
  );
}
