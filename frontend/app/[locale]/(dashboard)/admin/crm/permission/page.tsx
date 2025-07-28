"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function PermissionsPage() {
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
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={false}
      isParanoid={false}
      title="Permission Management"
      itemTitle="Permission"
      columns={columns}
    />
  );
}
