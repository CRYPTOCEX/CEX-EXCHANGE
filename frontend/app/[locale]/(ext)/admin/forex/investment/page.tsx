"use client";
import DataTable from "@/components/blocks/data-table";
import { TrendingUp } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function ForexInvestmentPage() {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/forex/investment"
      model="forexInvestment"
      permissions={{
        access: "access.forex.investment",
        view: "view.forex.investment",
        create: "create.forex.investment",
        edit: "edit.forex.investment",
        delete: "delete.forex.investment",
      }}
      pageSize={12}
      canEdit
      canDelete
      canView
      title={t("forex_investments")}
      description={tExtAdmin("monitor_and_manage_all_active_forex")}
      itemTitle="Investment"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: TrendingUp,
      }}
    />
  );
}
