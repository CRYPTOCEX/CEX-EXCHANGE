"use client";
import DataTable from "@/components/blocks/data-table";
import { KeyRound } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function ApiKeyPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/api"
      model="apiKey"
      permissions={{
        access: "access.api.key",
        view: "view.api.key",
        create: "create.api.key",
        edit: "edit.api.key",
        delete: "delete.api.key",
      }}
      pageSize={12}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="API Key Management"
      description={t("manage_api_keys_for_external_integrations")}
      itemTitle="API Key"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: KeyRound,
      }}
    />
  );
}
