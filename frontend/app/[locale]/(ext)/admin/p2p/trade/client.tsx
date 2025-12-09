// src/pages/admin/p2p/trades.tsx
"use client";

import DataTable from "@/components/blocks/data-table";
import { tradeColumns } from "./columns";
import { tradeAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function TradesPage() {
  const t = useTranslations("ext");
  return (
    <DataTable
      apiEndpoint="/api/admin/p2p/trade"
      model="p2pTrade"
      permissions={{
        access: "access.p2p.trade",
        view: "view.p2p.trade",
        create: "create.p2p.trade",
        edit: "edit.p2p.trade",
        delete: "delete.p2p.trade",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      viewLink="/admin/p2p/trade/[id]"
      title={t("p2p_trades")}
      itemTitle="Trade"
      columns={tradeColumns}
      analytics={tradeAnalytics}
      isParanoid={true}
    />
  );
}
