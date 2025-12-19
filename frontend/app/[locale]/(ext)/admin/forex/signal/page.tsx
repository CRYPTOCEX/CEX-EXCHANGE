"use client";
import DataTable from "@/components/blocks/data-table";
import { Activity } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function ForexSignalPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/forex/signal"
      model="forexSignal"
      permissions={{
        access: "access.forex.signal",
        view: "view.forex.signal",
        create: "create.forex.signal",
        edit: "edit.forex.signal",
        delete: "delete.forex.signal",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("forex_trading_signals")}
      description={t("manage_and_distribute_forex_trading_signals")}
      itemTitle="Signal"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: Activity,
      }}
    />
  );
}
