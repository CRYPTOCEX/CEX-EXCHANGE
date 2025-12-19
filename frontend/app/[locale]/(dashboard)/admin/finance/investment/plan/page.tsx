"use client";
import DataTable from "@/components/blocks/data-table";
import { PiggyBank } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function InvestmentPlanPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/plan"
      model="investmentPlan"
      permissions={{
        access: "access.investment.plan",
        view: "view.investment.plan",
        create: "create.investment.plan",
        edit: "edit.investment.plan",
        delete: "delete.investment.plan",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("investment_plan_management")}
      description={t("manage_investment_plans_and_packages")}
      itemTitle="Investment Plan"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: PiggyBank,
      }}
    />
  );
}
