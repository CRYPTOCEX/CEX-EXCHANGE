"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AiInvestmentPlanPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/plan"
      model="aiInvestmentPlan"
      permissions={{
        access: "access.ai.investment.plan",
        view: "view.ai.investment.plan",
        create: "create.ai.investment.plan",
        edit: "edit.ai.investment.plan",
        delete: "delete.ai.investment.plan",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title="AI Investment Plans"
      description={t("create_and_manage_ai_driven_investment")}
      itemTitle="AI Plan"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "cyan",
        secondaryColor: "purple",
        icon: Brain,
      }}
    />
  );
}
