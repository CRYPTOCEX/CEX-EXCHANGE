"use client";
import DataTable from "@/components/blocks/data-table";
import { ArrowUpCircle } from "lucide-react";
import { useColumns } from "../../../../(dashboard)/admin/finance/deposit/log/columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function DepositLogPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/withdraw"
      model="transaction"
      modelConfig={{
        type: "FOREX_WITHDRAW",
      }}
      permissions={{
        access: "access.forex.withdraw",
        view: "view.forex.withdraw",
        create: "create.forex.withdraw",
        edit: "edit.forex.withdraw",
        delete: "delete.forex.withdraw",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/forex/withdraw/[id]"
      viewLink="/admin/forex/withdraw/[id]"
      editCondition={(item) => item.status === "PENDING"}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("forex_withdraw_management")}
      itemTitle="Forex Withdraw"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: ArrowUpCircle,
      }}
    />
  );
}
