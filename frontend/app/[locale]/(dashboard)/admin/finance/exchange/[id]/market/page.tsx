"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { columns } from "./columns";

export default function ExchangeMarketPage() {
  const t = useTranslations("dashboard");
  const params = useParams();
  const [isImporting, setIsImporting] = useState(false);

  const handleImportMarkets = async (refresh?: () => void) => {
    setIsImporting(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/market/import",
        method: "GET",
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success(data?.message || "Markets imported successfully!");
        // Refresh the data table
        if (refresh) {
          refresh();
        } else {
          window.location.reload();
        }
      }
    } catch (error) {
      toast.error("Failed to import markets");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Table */}
      <DataTable
        apiEndpoint="/api/admin/finance/exchange/market"
        model="exchangeMarket"
        permissions={{
          access: "access.exchange.market",
          view: "view.exchange.market",
          create: "create.exchange.market",
          edit: "edit.exchange.market",
          delete: "delete.exchange.market",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={true}
        canDelete={true}
        canView={true}
        title={t("exchange_markets")}
        itemTitle={t("exchange_market")}
        columns={columns}
        isParanoid={false}
        extraTopButtons={(refresh) => (
          <Button
            onClick={() => handleImportMarkets(refresh)}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isImporting ? t("importing_untitled") : t("import_markets")}
          </Button>
        )}
      />
    </div>
  );
}
