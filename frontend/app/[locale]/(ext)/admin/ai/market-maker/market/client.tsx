"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";

export default function AiTradingMarketClient() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/market-maker/market"
      model="aiMarketMaker"
      permissions={{
        access: "access.ai.market_maker.market",
        view: "view.ai.market_maker.market",
        create: "create.ai.market_maker.market",
        edit: "edit.ai.market_maker.market",
        delete: "delete.ai.market_maker.market",
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
      title={t("ai_market_makers")}
      description={t("manage_ai_powered_market_making_configurations")}
      itemTitle="Market Maker"
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      design={{
        icon: BarChart3,
      }}
    />
  );
}
