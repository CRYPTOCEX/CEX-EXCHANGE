"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, CheckCircle, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

export default function UpgradeHelperPage() {
  const t = useTranslations("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    updated: number;
  } | null>(null);
  const { toast } = useToast();

  const handleMigrateEcoTransactions = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const { data, error } = await $fetch({
        url: "/api/admin/system/upgrade/migrate-eco-transactions",
        method: "POST",
      });

      if (error) {
        toast({
          title: "Migration Failed",
          description: error,
          variant: "destructive",
        });
        setResult({
          success: false,
          message: error,
          updated: 0,
        });
        return;
      }

      toast({
        title: "Migration Completed",
        description: `Successfully updated ${data.updated} ECO transactions`,
        variant: "default",
      });

      setResult({
        success: true,
        message: `Successfully migrated ${data.updated} ECO transactions`,
        updated: data.updated,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Migration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setResult({
        success: false,
        message: errorMessage,
        updated: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("upgrade_helper")}
          </h1>
          <p className="text-muted-foreground">
            {t("system_upgrade_utilities_and_migration_tools")}
          </p>
        </div>
      </div>

      {/* Migration Tools Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t("data_migration_tools")}
          </CardTitle>
          <CardDescription>
            {t("tools_to_help_system_upgrades")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ECO Transaction Migration */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {t("eco_transaction_migration")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("migrate_eco_wallet_trxid_field")}.{" "}
                  {t("this_operation_will_not_null")}.
                </p>
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {t("this_operation_cannot_be_undone")}.{" "}
                    {t("please_ensure_you_have_a_database_backup")}.
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="ml-4">
                {t("eco_wallet")}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleMigrateEcoTransactions}
                disabled={isLoading}
                variant="default"
                className="min-w-[200px]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t("Migrating")}.
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    {t("migrate_eco_transactions")}
                  </>
                )}
              </Button>

              {result && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                    result.success
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>{result.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Placeholder for future migration tools */}
          <div className="border rounded-lg border-dashed p-4 text-center text-muted-foreground">
            <p className="text-sm">
              {t("additional_migration_tools_as_needed")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("important_information")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>{t("•_always_create_migration_tools")}</p>
            <p>{t("•_migration_operations_once_completed")}</p>
            <p>{t("•_monitor_system_data_migrations")}</p>
            <p>{t("•_some_operations_maintenance_mode")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
