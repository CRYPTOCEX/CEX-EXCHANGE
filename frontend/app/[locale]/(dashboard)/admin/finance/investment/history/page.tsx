"use client";
import DataTable from "@/components/blocks/data-table";
import { Wallet } from "lucide-react";
import { useColumns} from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function InvestmentHistoryPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/history"
      model="investment"
      permissions={{
        access: "access.investment.history",
        view: "view.investment.history",
        create: "create.investment.history",
        edit: "edit.investment.history",
        delete: "delete.investment.history"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("investment_history")}
      description={t("view_investment_transaction_history")}
      itemTitle="Investment History"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Wallet}}
    />
  );
}
