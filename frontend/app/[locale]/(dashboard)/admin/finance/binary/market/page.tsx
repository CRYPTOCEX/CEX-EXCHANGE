"use client";
import React, { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useColumns, useFormConfig } from "./columns";
import { useTableStore } from "@/components/blocks/data-table/store";

export default function BinaryMarketPage() {
  const columns = useColumns();
  const formConfig = useFormConfig();
  const t = useTranslations("dashboard_admin");
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
        // Refresh the table data via the store
        useTableStore.getState().fetchData();
      }
    } catch (error) {
      toast.error("Failed to import binary markets");
    } finally {
      setIsImporting(false);
    }
  };

  return (
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
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title={t("binary_markets")}
      description={t("binary_markets_description")}
      itemTitle="Market"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: TrendingUp,
      }}
      extraTopButtons={() => (
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
      )}
    />
  );
}
