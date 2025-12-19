"use client";
import DataTable from "@/components/blocks/data-table";
import React, { useState } from "react";
import { Coins, Trash2, AlertCircle } from "lucide-react";
import { useColumns} from "./columns";
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
  const columns = useColumns();
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
          `Found ${stats.corruptedFound} corrupted orders out of ${stats.totalScanned} scanned`,
          {
            description: stats.corruptedFound > 0
              ? "Click 'Clean Up Orders' to remove them."
              : "No corrupted orders found."}
        );
      } else {
        toast.success(
          `Cleanup complete: Deleted ${stats.deleted} corrupted orders`,
          {
            description: `Scanned ${stats.totalScanned} orders and found ${stats.corruptedFound} corrupted.`}
        );
        setShowCleanupDialog(false);
        // Refresh the table
        window.location.reload();
      }
    } catch (error: any) {
      toast.error("Cleanup failed", {
        description: error.message || "An error occurred during cleanup"});
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
        Cleanup Corrupted Orders
      </Button>

      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Cleanup Corrupted Orders
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove orders with null essential fields (symbol, amount, price, side).
              These are ghost records created by database upsert behavior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-6">
            {cleanupStats && (
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div>
                  <strong>Total Scanned:</strong> {cleanupStats.totalScanned}
                </div>
                <div>
                  <strong>Corrupted Found:</strong>{" "}
                  <span className="text-warning font-semibold">
                    {cleanupStats.corruptedFound}
                  </span>
                </div>
                {cleanupStats.deleted > 0 && (
                  <div>
                    <strong>Deleted:</strong>{" "}
                    <span className="text-success font-semibold">
                      {cleanupStats.deleted}
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              First, run a scan to see how many corrupted orders exist. Then you can proceed with cleanup.
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
                {isCleaningUp ? "Scanning..." : "Scan First"}
              </Button>
            )}
            {cleanupStats && cleanupStats.corruptedFound > 0 && (
              <AlertDialogAction
                onClick={() => handleCleanupClick(false)}
                disabled={isCleaningUp}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isCleaningUp ? "Cleaning..." : "Clean Up Orders"}
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
      canDelete={true}
      canView={true}
      isParanoid={true}
      db="scylla"
      keyspace="ecosystem"
      title={t("ecosystem_orders")}
      description={t("view_and_manage_ecosystem_token_orders")}
      itemTitle="Ecosystem Order"
      columns={columns}
      analytics={analytics}
      extraTopButtons={extraTopButtons}
      design={{
        animation: "orbs",
        icon: Coins}}
    />
  );
}
