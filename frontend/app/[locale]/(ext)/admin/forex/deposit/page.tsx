"use client";
import DataTable from "@/components/blocks/data-table";
import { ArrowDownCircle } from "lucide-react";
import { useAnalytics } from "../../../../(dashboard)/admin/finance/transaction/analytics";
import { useColumns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
import { useTranslations } from "next-intl";

export default function DepositLogPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/deposit"
      model="transaction"
      modelConfig={{
        type: "FOREX_DEPOSIT",
      }}
      permissions={{
        access: "access.forex.deposit",
        view: "view.forex.deposit",
        create: "create.forex.deposit",
        edit: "edit.forex.deposit",
        delete: "delete.forex.deposit",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/deposit/[id]"
      viewLink="/admin/forex/deposit/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      title={t("forex_deposit_management")}
      itemTitle="Forex Deposit"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: ArrowDownCircle,
      }}
    />
  );
}
