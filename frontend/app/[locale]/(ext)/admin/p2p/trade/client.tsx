// src/pages/admin/p2p/trades.tsx
"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { tradeAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Repeat } from "lucide-react";

export default function TradesPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

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
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      viewLink="/admin/p2p/trade/[id]"
      title={t("p2p_trade_management")}
      description={t("monitor_and_manage_active_and_completed_p2p_trades")}
      itemTitle="Trade"
      columns={columns}
      formConfig={formConfig}
      analytics={tradeAnalytics}
      isParanoid={true}
      design={{
        animation: "orbs",
        primaryColor: 'blue',
        secondaryColor: 'violet',
        icon: Repeat,
      }}
    />
  );
}
