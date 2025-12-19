"use client";
import DataTable from "@/components/blocks/data-table";
import { TrendingUp } from "lucide-react";
import { useColumns } from "./columns";
import { useTranslations } from "next-intl";

export default function FuturesMarketPage() {
  const t = useTranslations("ext_admin");
  const futuresMarketColumns = useColumns();
  return (
    <DataTable
      apiEndpoint="/api/admin/futures/market"
      model="futuresMarket"
      permissions={{
        access: "access.futures.market",
        view: "view.futures.market",
        create: "create.futures.market",
        edit: "edit.futures.market",
        delete: "delete.futures.market",
      }}
      pageSize={12}
      canCreate
      createLink="/admin/futures/market/create"
      canEdit
      editLink="/admin/futures/market/[id]"
      canView
      isParanoid={true}
      title={t("futures_markets")}
      description={t("manage_futures_trading_markets_and_configure")}
      itemTitle="Market"
      columns={futuresMarketColumns}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "red",
        icon: TrendingUp,
      }}
    />
  );
}
