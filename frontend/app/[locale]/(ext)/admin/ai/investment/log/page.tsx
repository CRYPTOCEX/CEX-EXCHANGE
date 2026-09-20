"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AiInvestmentLogPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/log"
      model="aiInvestment"
      permissions={{
        access: "access.ai.investment",
        view: "view.ai.investment",
        create: "create.ai.investment",
        edit: "edit.ai.investment",
        delete: "delete.ai.investment",
      }}
      pageSize={12}
      canEdit
      editCondition={(row) => row.status === "ACTIVE"}
      canDelete
      canView
      isParanoid={true}
      title={t("ai_investment_logs")}
      description={t("monitor_and_track_all_ai_powered")}
      itemTitle="AI Investment"
      columns={columns}
      formConfig={formConfig}
      viewConfig={viewConfig}
      analytics={analytics}
      design={{
        icon: History,
      }}
    />
  );
}
