"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DepositMethodPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/deposit/method"
      model="depositMethod"
      permissions={{
        access: "access.deposit.method",
        view: "view.deposit.method",
        create: "create.deposit.method",
        edit: "edit.deposit.method",
        delete: "delete.deposit.method",
      }}
      pageSize={12}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      viewLink="/admin/finance/deposit/method/[id]"
      title={t("deposit_methods")}
      description={t("manage_deposit_methods_and_configurations")}
      itemTitle="Deposit Method"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: CreditCard,
      }}
    />
  );
}
