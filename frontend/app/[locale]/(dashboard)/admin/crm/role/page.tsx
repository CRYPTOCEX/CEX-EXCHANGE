"use client";
import DataTable from "@/components/blocks/data-table";
import { UserCog } from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
export default function RolesPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/crm/role"
      model="role"
      permissions={{
        access: "access.role",
        view: "view.role",
        create: "create.role",
        edit: "edit.role",
        delete: "delete.role",
      }}
      pageSize={12}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      isParanoid={false}
      canView={true}
      title={t("role_management")}
      description={t("manage_user_roles_and_permission_assignments")}
      itemTitle="Role"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        icon: UserCog,
      }}
    />
  );
}
