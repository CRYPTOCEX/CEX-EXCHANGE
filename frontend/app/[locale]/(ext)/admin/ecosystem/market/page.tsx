"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemMarketPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/market"
      model="ecosystemMarket"
      permissions={{
        access: "access.ecosystem.market",
        view: "view.ecosystem.market",
        create: "create.ecosystem.market",
        edit: "edit.ecosystem.market",
        delete: "delete.ecosystem.market",
      }}
      pageSize={12}
      canCreate
      createLink="/admin/ecosystem/market/create"
      canEdit
      editLink="/admin/ecosystem/market/[id]"
      canDelete
      canView
      isParanoid={false}
      title="Markets"
      description={t("configure_trading_market_pairs")}
      itemTitle="Market"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "cyan",
        icon: TrendingUp,
      }}
    />
  );
}
