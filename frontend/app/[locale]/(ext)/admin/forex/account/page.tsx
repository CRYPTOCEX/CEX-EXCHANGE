"use client";
import DataTable from "@/components/blocks/data-table";
import { Users } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function ForexAccountPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/forex/account"
      model="forexAccount"
      permissions={{
        access: "access.forex.account",
        view: "view.forex.account",
        create: "create.forex.account",
        edit: "edit.forex.account",
        delete: "delete.forex.account",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("forex_trading_accounts")}
      description={t("manage_and_monitor_all_forex_trading")}
      itemTitle="Forex Account"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "emerald",
        secondaryColor: "teal",
        icon: Users,
      }}
    />
  );
}
