"use client";
import DataTable from "@/components/blocks/data-table";
import { CreditCard } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function WithdrawMethodPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/withdraw/method"
      model="withdrawMethod"
      permissions={{
        access: "access.withdraw.method",
        view: "view.withdraw.method",
        create: "create.withdraw.method",
        edit: "edit.withdraw.method",
        delete: "delete.withdraw.method",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title={t("withdraw_methods")}
      description={t("manage_withdrawal_methods_and_settings")}
      itemTitle="Withdraw Method"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: CreditCard,
      }}
    />
  );
}
