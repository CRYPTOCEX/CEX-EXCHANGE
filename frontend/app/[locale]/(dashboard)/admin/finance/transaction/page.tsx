"use client";
import DataTable from "@/components/blocks/data-table";
import { Wallet } from "lucide-react";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function TransactionPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/transaction"
      model="transaction"
      permissions={{
        access: "access.transaction",
        view: "view.transaction",
        create: "create.transaction",
        edit: "edit.transaction",
        delete: "delete.transaction",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("transaction_management")}
      description={t("view_all_financial_transactions_and_transfers")}
      itemTitle="Transaction"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Wallet,
      }}
    />
  );
}
