"use client";
import DataTable from "@/components/blocks/data-table";
import { Shield } from "lucide-react";
import { useColumns } from "./columns";
import { useTranslations } from "next-intl";
export default function PermissionsPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  return (
    <DataTable
      apiEndpoint="/api/admin/crm/permission"
      model="permission"
      permissions={{
        access: "access.permission",
        view: "view.permission",
        create: "create.permission",
        edit: "edit.permission",
        delete: "delete.permission",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={false}
      isParanoid={false}
      title={t("permission_management")}
      description={t("manage_system_permissions_and_access_control")}
      itemTitle="Permission"
      columns={columns}
      design={{
        animation: "orbs",
        icon: Shield,
      }}
    />
  );
}
