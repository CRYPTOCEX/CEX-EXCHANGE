"use client";
import React from "react";
import DataTable from "@/components/blocks/data-table";
import { ImportPreviewDialog } from "@/components/blocks/import-preview-dialog";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useColumns, useFormConfig, useViewConfig } from "./columns";

export default function ExchangeMarketPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();

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
        viewConfig={viewConfig}
        isParanoid={false}
        design={{
          icon: TrendingUp,
        }}
        extraTopButtons={(refresh) => (
          <ImportPreviewDialog
            endpoint="/api/admin/finance/exchange/market/import"
            label={t("import_markets")}
            noun="market"
            onImported={() => (refresh ? refresh() : window.location.reload())}
          />
        )}
      />
    </div>
  );
}
