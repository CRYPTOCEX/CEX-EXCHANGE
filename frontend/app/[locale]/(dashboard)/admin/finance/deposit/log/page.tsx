"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "../../transaction/analytics";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";

export default function DepositLogPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/deposit/log"
      model="transaction"
      modelConfig={{
        type: "DEPOSIT",
      }}
      permissions={{
        access: "access.deposit",
        view: "view.deposit",
        create: "create.deposit",
        edit: "edit.deposit",
        delete: "delete.deposit",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/finance/deposit/log/[id]"
      title={t("deposit_log_management")}
      description={t("view_deposit_transaction_history_and_logs")}
      itemTitle="Deposit Log"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Wallet,
      }}
    />
  );
}
