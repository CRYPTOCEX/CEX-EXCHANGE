"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function RolesPage() {
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
      pageSize={10}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      isParanoid={false}
      canView={true}
      title="Role Management"
      itemTitle="Role"
      columns={columns}
    />
  );
}
