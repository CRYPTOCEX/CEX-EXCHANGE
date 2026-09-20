"use client";
import DataTable from "@/components/blocks/data-table";
import React, { useState } from "react";
import { Coins, Trash2, AlertCircle } from "lucide-react";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import { $fetch } from "@/lib/api";

export default function EcosystemOrdersPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<{
    totalScanned: number;
    corruptedFound: number;
    deleted: number;
  } | null>(null);

  const handleCleanupClick = async (dryRun: boolean) => {
    setIsCleaningUp(true);
    try {
      const response = await $fetch({
        url: "/api/admin/ecosystem/order/cleanup",
        method: "POST",
        body: {
          dryRun,
          limit: 10000},
        silent: true});

      console.log("Cleanup response:", response);

      const data = response.data || response;
      const stats = {
        totalScanned: data.totalScanned ?? 0,
        corruptedFound: data.corruptedFound ?? 0,
        deleted: data.deleted ?? 0};

      setCleanupStats(stats);

      if (dryRun) {
        toast.info(
          t("found_corrupted_orders_out_of_scanned", { corruptedFound: String(stats.corruptedFound), totalScanned: String(stats.totalScanned) }),
          {
            description: stats.corruptedFound > 0
              ? t("click_clean_up_orders_to_remove_them")
              : t("no_corrupted_orders_found")}
        );
      } else {
        toast.success(
          t("cleanup_complete_deleted_corrupted_orders", { deleted: String(stats.deleted) }),
          {
            description: t("scanned_orders_and_found_corrupted", { totalScanned: String(stats.totalScanned), corruptedFound: String(stats.corruptedFound) })}
        );
        setShowCleanupDialog(false);
        // Refresh the table
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(t("cleanup_failed"), {
        description: error.message || t("an_error_occurred_during_cleanup")});
    } finally {
      setIsCleaningUp(false);
    }
  };

  const extraTopButtons = (refresh?: () => void) => (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowCleanupDialog(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        {t("cleanup_corrupted_orders")}
      </Button>

      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              {t("cleanup_corrupted_orders")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("this_will_remove_orders_with_null")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-6">
            {cleanupStats && (
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div>
                  <strong>{t("total_scanned")}:</strong> {cleanupStats.totalScanned}
                </div>
                <div>
                  <strong>{t("corrupted_found")}:</strong>{" "}
                  <span className="text-warning font-semibold">
                    {cleanupStats.corruptedFound}
                  </span>
                </div>
                {cleanupStats.deleted > 0 && (
                  <div>
                    <strong>{tCommon("deleted")}:</strong>{" "}
                    <span className="text-success font-semibold">
                      {cleanupStats.deleted}
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("first_run_a_scan_to_see")}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!cleanupStats && (
              <Button
                onClick={() => handleCleanupClick(true)}
                disabled={isCleaningUp}
                variant="outline"
              >
                {isCleaningUp ? `${t("scanning")}…` : t("scan_first")}
              </Button>
            )}
            {cleanupStats && cleanupStats.corruptedFound > 0 && (
              <AlertDialogAction
                onClick={() => handleCleanupClick(false)}
                disabled={isCleaningUp}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isCleaningUp ? `${t("cleaning")}…` : t("clean_up_orders")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/order"
      model="orders"
      permissions={{
        access: "access.ecosystem.order",
        view: "view.ecosystem.order",
        create: "create.ecosystem.order",
        edit: "edit.ecosystem.order",
        delete: "delete.ecosystem.order"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      db="scylla"
      keyspace="ecosystem"
      title={t("ecosystem_orders")}
      description={t("view_and_manage_ecosystem_token_orders")}
      itemTitle="Ecosystem Order"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      extraTopButtons={extraTopButtons}
      design={{
        icon: Coins}}
    />
  );
}
