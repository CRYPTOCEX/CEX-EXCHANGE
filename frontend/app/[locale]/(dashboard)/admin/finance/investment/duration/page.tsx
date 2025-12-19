"use client";
import DataTable from "@/components/blocks/data-table";
import { Clock } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function InvestmentDurationPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/duration"
      model="investmentDuration"
      permissions={{
        access: "access.investment.duration",
        view: "view.investment.duration",
        create: "create.investment.duration",
        edit: "edit.investment.duration",
        delete: "delete.investment.duration",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("investment_duration_management")}
      description={t("manage_investment_plan_durations_and_timeframes")}
      itemTitle="Investment Duration"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: Clock,
      }}
    />
  );
}
