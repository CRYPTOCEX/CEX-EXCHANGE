"use client";
import React, { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { columns } from "./columns";

export default function BinaryMarketPage() {
  const t = useTranslations("dashboard");
  const [isImporting, setIsImporting] = useState(false);

  const handleImportMarkets = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/binary/market/import",
        method: "GET",
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success(
          data?.message ||
            `Imported ${data?.imported || 0} markets, skipped ${data?.skipped || 0} existing markets`
        );
        // Refresh the data table
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to import binary markets");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Import Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("binary_markets")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Manage binary trading markets imported from exchange spot markets"
            )}
          </p>
        </div>
        <Button
          onClick={handleImportMarkets}
          disabled={isImporting}
          className="flex items-center gap-2"
        >
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isImporting ? t("importing_untitled") : t("import_from_exchange")}
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        apiEndpoint="/api/admin/finance/binary/market"
        model="binaryMarket"
        permissions={{
          access: "access.binary.market",
          view: "view.binary.market",
          create: "create.binary.market",
          edit: "edit.binary.market",
          delete: "delete.binary.market",
        }}
        pageSize={10}
        canCreate
        canEdit
        canDelete
        canView
        isParanoid={false}
        title=""
        itemTitle="Market"
        columns={columns}
      />
    </div>
  );
}
