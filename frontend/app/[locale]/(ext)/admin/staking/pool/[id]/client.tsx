"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  Percent,
  Clock,
  Target,
} from "lucide-react";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PoolDetailsTab } from "./components/pool-details-tab";
import PoolPositionsTab from "./components/pool-positions-tab";
import { PoolAnalyticsTab } from "./components/pool-analytics-tab";
import { LoadingPoolDetail } from "./components/loading-pool-detail";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { motion } from "framer-motion";

export default function StakingPoolDetailClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const getPoolById = useStakingAdminPoolsStore((state) => state.getPoolById);
  const selectedPool = useStakingAdminPoolsStore((state) => state.selectedPool);
  const isLoading = useStakingAdminPoolsStore((state) => state.isLoading);
  const error = useStakingAdminPoolsStore((state) => state.error);
  const deletePool = useStakingAdminPoolsStore((state) => state.deletePool);
  const updatePool = useStakingAdminPoolsStore((state) => state.updatePool);

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState("details");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Fetch pool data
  const fetchData = async () => {
    setIsRefreshing(true);
    await getPoolById(id);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, getPoolById]);

  // Handle pool deletion
  const handleDeletePool = async () => {
    if (!selectedPool) return;

    setDeleteInProgress(true);
    try {
      const success = await deletePool(selectedPool.id);
      if (success) {
        router.push("/admin/staking");
      }
    } catch (error) {
      console.error("Failed to delete pool:", error);
    } finally {
      setDeleteInProgress(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Handle pool status toggle
  const handleToggleStatus = async () => {
    if (!selectedPool) return;

    const newStatus = selectedPool.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await updatePool(selectedPool.id, { status: newStatus });
  };

  // Handle pool promotion toggle
  const handleTogglePromotion = async () => {
    if (!selectedPool) return;

    await updatePool(selectedPool.id, { isPromoted: !selectedPool.isPromoted });
  };

  if (isLoading && !selectedPool) {
    return <LoadingPoolDetail />;
  }

  if (error) {
    return (
      <div className={`container ${PAGE_PADDING} max-w-7xl mx-auto`}>
        <ErrorDisplay error={error} onRetry={fetchData} />
        <Link href="/admin/staking" className="mt-4 inline-block">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_staking_admin")}
          </Button>
        </Link>
      </div>
    );
  }

  if (!selectedPool) return null;

  const activePositions = selectedPool.positions?.filter(p => p.status === "ACTIVE").length || 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        breadcrumb={{
          icon: <ArrowLeft className="h-4 w-4" />,
          text: tExt("back_to_pools"),
          href: "/admin/staking/pool",
          className: "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300",
        }}
        title={[
          { text: selectedPool.name + " " },
          { text: selectedPool.symbol, gradient: "bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-400 dark:via-indigo-400 dark:to-violet-400" },
        ]}
        description={selectedPool.description || t("view_and_manage_this_staking_pool")}
        descriptionAsHtml={true}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            {isRefreshing ? (
              <Button variant="outline" disabled size="sm">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t("refreshing")}
              </Button>
            ) : (
              <Button variant="outline" onClick={fetchData} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                {tExt("refresh")}
              </Button>
            )}

            <Button
              variant={selectedPool.status === "ACTIVE" ? "destructive" : "outline"}
              onClick={handleToggleStatus}
              size="sm"
              className={
                selectedPool.status === "ACTIVE"
                  ? "bg-red-500/90 hover:bg-red-600"
                  : "bg-green-500/90 hover:bg-green-600 text-white"
              }
            >
              {selectedPool.status === "ACTIVE" ? t("deactivate") : tCommon("activate")}
            </Button>

            <Link href={`/admin/staking/pool/${selectedPool.id}/edit`}>
              <Button size="sm" className="bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                <Edit className="mr-2 h-4 w-4" />
                {tCommon("edit")}
              </Button>
            </Link>

            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon("delete")}
            </Button>
          </div>
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
              icon: Percent,
              label: tCommon("apr"),
              value: `${selectedPool.apr}%`,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
            {
              icon: Clock,
              label: tCommon("lock_period"),
              value: `${selectedPool.lockPeriod} ${tCommon("days")}`,
              iconColor: "text-indigo-500",
              iconBgColor: "bg-indigo-500/10",
            },
            {
              icon: Target,
              label: tCommon("active_positions"),
              value: activePositions,
              iconColor: "text-violet-500",
              iconBgColor: "bg-violet-500/10",
            },
          ]}
        />
      </HeroSection>

      <div className="container mx-auto py-8 space-y-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger
            value="details"
            className="rounded-lg data-[state=active]:bg-background"
          >
            {t("pool_details")}
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="rounded-lg data-[state=active]:bg-background"
          >
            {tCommon("staking_positions")}
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-lg data-[state=active]:bg-background"
          >
            {tCommon("analytics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <PoolDetailsTab poolId={id} />
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <PoolPositionsTab poolId={id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <PoolAnalyticsTab
            pool={selectedPool}
            positions={selectedPool.positions || []}
          />
        </TabsContent>
      </Tabs>
      </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("are_you_sure_you_want_to_delete_this_pool")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("this_action_cannot_be_undone")}.{" "}
              {t("this_will_permanently_delete_the")} {selectedPool.name}
              {t("staking_pool_and_remove_all_associated_data")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePool}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteInProgress}
            >
              {deleteInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('deleting_ellipsis')}.
                </>
              ) : (
                "Delete Pool"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
