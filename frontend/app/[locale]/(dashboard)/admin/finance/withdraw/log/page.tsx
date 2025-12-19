"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "../../deposit/log/columns";
import { useAnalytics } from "../../transaction/analytics";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";

export default function WithdrawLogPage() {
  const t = useTranslations("dashboard_admin");
  const analytics = useAnalytics();
  const columns = useColumns();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/withdraw/log"
      model="transaction"
      modelConfig={{
        type: "WITHDRAW",
      }}
      permissions={{
        access: "access.withdraw",
        view: "view.withdraw",
        create: "create.withdraw",
        edit: "edit.withdraw",
        delete: "delete.withdraw",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/finance/withdraw/log/[id]"
      title={t("withdraw_log_management")}
      description={t("view_and_manage_user_withdrawal_requests")}
      itemTitle="Withdraw Log"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: TrendingUp,
      }}
    />
  );
}
