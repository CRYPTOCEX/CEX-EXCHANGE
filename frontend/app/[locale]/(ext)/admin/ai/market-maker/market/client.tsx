"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";

export default function AiTradingMarketClient() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/market-maker/market"
      model="aiMarketMaker"
      permissions={{
        access: "access.ai.trading.market",
        view: "view.ai.trading.market",
        create: "create.ai.trading.market",
        edit: "edit.ai.trading.market",
        delete: "delete.ai.trading.market",
      }}
      pageSize={12}
      canCreate={true}
      createLink="/admin/ai/market-maker/market/create"
      canEdit={true}
      editLink="/admin/ai/market-maker/market/[id]?tab=config"
      canDelete={true}
      canView={true}
      viewLink="/admin/ai/market-maker/market/[id]"
      isParanoid={false}
      title="AI Market Makers"
      description={t("manage_ai_powered_market_making_configurations")}
      itemTitle="Market Maker"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "cyan",
        secondaryColor: "purple",
        icon: BarChart3,
      }}
    />
  );
}
