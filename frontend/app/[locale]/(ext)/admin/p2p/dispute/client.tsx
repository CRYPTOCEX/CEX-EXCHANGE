"use client";

import React from "react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { disputeAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

export default function AdminDisputesClient() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/p2p/dispute"
      model="p2pDispute"
      permissions={{
        access: "access.p2p.dispute",
        view: "view.p2p.dispute",
        create: "create.p2p.dispute",
        edit: "edit.p2p.dispute",
        delete: "delete.p2p.dispute",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      viewLink="/admin/p2p/dispute/[id]"
      title={t("p2p_dispute_management")}
      description={t("handle_and_resolve_p2p_trade_disputes")}
      itemTitle="Dispute"
      columns={columns}
      formConfig={formConfig}
      analytics={disputeAnalytics}
      isParanoid={true}
      design={{
        animation: "orbs",
        primaryColor: 'blue',
        secondaryColor: 'violet',
        icon: Shield,
      }}
    />
  );
}
