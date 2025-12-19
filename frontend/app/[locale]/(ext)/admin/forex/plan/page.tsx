"use client";
import DataTable from "@/components/blocks/data-table";
import { Briefcase } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function ForexPlanPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/forex/plan"
      model="forexPlan"
      permissions={{
        access: "access.forex.plan",
        view: "view.forex.plan",
        create: "create.forex.plan",
        edit: "edit.forex.plan",
        delete: "delete.forex.plan",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("forex_investment_plans")}
      description={t("configure_and_manage_forex_investment_plan_1")}
      itemTitle="Forex Plan"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: Briefcase,
      }}
    />
  );
}
