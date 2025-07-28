"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
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
import { PoolHeader } from "./components/pool-header";
import { PoolDetailsTab } from "./components/pool-details-tab";
import PoolPositionsTab from "./components/pool-positions-tab";
import { PoolAnalyticsTab } from "./components/pool-analytics-tab";
import { LoadingPoolDetail } from "./components/loading-pool-detail";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useStakingAdminPoolsStore } from "@/store/staking/admin/pool";
import { useTranslations } from "next-intl";

export default function StakingPoolDetailClient() {
  const t = useTranslations("ext");
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
      <div className="container py-8 max-w-7xl mx-auto">
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-sm p-4 rounded-xl shadow-sm border">
        <Link href="/admin/staking">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <Button variant="outline" disabled className="bg-background/80">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {t("Refreshing")}.
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={fetchData}
              className="bg-background/80 hover:bg-background"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("Refresh")}
            </Button>
          )}

          <Button
            variant={
              selectedPool.status === "ACTIVE" ? "destructive" : "outline"
            }
            onClick={handleToggleStatus}
            className={
              selectedPool.status === "ACTIVE"
                ? "bg-red-500/90 hover:bg-red-600"
                : "bg-green-500/90 hover:bg-green-600 text-white"
            }
          >
            {selectedPool.status === "ACTIVE"
              ? "Deactivate Pool"
              : "Activate Pool"}
          </Button>

          <Button
            variant="outline"
            onClick={handleTogglePromotion}
            className={
              selectedPool.isPromoted
                ? "bg-amber-500/90 hover:bg-amber-600 text-white"
                : "bg-blue-500/90 hover:bg-blue-600 text-white"
            }
          >
            {selectedPool.isPromoted ? "Remove Promotion" : "Promote Pool"}
          </Button>

                          <Link href={`/admin/staking/pool/${selectedPool.id}/edit`}>
            <Button className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-200 dark:hover:bg-zinc-300">
              <Edit className="mr-2 h-4 w-4" />
              {t("edit_pool")}
            </Button>
          </Link>

          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="bg-red-500/90 hover:bg-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("Delete")}
          </Button>
        </div>
      </div>

      <PoolHeader pool={selectedPool} />

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
            {t("staking_positions")}
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-lg data-[state=active]:bg-background"
          >
            {t("Analytics")}
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
              {t("this_action_cannot_be_undone")}.{" "}
              {t("this_will_permanently_delete_the")} {selectedPool.name}
              {t("staking_pool_and_remove_all_associated_data")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePool}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteInProgress}
            >
              {deleteInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("Deleting")}.
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
