"use client";
import DataTable from "@/components/blocks/data-table";
import { Clock } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function ForexDurationPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/forex/duration"
      model="forexDuration"
      permissions={{
        access: "access.forex.duration",
        view: "view.forex.duration",
        create: "create.forex.duration",
        edit: "edit.forex.duration",
        delete: "delete.forex.duration",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("forex_plan_durations")}
      description={t("configure_and_manage_forex_investment_plan")}
      itemTitle="Duration"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: Clock,
      }}
    />
  );
}
