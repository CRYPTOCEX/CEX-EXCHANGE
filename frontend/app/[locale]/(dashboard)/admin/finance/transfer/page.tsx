"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "../deposit/log/columns";
import { useAnalytics } from "../transaction/analytics";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";

export default function TransferLogPage() {
  const t = useTranslations("dashboard_admin");
  const analytics = useAnalytics();
  const columns = useColumns();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/transfer"
      model="transaction"
      modelConfig={{
        type: "INCOMING_TRANSFER",
      }}
      permissions={{
        access: "access.transfer",
        view: "view.transfer",
        create: "create.transfer",
        edit: "edit.transfer",
        delete: "delete.transfer",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/finance/transfer/[id]"
      viewLink="/admin/finance/transfer/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      title={t("transfer_log_management")}
      itemTitle="Transfer Log"
      columns={columns}
      analytics={analytics}
                design={{
                  animation: "orbs",
                  icon: TrendingUp,
                }}
    />
  );
}
