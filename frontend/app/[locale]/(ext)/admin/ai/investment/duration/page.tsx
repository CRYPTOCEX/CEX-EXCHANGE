"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AiInvestmentDurationPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/duration"
      model="aiInvestmentDuration"
      permissions={{
        access: "access.ai.investment.duration",
        view: "view.ai.investment.duration",
        create: "create.ai.investment.duration",
        edit: "edit.ai.investment.duration",
        delete: "delete.ai.investment.duration",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title="AI Investment Durations"
      description={t("manage_ai_powered_investment_duration_settings")}
      itemTitle="Duration"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "cyan",
        secondaryColor: "purple",
        icon: Clock,
      }}
    />
  );
}
