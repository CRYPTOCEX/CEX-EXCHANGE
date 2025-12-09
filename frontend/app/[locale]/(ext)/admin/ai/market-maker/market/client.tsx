"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { useTranslations } from "next-intl";

export default function AiTradingMarketClient() {
  const t = useTranslations("ext");
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      pageSize={10}
      canCreate={true}
      createLink="/admin/ai/market-maker/market/create"
      canEdit={true}
      editLink="/admin/ai/market-maker/market/[id]?tab=config"
      canDelete={true}
      canView={true}
      viewLink="/admin/ai/market-maker/market/[id]"
      isParanoid={false}
      title="AI Market Makers"
      itemTitle="Market Maker"
      description={t("manage_ai_powered_market_makers_for")}
      columns={columns}
    />
    </div>
  );
}
