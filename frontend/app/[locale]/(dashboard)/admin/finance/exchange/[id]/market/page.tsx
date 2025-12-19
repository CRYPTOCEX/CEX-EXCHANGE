"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useColumns, useFormConfig } from "./columns";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export default function ExchangeMarketPage() {
  const t = useTranslations("dashboard_admin");
  const params = useParams();
  const [isImporting, setIsImporting] = useState(false);
  const columns = useColumns();
  const formConfig = useFormConfig();

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
    <div className={`space-y-6`}>
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
        pageSize={12}
        canCreate={false}
        canEdit={true}
        canDelete={true}
        canView={true}
        title={t("exchange_markets")}
        description={t("manage_exchange_market_pairs_and_trading_symbols")}
        itemTitle={t("exchange_market")}
        columns={columns}
        formConfig={formConfig}
        isParanoid={false}
        design={{
          animation: "orbs",
          icon: TrendingUp,
        }}
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
