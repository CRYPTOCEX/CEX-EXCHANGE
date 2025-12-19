"use client";
import DataTable from "@/components/blocks/data-table";
import { Clock } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function BinaryDurationPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/binary/duration"
      model="binaryDuration"
      permissions={{
        access: "access.binary.duration",
        view: "view.binary.duration",
        create: "create.binary.duration",
        edit: "edit.binary.duration",
        delete: "delete.binary.duration",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title={t("binary_durations")}
      description={t("manage_binary_trading_time_durations_and_intervals")}
      itemTitle="Duration"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: Clock,
      }}
    />
  );
}
