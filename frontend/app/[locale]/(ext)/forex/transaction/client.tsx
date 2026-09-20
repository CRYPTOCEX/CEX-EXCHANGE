"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ForexTransactionsClient() {
  const t = useTranslations("ext_forex");
  const { user } = useUserStore();
  const columns = useColumns();
  const analytics = useAnalytics();
  // Replaces the old hand-rolled `viewContent` panel: same content (amount,
  // fee, wallet, gateway metadata, status advice) expressed as a stat strip,
  // sections and a render block, so the dialog can size itself and the fields
  // keep the table's own renderers.
  const viewConfig = useViewConfig();

  // Premium header handles full page layout, so we just render the DataTable
  return (
    <DataTable
      apiEndpoint="/api/forex/transaction"
      model="transaction"
      modelConfig={{
        userId: user?.id,
        // The KPI strip aggregates through /api/user/analysis using this
        // config, and without the type scope it counted EVERY transaction the
        // user has ever made. The table underneath lists forex movements only,
        // so a user with 3 forex transactions and 40 spot trades saw a
        // headline of "43" above a table of 3.
        type: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"],
      }}
      userAnalytics={true}
      pageSize={12}
      canView={true}
      isParanoid={false}
      title={t("forex_transaction_history")}
      description={t("view_and_manage_all_your_forex_1")}
      itemTitle="Transaction"
      columns={columns}
      analytics={analytics}
      viewConfig={viewConfig}
      design={{
        badge: "Transaction History",
        icon: Receipt,
        detailsAlignment: "bottom",
      }}
    />
  );
}
