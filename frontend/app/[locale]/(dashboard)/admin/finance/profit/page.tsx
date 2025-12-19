"use client";
import DataTable from "@/components/blocks/data-table";
import { Wallet } from "lucide-react";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function AdminProfitPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/profit"
      model="adminProfit"
      permissions={{
        access: "access.profit",
        view: "view.profit",
        create: "create.profit",
        edit: "edit.profit",
        delete: "delete.profit"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete
      canView
      isParanoid={true}
      title={t("admin_profit_management")}
      description={t("manage_user_profits_and_earnings")}
      itemTitle="Profit"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Wallet}}
    />
  );
}
